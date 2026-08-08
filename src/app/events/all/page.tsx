import ClientPage from "./clientpage";
import { getEventTeams, getAttendingTeams } from "@/app/lib/fsm";
import { get26Predictions } from "../../lib/26pred";
import type { Event26Metric } from "../../lib/eventMetrics";

export const dynamic = "force-dynamic";

type TbaSimpleEvent = {
  key: string;
  name: string;
  city?: string;
  state_prov?: string;
  country?: string;
  start_date?: string;
  end_date?: string;
  week?: number | null;
  district?: {
    display_name?: string;
  } | null;
};

const metricsCache = new Map<
  string,
  { data: Event26Metric[]; timestamp: number }
>();
const CACHE_TTL_MS = 1000 * 60 * 60;

async function fetchEvents(): Promise<TbaSimpleEvent[]> {
  const res = await fetch(
    `https://www.thebluealliance.com/api/v3/events/2026/simple`,
    {
      headers: {
        "X-TBA-Auth-Key": process.env.TBA_API_KEY!,
      },
      next: { revalidate: 3600 },
    }
  );

  if (!res.ok) {
    throw new Error("Failed to fetch 2026 events from The Blue Alliance");
  }

  const events: TbaSimpleEvent[] = await res.json();
  return events.filter((event) => event.key?.startsWith("2026"));
}

function computeRms(values: number[]) {
  if (values.length === 0) return { top10: 0, top25: 0, overall: 0 };

  const sorted = [...values].sort((a, b) => b - a);
  const compute = (list: number[]) => {
    if (list.length === 0) return 0;
    const sumSquares = list.reduce((acc, value) => acc + value * value, 0);
    return Math.sqrt(sumSquares / list.length);
  };

  const top10Count = Math.max(1, Math.ceil(sorted.length * 0.1));
  const top25Count = Math.max(1, Math.ceil(sorted.length * 0.25));

  return {
    top10: compute(sorted.slice(0, top10Count)),
    top25: compute(sorted.slice(0, top25Count)),
    overall: compute(sorted),
  };
}

async function fetchEventTeamKeys(eventKey: string): Promise<string[]> {
  const res = await fetch(
    `https://www.thebluealliance.com/api/v3/event/${eventKey}/teams/simple`,
    {
      headers: {
        "X-TBA-Auth-Key": process.env.TBA_API_KEY!,
      },
      next: { revalidate: 3600 },
    }
  );

  if (res.ok) {
    const teams: { key: string }[] = await res.json();
    return teams.map((team) => team.key);
  }

  try {
    const teams = await getAttendingTeams(eventKey);
    return teams.map((team: { key: string }) => team.key);
  } catch {
    return [];
  }
}

async function fetchEventMetrics(
  event: TbaSimpleEvent,
  predictionsMap: Map<string, number>
): Promise<Event26Metric | null> {
  try {
    const teams = await getEventTeams(event.key);
    const actualValues = new Map(
      teams.flatMap((team) => {
        const numericKey = team.key.replace(/^frc/, "");
        const value = Number(team.fsm);
        return [[team.key, value] as const, [numericKey, value] as const];
      })
    );

    const teamKeys = teams.length
      ? teams.map((team) => team.key)
      : await fetchEventTeamKeys(event.key);

    const combinedValues = teamKeys
      .map((key) => {
        const actual = actualValues.get(key) ?? 0;
        const predicted = predictionsMap.get(key) ?? 0;
        return actual > 0 ? actual : predicted;
      })
      .filter((value) => Number.isFinite(value) && value > 0);

    const teamCount = combinedValues.length;

    if (teamCount === 0) {
      return null;
    }

    const { top10, top25, overall } = computeRms(combinedValues);

    return {
      key: event.key,
      shortCode: event.key.replace(/^2026/, ""),
      name: event.name,
      city: event.city,
      stateProv: event.state_prov,
      country: event.country,
      startDate: event.start_date,
      endDate: event.end_date,
      week: typeof event.week === "number" ? event.week + 1 : null,
      district: event.district?.display_name ?? null,
      top10Rms: top10,
      top25Rms: top25,
      overallRms: overall,
      teamCount,
      updatedAt: new Date().toISOString(),
    };
  } catch {
    const teamKeys = await fetchEventTeamKeys(event.key);
    const combinedValues = teamKeys
      .map((key) => predictionsMap.get(key) ?? 0)
      .filter((value) => Number.isFinite(value) && value > 0);

    if (combinedValues.length === 0) {
      return null;
    }

    const { top10, top25, overall } = computeRms(combinedValues);

    return {
      key: event.key,
      shortCode: event.key.replace(/^2026/, ""),
      name: event.name,
      city: event.city,
      stateProv: event.state_prov,
      country: event.country,
      startDate: event.start_date,
      endDate: event.end_date,
      week: typeof event.week === "number" ? event.week + 1 : null,
      district: event.district?.display_name ?? null,
      top10Rms: top10,
      top25Rms: top25,
      overallRms: overall,
      teamCount: combinedValues.length,
      updatedAt: new Date().toISOString(),
    };
  }
}

async function gatherEventMetrics(events: TbaSimpleEvent[]) {
  const cacheKey = "2026-event-metrics";
  const cached = metricsCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const predictions = await get26Predictions();
  const predictionsMap = new Map(
    predictions.flatMap((entry) => {
      const numericKey = entry.teamKey.replace(/^frc/, "");
      const value = Number(entry.bestFSM);
      return [[entry.teamKey, value] as const, [numericKey, value] as const];
    })
  );

  const batchSize = 10;
  const computedResults: (Event26Metric | null)[] = [];
  for (let i = 0; i < events.length; i += batchSize) {
    const batch = events.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((event) => fetchEventMetrics(event, predictionsMap))
    );
    computedResults.push(...batchResults);
  }

  const orderedResults = computedResults.filter(
    (metric): metric is Event26Metric => Boolean(metric)
  );

  metricsCache.set(cacheKey, {
    data: orderedResults,
    timestamp: Date.now(),
  });

  return orderedResults;
}

export default async function Page() {
  const events = await fetchEvents();
  const eventsWithMetrics = await gatherEventMetrics(events);

  return <ClientPage events={eventsWithMetrics} />;
}
