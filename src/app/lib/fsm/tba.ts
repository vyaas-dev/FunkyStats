import { fetchTbaCached } from "../cacheBackend";
import { isEventLikelyRecent } from "../eventUtils";
import type { AttendingTeam, Match, RankingEntry } from "./types";

async function fetchTba<T>(path: string, revalidate: number): Promise<T> {
  const cached = await fetchTbaCached<T>(path);
  if (cached !== null) return cached;

  const res = await fetch(`https://www.thebluealliance.com/api/v3${path}`, {
    headers: { "X-TBA-Auth-Key": process.env.TBA_API_KEY! },
    next: { revalidate },
  });
  if (!res.ok) {
    throw new Error(`TBA request failed: ${path}`);
  }
  return (await res.json()) as T;
}

const matchesFetchCache = new Map<string, Promise<Match[]>>();
const attendingFetchCache = new Map<string, Promise<AttendingTeam[]>>();
const rankingsFetchCache = new Map<
  string,
  Promise<{ rankings: RankingEntry[] }>
>();

function revalidateForEvent(eventCode: string): number {
  // Avoid an extra TBA round-trip just to pick a cache TTL.
  return isEventLikelyRecent(eventCode) ? 120 : 3600;
}

export async function fetchAllMatches(eventCode: string): Promise<Match[]> {
  const cached = matchesFetchCache.get(eventCode);
  if (cached) return cached;
  const promise = (async () => {
    return fetchTba<Match[]>(
      `/event/${eventCode}/matches`,
      revalidateForEvent(eventCode)
    );
  })().finally(() => matchesFetchCache.delete(eventCode));
  matchesFetchCache.set(eventCode, promise);
  return promise;
}

export async function getAttendingTeams(eventCode: string) {
  const cached = attendingFetchCache.get(eventCode);
  if (cached) return cached;
  const promise = (async () => {
    return fetchTba<AttendingTeam[]>(
      `/event/${eventCode}/teams`,
      revalidateForEvent(eventCode)
    );
  })().finally(() => attendingFetchCache.delete(eventCode));
  attendingFetchCache.set(eventCode, promise);
  return promise;
}

export async function getEventQualMatches(
  eventCode: string,
  anyFine: boolean = false
) {
  const matches = await fetchAllMatches(eventCode);
  return anyFine
    ? matches
    : matches.filter((match) => match.comp_level === "qm");
}

export async function getEventRankings(eventCode: string): Promise<{
  rankings: RankingEntry[];
}> {
  const cached = rankingsFetchCache.get(eventCode);
  if (cached) return cached;
  const promise = (async () => {
    const data = await fetchTba<{ rankings?: RankingEntry[] }>(
      `/event/${eventCode}/rankings`,
      revalidateForEvent(eventCode)
    );
    return {
      rankings: (data?.rankings ?? []) as RankingEntry[],
    };
  })().finally(() => rankingsFetchCache.delete(eventCode));
  rankingsFetchCache.set(eventCode, promise);
  return promise;
}

export async function getEventAlliances(eventCode: string) {
  try {
    return await fetchTba(
      `/event/${eventCode}/alliances`,
      revalidateForEvent(eventCode)
    );
  } catch {
    return null;
  }
}

export { getNexusMatchSchedule } from "../event_nexus";
