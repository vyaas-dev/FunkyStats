"use server";

/* eslint-disable */
import { getEventTeams, seedEventTeamsCache } from "./fsm";
import { normalizeStateProv } from "./stateAbbreviations";
import {
  cacheGet,
  cacheGetMany,
  cachePut,
  computedEventTeamsKey,
  computedGeneralStatsKey,
  computedGlobalStatsKey,
  fetchTbaCached,
} from "./cacheBackend";
import type { TeamData } from "./fsm/types";

const generalStatsCache = new Map<
  string,
  {
    data: {
      stats: { [key: string]: string };
      components: {
        [key: string]: {
          auto: string;
          fuel: string;
          climb: string;
          coral: string;
          algae: string;
        };
      };
    };
    timestamp: number;
  }
>();

const globalStatsCache = new Map<
  string,
  {
    data: Array<{
      teamKey: string;
      bestFSM: string;
      country: string;
      state_prov: string;
    }>;
    timestamp: number;
  }
>();

const GLOBAL_CACHE_TTL_MS = 60 * 60 * 1000;

export async function getEvents(year: number = 2025) {
  const events =
    (await fetchTbaCached<any[]>(`events/${year}/simple`)) ??
    (await (async () => {
      const res = await fetch(
        `https://www.thebluealliance.com/api/v3/events/${year}/simple`,
        {
          headers: {
            "X-TBA-Auth-Key": process.env.TBA_API_KEY!,
          },
          next: { revalidate: 0 },
        }
      );
      if (!res.ok) throw new Error("Failed to fetch events");
      return res.json();
    })());
  const events_map: { key: string; value: string }[] = [];
  events.forEach((event: any) => {
    if (event.key && event.name) {
      events_map.push({ key: event.key, value: event.key + ": " + event.name });
    }
  });
  return events_map;
}

export async function getTeams(year: number = 2025) {
  const pages = await Promise.all(
    Array.from({ length: 22 }, async (_, i) => {
      const cached = await fetchTbaCached<any[]>(`teams/${year}/${i}/simple`);
      if (cached) return cached;

      const res = await fetch(
        `https://www.thebluealliance.com/api/v3/teams/${year}/${i}/simple`,
        {
          headers: {
            "X-TBA-Auth-Key": process.env.TBA_API_KEY!,
          },
          next: { revalidate: 604800 },
        }
      );

      if (!res.ok) {
        throw new Error("Failed to fetch teams");
      }

      return res.json();
    })
  );

  const teams_map: { key: string; value: string }[] = [];
  for (const teams of pages) {
    for (const team of teams) {
      if (team.key && team.nickname) {
        const key = team.key.replace("frc", "");
        teams_map.push({
          key,
          value: key + ": " + team.nickname,
        });
      }
    }
  }

  return teams_map;
}

async function getFilteredEventKeys(
  year: number = 2025,
  includeOffseason: boolean = true
): Promise<string[]> {
  const allEvents =
    (await fetchTbaCached<any[]>(`events/${year}/simple`)) ??
    (await (async () => {
      const res = await fetch(
        `https://www.thebluealliance.com/api/v3/events/${year}/simple`,
        {
          headers: {
            "X-TBA-Auth-Key": process.env.TBA_API_KEY!,
          },
          next: { revalidate: 3600 },
        }
      );
      if (!res.ok) {
        throw new Error(`Failed to fetch events for year ${year}`);
      }
      return res.json();
    })());

  const today = new Date();
  const allowedTypes = new Set([0, 1, 2, 3, 4]);
  if (includeOffseason) {
    allowedTypes.add(99);
  }

  const filtered = allEvents.filter((event: any) => {
    const eventStart = new Date(event.start_date);
    return eventStart < today && allowedTypes.has(event.event_type);
  });

  return filtered.map((event: any) => event.key);
}

interface TeamEventEntry {
  fsm: number;
  auto: number;
  fuel: number;
  climb: number;
  coral: number;
  algae: number;
}

