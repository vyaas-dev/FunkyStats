"use client";

import { fetchWithCache, CACHE_TTL, isBrowser } from "./cache";

export interface TeamStats {
  teamData: Array<{
    event: string;
    teamfsm: string;
    teamrank: number;
  }>;
  bestFSM: number;
}

export interface TeamInfo {
  nickname: string;
  state_prov: string;
  city: string;
  country: string;
}

export interface EventTeam {
  key: string;
  rank: number;
  fsm: string;
  algae?: string;
  coral?: string;
  auto?: string;
  climb?: string;
  foul?: string;
}

export interface GlobalStat {
  teamKey: string;
  bestFSM: string;
}

export async function getCachedTeamStats(
  teamKey: string,
  year: number = 2025
): Promise<TeamStats> {
  if (!isBrowser()) {
    throw new Error("This function can only be called in the browser");
  }

  const currentYear = new Date().getFullYear();
  const isLikelyAtRecentEvent = year >= currentYear;

  const ttl = isLikelyAtRecentEvent
    ? CACHE_TTL.EVENT_TEAMS_RECENT
    : CACHE_TTL.TEAM_STATS;

  return fetchWithCache(
    `team_stats_${teamKey}_${year}`,
    async () => {
      const response = await fetch(
        `/api/team-stats?team=${teamKey}&year=${year}`
      );
      if (!response.ok) throw new Error("Failed to fetch team stats");
      return response.json();
    },
    ttl
  );
}

export async function getCachedTeamInfo(teamKey: string): Promise<TeamInfo> {
  if (!isBrowser()) {
    throw new Error("This function can only be called in the browser");
  }

  return fetchWithCache(
    `team_info_${teamKey}`,
    async () => {
      const response = await fetch(`/api/team-info?team=${teamKey}`);
      if (!response.ok) throw new Error("Failed to fetch team info");
      return response.json();
    },
    CACHE_TTL.TEAM_INFO
  );
}

export async function getCachedEventTeams(
  eventCode: string
): Promise<EventTeam[]> {
  if (!isBrowser()) {
    throw new Error("This function can only be called in the browser");
  }

  const currentYear = new Date().getFullYear();
  const eventYear = parseInt(eventCode.slice(0, 4));
  const isLikelyRecent = eventYear >= currentYear;

  const ttl = isLikelyRecent
    ? CACHE_TTL.EVENT_TEAMS_RECENT
    : CACHE_TTL.EVENT_TEAMS_OLD;

  return fetchWithCache(
    `event_teams_${eventCode}`,
    async () => {
      const response = await fetch(`/api/event-teams?event=${eventCode}`);
      if (!response.ok) throw new Error("Failed to fetch event teams");
      return response.json();
    },
    ttl
  );
}

export async function getCachedGlobalStats(
  year: number = 2025
): Promise<GlobalStat[]> {
  if (!isBrowser()) {
    throw new Error("This function can only be called in the browser");
  }

  return fetchWithCache(
    `global_stats_${year}`,
    async () => {
      const response = await fetch(`/api/global-stats?year=${year}`);
      if (!response.ok) throw new Error("Failed to fetch global stats");
      return response.json();
    },
    CACHE_TTL.GLOBAL_STATS
  );
}

export async function prefetchPageData(
  type: "team" | "event" | "global",
  params: { teamKey?: string; year?: number; eventCode?: string }
): Promise<void> {
  if (!isBrowser()) return;

  try {
    switch (type) {
      case "team":
        if (params.teamKey && params.year) {
          await Promise.all([
            getCachedTeamStats(params.teamKey, params.year),
            getCachedTeamInfo(params.teamKey),
          ]);
        }
        break;
      case "event":
        if (params.eventCode) {
          await getCachedEventTeams(params.eventCode);
        }
        break;
      case "global":
        if (params.year) {
          await getCachedGlobalStats(params.year);
        }
        break;
    }
  } catch (error) {
    console.error("Prefetch error:", error);
  }
}
