import { isEventLikelyRecent } from "../eventUtils";
import {
  cacheGet,
  cachePut,
  computedEventTeamsKey,
} from "../cacheBackend";
import {
  calculateFSM,
  computeClimbRms,
  elimAdjustFSM,
  getMatchPredictionsForConfig,
} from "./calc";
import {
  fetchAllMatches,
  getAttendingTeams,
  getEventQualMatches,
  getEventRankings,
} from "./tba";
import type { Match, TeamData, YearFsmConfig } from "./types";
import { year2025 } from "./years/2025";
import { year2026 } from "./years/2026";

const YEAR_CONFIGS: Record<number, YearFsmConfig> = {
  2025: year2025,
  2026: year2026,
};

export function resolveYearConfig(eventCode: string): YearFsmConfig {
  const year = Number(eventCode.slice(0, 4));
  const config = YEAR_CONFIGS[year];
  if (!config) {
    if (year < 2025) return year2025;
    throw new Error(`No FSM year config for event: ${eventCode}`);
  }
  return config;
}

const eventTeamsCache = new Map<
  string,
  { data: TeamData[]; timestamp: number; ttl: number }
>();

const inflight = new Map<string, Promise<TeamData[]>>();

function buildTeamRow(
  config: YearFsmConfig,
  key: string,
  rank: number,
  fsm: number,
  attrs: { [attrKey: string]: { [teamKey: string]: number } },
  climb: { [teamKey: string]: number }
): TeamData {
  const row: TeamData = {
    key,
    rank,
    fsm: fsm.toFixed(2),
  };
  for (const attr of config.attributes) {
    row[attr.key] = (attrs[attr.key]?.[key] || 0).toFixed(2);
  }
  if (config.climb) {
    row[config.climb.key] = (climb[key] || 0).toFixed(2);
  }
  return row;
}

async function computeEventTeams(
  eventCode: string,
  config: YearFsmConfig
): Promise<TeamData[]> {
  const TEAMDATA: { [key: string]: TeamData } = {};

  const [allMatches, attendingTeams, rankingsResult] = await Promise.all([
    fetchAllMatches(eventCode),
    getAttendingTeams(eventCode),
    getEventRankings(eventCode),
  ]);

  const matches = allMatches.filter((m) => m.comp_level === "qm");
  const elimMatches = allMatches.filter((m) => m.comp_level !== "qm");
  const rankings = rankingsResult?.rankings ?? [];

  if (matches.length === 0) {
    for (const team of attendingTeams) {
      const row = config.emptyTeam(team.key);
      if (team.nickname) row.nickname = team.nickname;
      TEAMDATA[team.key] = row;
    }
    return Object.values(TEAMDATA);
  }

  const { FSMs: fsms, attrs } = calculateFSM(matches, config);
  elimAdjustFSM(elimMatches, fsms, config.interaction);

  const climb = config.climb
    ? computeClimbRms(matches, config.climb)
    : ({} as { [key: string]: number });

  config.postProcess?.({ matches, fsms, attrs, climb });

  for (let i = 0; i < rankings.length; i++) {
    const teamset = rankings[i];
    const team = teamset.team_key;
    TEAMDATA[team] = buildTeamRow(
      config,
      team,
      teamset.rank,
      fsms[team] || 0,
      attrs,
      climb
    );
  }

  for (const team of attendingTeams) {
    if (!TEAMDATA[team.key]) {
      TEAMDATA[team.key] = buildTeamRow(
        config,
        team.key,
        rankings.length + 1,
        fsms[team.key] || 0,
        attrs,
        climb
      );
    }
    if (team.nickname) {
      TEAMDATA[team.key].nickname = team.nickname;
    }
  }

  return Object.values(TEAMDATA).sort(
    (a, b) => a.rank - b.rank || String(b.fsm).localeCompare(String(a.fsm))
  );
}

export async function getEventTeams(
  eventCode: string,
  forceRecalc: boolean = false
): Promise<TeamData[]> {
  const config = resolveYearConfig(eventCode);

  if (!forceRecalc) {
    const cached = eventTeamsCache.get(eventCode);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }

    const persistent = await cacheGet<TeamData[]>(
      computedEventTeamsKey(eventCode)
    );
    if (persistent?.data?.length) {
      eventTeamsCache.set(eventCode, {
        data: persistent.data,
        timestamp: Date.now(),
        ttl: isEventLikelyRecent(eventCode)
          ? 2 * 60 * 1000
          : 24 * 60 * 60 * 1000,
      });
      return persistent.data;
    }

    const pending = inflight.get(eventCode);
    if (pending) return pending;
  }

  const promise = (async () => {
    const sortedData = await computeEventTeams(eventCode, config);
    // Heuristic TTL — don't wait on another TBA event fetch after compute.
    const ttl = isEventLikelyRecent(eventCode)
      ? 2 * 60 * 1000
      : 24 * 60 * 60 * 1000;
    eventTeamsCache.set(eventCode, {
      data: sortedData,
      timestamp: Date.now(),
      ttl,
    });
    void cachePut(computedEventTeamsKey(eventCode), sortedData);
    return sortedData;
  })().finally(() => {
    inflight.delete(eventCode);
  });

  inflight.set(eventCode, promise);
  return promise;
}

/** Preload per-event rows from a bulk cache fetch (avoids N HTTP round-trips). */
export function seedEventTeamsCache(
  entries: Record<string, TeamData[]>
): void {
  for (const [eventCode, data] of Object.entries(entries)) {
    if (!data?.length) continue;
    eventTeamsCache.set(eventCode, {
      data,
      timestamp: Date.now(),
      ttl: isEventLikelyRecent(eventCode)
        ? 2 * 60 * 1000
        : 24 * 60 * 60 * 1000,
    });
  }
}

export async function getMatchPredictions(
  eventCode: string,
  FSMs: { [key: string]: number },
  preFetchedMatches?: Match[]
) {
  const config = resolveYearConfig(eventCode);
  const matches =
    preFetchedMatches ?? (await getEventQualMatches(eventCode, true));
  return getMatchPredictionsForConfig(matches, FSMs, config);
}