async function getGeneralStats(
  year: number = 2025,
  includeOffseason: boolean = true
) {
  const cacheKey = `${year}:${includeOffseason ? 1 : 0}`;
  const cached = generalStatsCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < GLOBAL_CACHE_TTL_MS) {
    return cached.data;
  }

  const persistent = await cacheGet<{
    stats: { [key: string]: string };
    components: {
      [key: string]: {
        auto: string;
        fuel: string;
        climb: string;
        coral: string;
        algae: string;
      };
    };
  }>(computedGeneralStatsKey(year, includeOffseason), { allowStale: true });
  if (persistent?.data) {
    generalStatsCache.set(cacheKey, {
      data: persistent.data,
      timestamp: Date.now(),
    });
    return persistent.data;
  }

  const events = await getFilteredEventKeys(year, includeOffseason);
  const stats: { [key: string]: TeamEventEntry[] } = {};

  // Bulk-load cached event rows in one request instead of ~N individual GETs.
  const cacheKeys = events.map((event) => computedEventTeamsKey(event));
  const bulkEntries = await cacheGetMany<TeamData[]>(cacheKeys, {
    allowStale: true,
  });
  const seeded: Record<string, TeamData[]> = {};
  for (const event of events) {
    const key = computedEventTeamsKey(event);
    const entry = bulkEntries[key];
    if (entry?.data?.length) {
      seeded[event] = entry.data;
    }
  }
  seedEventTeamsCache(seeded);

  const missingEvents = events.filter((event) => !seeded[event]);
  const eventsToProcess = missingEvents.length > 0 ? missingEvents : events;

  if (
    process.env.NODE_ENV !== "production" &&
    missingEvents.length < events.length
  ) {
    console.log(
      `Global stats: ${events.length - missingEvents.length}/${events.length} events from cache bulk load`
    );
  }

  const batchSize = 25;
  for (let i = 0; i < eventsToProcess.length; i += batchSize) {
    const batch = eventsToProcess.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(
      batch.map((event) => getEventTeams(event))
    );

    batchResults.forEach((result, idx) => {
      if (result.status === "fulfilled") {
        for (const team of result.value) {
          if (!stats[team.key]) {
            stats[team.key] = [];
          }
          stats[team.key].push({
            fsm: Number(team.fsm ?? 0),
            auto: Number(team.auto ?? 0),
            fuel: Number(team.fuel ?? 0),
            climb: Number(team.climb ?? 0),
            coral: Number(team.coral ?? 0),
            algae: Number(team.algae ?? 0),
          });
        }
      } else {
        console.error(
          `Error fetching stats for event ${batch[idx]}:`,
          result.reason
        );
      }
    });
  }

  // Merge teams from bulk-cached events we skipped recomputing.
  for (const event of events) {
    if (eventsToProcess.includes(event)) continue;
    const teams = seeded[event];
    if (!teams) continue;
    for (const team of teams) {
      if (!stats[team.key]) {
        stats[team.key] = [];
      }
      stats[team.key].push({
        fsm: Number(team.fsm ?? 0),
        auto: Number(team.auto ?? 0),
        fuel: Number(team.fuel ?? 0),
        climb: Number(team.climb ?? 0),
        coral: Number(team.coral ?? 0),
        algae: Number(team.algae ?? 0),
      });
    }
  }

  const statsFinal: { [key: string]: string } = {};
  const componentsFinal: {
    [key: string]: {
      auto: string;
      fuel: string;
      climb: string;
      coral: string;
      algae: string;
    };
  } = {};

  for (const team of Object.keys(stats)) {
    const played = stats[team]
      .filter((e) => Number.isFinite(e.fsm) && e.fsm > 0)
      .sort((a, b) => b.fsm - a.fsm);

    const best = played[0];
    if (!best) {
      statsFinal[team] = "0.00";
      componentsFinal[team] = {
        auto: "0.00",
        fuel: "0.00",
        climb: "0.00",
        coral: "0.00",
        algae: "0.00",
      };
      continue;
    }

    if (played.length === 1) {
      statsFinal[team] = best.fsm.toFixed(2);
    } else {
      const rms = Math.sqrt((played[0].fsm ** 2 + played[1].fsm ** 2) / 2);
      statsFinal[team] = rms.toFixed(2);
    }

    componentsFinal[team] = {
      auto: best.auto.toFixed(2),
      fuel: best.fuel.toFixed(2),
      climb: best.climb.toFixed(2),
      coral: best.coral.toFixed(2),
      algae: best.algae.toFixed(2),
    };
  }

  const data = { stats: statsFinal, components: componentsFinal };
  generalStatsCache.set(cacheKey, { data, timestamp: Date.now() });
  await cachePut(computedGeneralStatsKey(year, includeOffseason), data);
  return data;
}

async function getTeamLocation(teamKey: string) {
  try {
    const res = await fetch(
      `https://www.thebluealliance.com/api/v3/team/${teamKey}`,
      {
        headers: {
          "X-TBA-Auth-Key": process.env.TBA_API_KEY!,
        },
        next: { revalidate: 604800 },
      }
    );

    if (!res.ok) {
      return { country: "", state_prov: "" };
    }

    const teamInfo = await res.json();
    return {
      country: teamInfo.country || "",
      state_prov: normalizeStateProv(teamInfo.state_prov || ""),
    };
  } catch {
    return { country: "", state_prov: "" };
  }
}

export async function getGlobalStatsWithoutLocation(
  year: number = 2025,
  includeOffseason: boolean = true
): Promise<
  Array<{
    teamKey: string;
    bestFSM: string;
    auto: string;
    fuel: string;
    climb: string;
    coral: string;
    algae: string;
  }>
> {
  const pstats = await getGeneralStats(year, includeOffseason);
  const { stats, components } = pstats;

  return Object.entries(stats)
    .sort(([, a], [, b]) => Number(b) - Number(a))
    .map(([teamKey, bestFSM]) => ({
      teamKey,
      bestFSM,
      auto: components[teamKey]?.auto ?? "0",
      fuel: components[teamKey]?.fuel ?? "0",
      climb: components[teamKey]?.climb ?? "0",
      coral: components[teamKey]?.coral ?? "0",
      algae: components[teamKey]?.algae ?? "0",
    }));
}

export async function getGlobalStats(
  year: number = 2025,
  includeOffseason: boolean = true
) {
  const cacheKey = `${year}:${includeOffseason ? 1 : 0}`;
  const cached = globalStatsCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < GLOBAL_CACHE_TTL_MS) {
    return cached.data;
  }

  const persistent = await cacheGet<
    Array<{
      teamKey: string;
      bestFSM: string;
      country: string;
      state_prov: string;
    }>
  >(computedGlobalStatsKey(year, includeOffseason));
  if (persistent?.data?.length) {
    globalStatsCache.set(cacheKey, {
      data: persistent.data,
      timestamp: Date.now(),
    });
    return persistent.data;
  }

  const pstats = await getGeneralStats(year, includeOffseason);
  const sortedGlobalStats = Object.entries(pstats.stats)
    .sort(([, a], [, b]) => Number(b) - Number(a))
    .map(([teamKey, bestFSM]) => ({
      teamKey,
      bestFSM,
    }));

  const batchSize = 100;
  const statsWithLocation: {
    teamKey: string;
    bestFSM: string;
    country: string;
    state_prov: string;
  }[] = [];

  for (let i = 0; i < sortedGlobalStats.length; i += batchSize) {
    const batch = sortedGlobalStats.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(
      batch.map((stat) => getTeamLocation(stat.teamKey))
    );

    batch.forEach((stat, idx) => {
      const locationResult = batchResults[idx];
      const location =
        locationResult.status === "fulfilled"
          ? locationResult.value
          : { country: "", state_prov: "" };

      statsWithLocation.push({
        teamKey: stat.teamKey,
        bestFSM: stat.bestFSM,
        country: location.country,
        state_prov: location.state_prov,
      });
    });
  }

  globalStatsCache.set(cacheKey, {
    data: statsWithLocation,
    timestamp: Date.now(),
  });
  void cachePut(computedGlobalStatsKey(year, includeOffseason), statsWithLocation);
  return statsWithLocation;
}
