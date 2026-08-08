"use client";
/* eslint-disable */

import { useState, useEffect, useMemo } from "react";
import styles from "../../page.module.css";
import TeamLink from "@/app/components/TeamLink";
import MatchDetailModal from "./MatchDetailModal";
import EventTeamsTable from "../../components/EventStatsTable";
import EventSearchInput from "@/app/components/EventSearchInput";

type MatchPredictions = {
  [key: string]: {
    preds: string[];
    red: string[];
    blue: string[];
    result: number[];
  };
};

interface ClientPageProps {
  havePreds: boolean;
  year: number;
  eventCode: string;
  fullEventCode: string;
  eventType?: number | null;
  eventInfo: {
    key: string;
    name: string;
    location: string;
    dateRange: string;
    isOffseason: boolean;
    eventTypeLabel: string | null;
    website: string | null;
    watch: { url: string; kind: "youtube" | "other" } | null;
  };
  teams: any[];
  matchPredictions: MatchPredictions;
  matches: any[];
  playedMatches: number;
  predictedFsms: Record<string, number>;
  alliances?: any[];
}

type EventTab = "metrics" | "matches" | "rankings";

function matchPassesFilter(
  matchKey: string,
  match: MatchPredictions[string],
  query: string
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const keyWithoutYear = matchKey.replace(/^\d{4}/, "").toLowerCase();
  const matchNum = matchKey.split("_").pop()?.toLowerCase() ?? "";
  const isQual = matchKey.includes("_qm");
  const isSf = matchKey.includes("_sf");
  const isFinal = matchKey.includes("_f") && !isSf;

  const displayName = isQual
    ? `quals ${matchNum.replace("qm", "")}`
    : isSf
      ? `semis ${matchNum.replace("sf", "").replace("m", " ")}`
      : isFinal
        ? `finals ${matchNum.replace("f", "").replace("m", " ")}`
        : keyWithoutYear;

  const haystacks = [
    keyWithoutYear,
    matchKey.toLowerCase(),
    matchNum,
    displayName,
    isQual ? "qual quals qualification" : "",
    isSf ? "sf semi semis semifinal" : "",
    isFinal ? "final finals f" : "",
  ];
  if (haystacks.some((h) => h.includes(q))) return true;

  const qTeam = q.replace(/^frc/, "").replace(/\s+/g, "");
  const teamTokens = [...match.red, ...match.blue].map((t) =>
    t.toLowerCase().replace(/^frc/, "")
  );
  if (teamTokens.some((t) => t.includes(qTeam) || qTeam.includes(t))) {
    return true;
  }

  const scores = [
    ...(match.result ?? []),
    ...(match.preds ?? []).map(Number),
  ]
    .filter((n) => Number.isFinite(n))
    .map(String);
  if (scores.some((s) => s.includes(q))) return true;

  return false;
}

function teamHighlighted(teamKey: string, query: string): boolean {
  const q = query.trim().toLowerCase().replace(/^frc/, "");
  if (!q) return false;
  const num = teamKey.toLowerCase().replace(/^frc/, "");
  return Boolean(num) && (num.includes(q) || q.includes(num));
}

export default function ClientPage({
  havePreds,
  year,
  eventCode,
  fullEventCode,
  eventType,
  eventInfo,
  teams,
  matchPredictions,
  matches,
  playedMatches,
  predictedFsms,
  alliances,
}: ClientPageProps) {
  const [activeTab, setActiveTab] = useState<EventTab>("metrics");
  const [selectedMatch, setSelectedMatch] = useState<{
    matchKey: string;
    match: MatchPredictions[string];
  } | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);
  const [matchFilter, setMatchFilter] = useState("");
  const firstRpThreshold = [2, 3, 4].includes(Number(eventType)) ? 240 : 100;

  const { topQuarterRms, overallRms, topDecileRms } = useMemo(() => {
    const predictedValues = Object.values(predictedFsms ?? {})
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value));

    const fallbackValues = teams
      .map((team) => Number(team.fsm))
      .filter((value) => Number.isFinite(value));

    const fsmValues =
      predictedValues.length > 0 ? predictedValues : fallbackValues;

    if (fsmValues.length === 0) {
      return { topQuarterRms: 0, overallRms: 0, topDecileRms: 0 };
    }

    const sorted = [...fsmValues].sort((a, b) => b - a);

    const computeRms = (values: number[]) => {
      if (values.length === 0) return 0;
      const sumSquares = values.reduce((acc, value) => acc + value * value, 0);
      return Math.sqrt(sumSquares / values.length);
    };

    const top25Count = Math.max(1, Math.ceil(sorted.length * 0.25));
    const top10Count = Math.max(1, Math.ceil(sorted.length * 0.1));

    return {
      topQuarterRms: computeRms(sorted.slice(0, top25Count)),
      overallRms: computeRms(sorted),
      topDecileRms: computeRms(sorted.slice(0, top10Count)),
    };
  }, [predictedFsms, teams]);

  const teamLookup = useMemo(() => {
    const map = new Map<string, { fsm: number; auto: number }>();
    for (const t of teams) {
      const key = String(t.key);
      const fsmVal = Number(t.fsm ?? 0);
      const autoVal = Number(t.auto ?? 0);
      map.set(key, { fsm: fsmVal, auto: autoVal });
      const noPrefix = key.replace(/^frc/, "");
      if (noPrefix !== key) map.set(noPrefix, { fsm: fsmVal, auto: autoVal });
      if (!key.startsWith("frc")) map.set(`frc${key}`, { fsm: fsmVal, auto: autoVal });
    }
    return map;
  }, [teams]);

  const allianceFsm = (teamKeys: string[], maxTeams?: number) => {
    let totalFsm = 0;
    let totalAuto = 0;
    const keys = maxTeams != null ? teamKeys.slice(0, maxTeams) : teamKeys;
    for (const k of keys) {
      const t = teamLookup.get(k);
      if (t) { totalFsm += t.fsm; totalAuto += t.auto; }
    }
    return { fsm: totalFsm, auto: totalAuto };
  };

  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 768);
    };

    checkDesktop();
    window.addEventListener("resize", checkDesktop);

    return () => window.removeEventListener("resize", checkDesktop);
  }, []);

  const entries = Object.entries(matchPredictions).sort(([a], [b]) => {
    const getTypeOrder = (key: string) => {
      if (key.includes("_f")) return 2;
      if (key.includes("_sf")) return 1;
      return 0;
    };
    const typeA = getTypeOrder(a);
    const typeB = getTypeOrder(b);

    if (typeA !== typeB) return typeA - typeB;

    const numA = parseInt(a.slice(4).match(/\d+/)?.[0] ?? "0", 10);
    const numB = parseInt(b.slice(4).match(/\d+/)?.[0] ?? "0", 10);

    return numA === numB ? a.localeCompare(b) : numA - numB;
  });

  const qualsEntries = entries.filter(
    ([key, match]) =>
      key.includes("_qm") && matchPassesFilter(key, match, matchFilter)
  );

  const elimsEntries = entries.filter(
    ([key, match]) =>
      !key.includes("_qm") && matchPassesFilter(key, match, matchFilter)
  );

  const projectedRankings = useMemo(() => {
    const EPS = 1e-6;
    const erf = (x: number) => {
      const sign = x >= 0 ? 1 : -1;
      const ax = Math.abs(x);
      const a1 = 0.254829592;
      const a2 = -0.284496736;
      const a3 = 1.421413741;
      const a4 = -1.453152027;
      const a5 = 1.061405429;
      const p = 0.3275911;
      const t = 1 / (1 + p * ax);
      const y =
        1 -
        (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) *
          t *
          Math.exp(-ax * ax));
      return sign * y;
    };
    const normalCdf = (z: number) => 0.5 * (1 + erf(z / Math.sqrt(2)));
    const probAtLeast = (mean: number, stdDev: number, threshold: number) => {
      const s = stdDev > EPS ? stdDev : 1;
      return 1 - normalCdf((threshold - mean) / s);
    };

    const teamMetricMap = new Map<
      string,
      { fuel: number; climb: number; fsm: number }
    >(
      teams.map((team) => [
        team.key,
        {
          fuel: Number(team.fuel ?? team.fsm ?? 0),
          climb: Number(team.climb ?? 0),
          fsm: Number(team.fsm ?? 0),
        },
      ])
    );

    const allFuel = teams.map((t) => Number(t.fuel ?? t.fsm ?? 0)).filter(Number.isFinite);
    const allClimb = teams.map((t) => Number(t.climb ?? 0)).filter(Number.isFinite);
    const allFsm = teams.map((t) => Number(t.fsm ?? 0)).filter(Number.isFinite);
    const meanOf = (vals: number[], fallback: number) =>
      vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : fallback;
    const varOf = (vals: number[], fallback: number) => {
      if (vals.length === 0) return fallback;
      const m = meanOf(vals, 0);
      return vals.reduce((a, b) => a + Math.pow(b - m, 2), 0) / vals.length;
    };

    const fuelMean = meanOf(allFuel, 45);
    const climbMean = meanOf(allClimb, 8);
    const fsmMean = meanOf(allFsm, 45);
    const fuelVar = Math.max(varOf(allFuel, 25 * 25), 25);
    const climbVar = Math.max(varOf(allClimb, 12 * 12), 16);
    const fsmVar = Math.max(varOf(allFsm, 25 * 25), 25);

    const allianceMetricStats = (
      teamKeys: string[],
      metric: "fuel" | "climb" | "fsm"
    ) => {
      let mean = 0;
      let variance = 0;
      for (const key of teamKeys) {
        const m = teamMetricMap.get(key);
        const value =
          m?.[metric] ??
          (metric === "fuel" ? fuelMean : metric === "climb" ? climbMean : fsmMean);
        mean += Number.isFinite(value) ? value : 0;
        variance += metric === "fuel" ? fuelVar : metric === "climb" ? climbVar : fsmVar;
      }
      return { mean, stdDev: Math.sqrt(Math.max(variance, EPS)) };
    };

    const standings = new Map<
      string,
      {
        teamKey: string;
        currentRp: number;
        forecastRp: number;
        wins: number;
        losses: number;
        ties: number;
        played: number;
        scheduled: number;
      }
    >();

    const ensure = (teamKey: string) => {
      if (!standings.has(teamKey)) {
        standings.set(teamKey, {
          teamKey,
          currentRp: 0,
          forecastRp: 0,
          wins: 0,
          losses: 0,
          ties: 0,
          played: 0,
          scheduled: 0,
        });
      }
      return standings.get(teamKey)!;
    };

    for (const team of teams) ensure(team.key);

    const addActualAlliance = (
      teamKeys: string[],
      rpValue: number,
      result: "win" | "loss" | "tie"
    ) => {
      for (const teamKey of teamKeys) {
        const row = ensure(teamKey);
        row.currentRp += rpValue;
        row.forecastRp += rpValue;
        row.played += 1;
        row.scheduled += 1;
        if (result === "win") row.wins += 1;
        else if (result === "loss") row.losses += 1;
        else row.ties += 1;
      }
    };

    const addExpectedAlliance = (
      teamKeys: string[],
      pWin: number,
      pFuel: number,
      pScore: number,
      pClimb: number
    ) => {
      const expectedRp = 3 * pWin + pFuel + pScore + pClimb;
      for (const teamKey of teamKeys) {
        const row = ensure(teamKey);
        row.forecastRp += expectedRp;
        row.wins += pWin;
        row.losses += 1 - pWin;
        row.scheduled += 1;
      }
    };

    const pairThresholdProbability = (
      teamKey: string,
      metric: "fuel" | "climb" | "fsm",
      threshold: number
    ) => {
      const teamValue = Number(
        teamMetricMap.get(teamKey)?.[metric] ??
          (metric === "fuel" ? fuelMean : metric === "climb" ? climbMean : fsmMean)
      );
      if (!Number.isFinite(teamValue)) return 0;
      if (teamValue >= threshold) return 1;
      const deficit = threshold - teamValue;
      const partnerValues = teams
        .filter((t) => t.key !== teamKey)
        .map((t) => {
          const value =
            teamMetricMap.get(t.key)?.[metric] ??
            (metric === "fuel" ? fuelMean : metric === "climb" ? climbMean : fsmMean);
          return Number(value);
        })
        .filter(Number.isFinite);
      if (partnerValues.length < 2) {
        const varValue = metric === "fuel" ? fuelVar : metric === "climb" ? climbVar : fsmVar;
        return probAtLeast(teamValue + 2 * meanOf(partnerValues, 0), Math.sqrt(2 * varValue), threshold);
      }
      let success = 0;
      let total = 0;
      for (let i = 0; i < partnerValues.length - 1; i += 1) {
        for (let j = i + 1; j < partnerValues.length; j += 1) {
          total += 1;
          if (partnerValues[i] + partnerValues[j] >= deficit) {
            success += 1;
          }
        }
      }
      return total > 0 ? success / total : 0;
    };

    const qualMatches = matches.filter((m) => m.comp_level === "qm");
    if (qualMatches.length === 0) {
      const expectedMatches = 10;
      const meanOppFsm = 3 * fsmMean;
      const stdOppFsm = Math.sqrt(3 * fsmVar);

      for (const team of teams) {
        const row = ensure(team.key);
        const teamFuel = Number(team.fuel ?? team.fsm ?? fuelMean);
        const teamClimb = Number(team.climb ?? 0);
        const teamFsm = Number(team.fsm ?? fsmMean);

        const allianceFuelMean = teamFuel + 2 * fuelMean;
        const allianceClimbMean = teamClimb + 2 * climbMean;
        const allianceFsmMean = teamFsm + 2 * fsmMean;

        const allianceFuelStd = Math.sqrt(3 * fuelVar);
        const allianceClimbStd = Math.sqrt(3 * climbVar);
        const allianceFsmStd = Math.sqrt(3 * fsmVar);

        const pWin = probAtLeast(
          allianceFsmMean - meanOppFsm,
          Math.sqrt(allianceFsmStd ** 2 + stdOppFsm ** 2),
          0
        );
        const pFuel = pairThresholdProbability(team.key, "fuel", firstRpThreshold);
        const pScore = pairThresholdProbability(team.key, "fsm", 360);
        const pClimb = pairThresholdProbability(team.key, "climb", 50);

        row.currentRp = 0;
        row.forecastRp += (3 * pWin + pFuel + pScore + pClimb) * expectedMatches;
        row.wins += pWin * expectedMatches;
        row.losses += (1 - pWin) * expectedMatches;
        row.scheduled += expectedMatches;
      }
    } else {
      for (const match of qualMatches) {
        const redTeams: string[] = match.alliances?.red?.team_keys ?? [];
        const blueTeams: string[] = match.alliances?.blue?.team_keys ?? [];
        const redSb = match.score_breakdown?.red;
        const blueSb = match.score_breakdown?.blue;

        if (redSb && blueSb && redSb.rp != null && blueSb.rp != null) {
          const redScore = Number(match.alliances?.red?.score) || 0;
          const blueScore = Number(match.alliances?.blue?.score) || 0;
          const redResult =
            redScore > blueScore ? "win" : redScore < blueScore ? "loss" : "tie";
          const blueResult =
            blueScore > redScore ? "win" : blueScore < redScore ? "loss" : "tie";
          addActualAlliance(redTeams, Number(redSb.rp) || 0, redResult);
          addActualAlliance(blueTeams, Number(blueSb.rp) || 0, blueResult);
          continue;
        }

        const mp = (matchPredictions as any)?.[match.key];
        const predScores =
          mp && Array.isArray(mp.preds) && mp.preds.length === 2
            ? [Number(mp.preds[0]), Number(mp.preds[1])]
            : null;
        const predWinner =
          predScores && Number.isFinite(predScores[0]) && Number.isFinite(predScores[1])
            ? predScores[0] > predScores[1]
              ? "red"
              : predScores[1] > predScores[0]
              ? "blue"
              : "tie"
            : null;

        const redFsm = allianceMetricStats(redTeams, "fsm");
        const blueFsm = allianceMetricStats(blueTeams, "fsm");
        const redFuel = allianceMetricStats(redTeams, "fuel");
        const blueFuel = allianceMetricStats(blueTeams, "fuel");
        const redClimb = allianceMetricStats(redTeams, "climb");
        const blueClimb = allianceMetricStats(blueTeams, "climb");

        const pRedWin =
          predWinner === "red"
            ? 1
            : predWinner === "blue"
            ? 0
            : predWinner === "tie"
            ? 0.5
            : probAtLeast(
                redFsm.mean - blueFsm.mean,
                Math.sqrt(redFsm.stdDev ** 2 + blueFsm.stdDev ** 2),
                0
              );
        const pBlueWin =
          predWinner === "blue"
            ? 1
            : predWinner === "red"
            ? 0
            : predWinner === "tie"
            ? 0.5
            : 1 - pRedWin;

        const pRedFuel = probAtLeast(redFuel.mean, redFuel.stdDev, firstRpThreshold);
        const pBlueFuel = probAtLeast(blueFuel.mean, blueFuel.stdDev, firstRpThreshold);
        const pRedScore = probAtLeast(redFsm.mean, redFsm.stdDev, 360);
        const pBlueScore = probAtLeast(blueFsm.mean, blueFsm.stdDev, 360);
        const pRedClimb = probAtLeast(redClimb.mean, redClimb.stdDev, 50);
        const pBlueClimb = probAtLeast(blueClimb.mean, blueClimb.stdDev, 50);

        addExpectedAlliance(redTeams, pRedWin, pRedFuel, pRedScore, pRedClimb);
        addExpectedAlliance(blueTeams, pBlueWin, pBlueFuel, pBlueScore, pBlueClimb);
      }
    }

    const getForecastAvg = (row: { forecastRp: number; scheduled: number }) =>
      row.scheduled > 0 ? row.forecastRp / row.scheduled : 0;

    return Array.from(standings.values())
      .sort((a, b) => {
        const bAvg = getForecastAvg(b);
        const aAvg = getForecastAvg(a);
        if (bAvg !== aAvg) return bAvg - aAvg;
        if (b.currentRp !== a.currentRp) return b.currentRp - a.currentRp;
        if (b.wins !== a.wins) return b.wins - a.wins;
        return a.teamKey.localeCompare(b.teamKey);
      })
      .map((row, idx) => ({
        ...row,
        forecastAvgRp: getForecastAvg(row),
        rank: idx + 1,
      }));
  }, [matches, teams, matchPredictions]);

  return (
    <div
      className={styles.page}
      style={{
        position: "relative",
        minHeight: "100vh",
        width: "100vw",
        maxWidth: "100%",
      }}
    >
      <main className={styles.main}>
        <header
          style={{
            width: "100%",
            maxWidth: 960,
            margin: "0 auto 1.25rem",
            textAlign: "center",
            padding: "0 0.5rem",
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: "clamp(1.85rem, 4vw, 2.6rem)",
              fontWeight: 800,
              letterSpacing: "-0.02em",
              color: "var(--foreground)",
              lineHeight: 1.15,
            }}
          >
            {eventInfo.name}
          </h1>

          <div
            style={{
              marginTop: "0.65rem",
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.45rem 0.65rem",
              color: "var(--gray-less)",
              fontSize: "0.95rem",
              fontWeight: 500,
            }}
          >
            <span>{eventInfo.key}</span>
            {eventInfo.location ? (
              <>
                <span aria-hidden style={{ opacity: 0.5 }}>
                  ·
                </span>
                <span>{eventInfo.location}</span>
              </>
            ) : null}
            {eventInfo.isOffseason ? (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "0.15rem 0.55rem",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "var(--foreground)",
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                }}
              >
                OFFSEASON
              </span>
            ) : eventInfo.eventTypeLabel ? (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "0.15rem 0.55rem",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "var(--foreground)",
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                {eventInfo.eventTypeLabel}
              </span>
            ) : null}
          </div>

          {eventInfo.dateRange ? (
            <div
              style={{
                marginTop: "0.35rem",
                color: "var(--gray-less)",
                fontSize: "0.95rem",
                fontWeight: 500,
              }}
            >
              {eventInfo.dateRange}
            </div>
          ) : null}

          {(eventInfo.watch || eventInfo.website) && (
            <div
              style={{
                marginTop: "0.95rem",
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "center",
                gap: "0.65rem",
              }}
            >
              {eventInfo.watch ? (
                <a
                  href={eventInfo.watch.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "0.55rem 0.95rem",
                    borderRadius: 10,
                    background: "var(--yellow-color)",
                    color: "#1a1a1a",
                    fontWeight: 700,
                    fontSize: "0.9rem",
                    textDecoration: "none",
                  }}
                >
                  Livestream
                </a>
              ) : null}
              {eventInfo.website ? (
                <a
                  href={eventInfo.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    padding: "0.55rem 0.35rem",
                    borderRadius: 10,
                    background: "transparent",
                    color: "var(--foreground)",
                    fontWeight: 600,
                    fontSize: "0.9rem",
                    textDecoration: "underline",
                    textUnderlineOffset: "3px",
                  }}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden
                  >
                    <path
                      d="M14 5h5v5M10 14L19 5M19 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Event website
                </a>
              ) : null}
            </div>
          )}
        </header>

        <div
          style={{
            display: "flex",
            width: "100%",
            maxWidth: 720,
            margin: "0.5rem auto 1.5rem",
            borderBottom: "1px solid var(--border-color)",
            gap: "0.25rem",
          }}
        >
          {(
            [
              { id: "metrics", label: "Metrics", disabled: false },
              { id: "matches", label: "Matches", disabled: !havePreds },
              { id: "rankings", label: "Rankings", disabled: false },
            ] as const
          ).map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => !tab.disabled && setActiveTab(tab.id)}
                disabled={tab.disabled}
                style={{
                  flex: 1,
                  padding: "0.85rem 0.5rem",
                  background: "transparent",
                  border: "none",
                  borderBottom: isActive
                    ? "3px solid var(--yellow-color)"
                    : "3px solid transparent",
                  marginBottom: -1,
                  color: tab.disabled
                    ? "rgba(156,163,175,0.4)"
                    : isActive
                      ? "var(--foreground)"
                      : "rgba(156,163,175,0.85)",
                  fontWeight: isActive ? 600 : 500,
                  fontSize: "0.95rem",
                  cursor: tab.disabled ? "not-allowed" : "pointer",
                  transition: "color 0.15s ease, border-color 0.15s ease",
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === "metrics" && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              color: "var(--foreground)",
              borderRadius: 12,
              width: "100%",
            }}
          >
            <div
              style={{ maxWidth: "100%", overflowX: "scroll", width: "100%" }}
            >
              <EventTeamsTable teams={teams} gameYear={year} />
            </div>
          </div>
        )}

        {activeTab === "matches" && havePreds && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              color: "var(--foreground)",
              borderRadius: 12,
              width: "100%",
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: "560px",
                marginBottom: "1.25rem",
                padding: "0 1rem",
                boxSizing: "border-box",
              }}
            >
              <EventSearchInput
                value={matchFilter}
                onChange={setMatchFilter}
                placeholder="Filter by team, match, or score…"
              />
            </div>

            <div style={{
              display: "grid",
              gridTemplateColumns: isDesktop ? "1fr 1fr" : "1fr",
              gap: "2rem",
              width: "100%",
              maxWidth: "1400px",
              margin: "0 auto",
              alignItems: "start",
            }}>
              {/* Qualification Results */}
              <div style={{ overflowX: "auto" }}>
                <h3 style={{ color: "var(--yellow-color)", textAlign: "center", marginBottom: "0.75rem" }}>
                  Qualification Results ({qualsEntries.length})
                </h3>
                {qualsEntries.length > 0 ? (
                  <div style={{ borderRadius: 8, border: "1px solid var(--border-color)", overflow: "hidden" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                      <thead>
                        <tr style={{ background: "var(--gray-more)", borderBottom: "2px solid var(--border-color)" }}>
                          <th style={{ padding: "0.45rem 0.5rem", width: 28 }}></th>
                          <th style={{ padding: "0.45rem 0.5rem", textAlign: "left", fontWeight: 600, fontSize: "0.78rem", color: "var(--gray-less)", whiteSpace: "nowrap" }}>Match</th>
                          <th colSpan={3} style={{ padding: "0.45rem 0.5rem", textAlign: "center", fontWeight: 600, fontSize: "0.78rem", color: "#ff4d4d" }}>Red Alliance</th>
                          <th colSpan={3} style={{ padding: "0.45rem 0.5rem", textAlign: "center", fontWeight: 600, fontSize: "0.78rem", color: "#4d8cff" }}>Blue Alliance</th>
                          <th colSpan={2} style={{ padding: "0.45rem 0.5rem", textAlign: "center", fontWeight: 600, fontSize: "0.78rem", color: "var(--gray-less)" }}>Scores</th>
                        </tr>
                      </thead>
                      <tbody>
                        {qualsEntries.map(([matchKey, match], idx) => {
                          const hasResult = match.result && match.result.length === 2 && match.result[0] !== -1 && match.result[1] !== -1;
                          const redScore = hasResult ? match.result[0] : Math.round(Number(match.preds[0]));
                          const blueScore = hasResult ? match.result[1] : Math.round(Number(match.preds[1]));
                          const redWon = hasResult && redScore > blueScore;
                          const blueWon = hasResult && blueScore > redScore;
                          const redTeams = [...match.red, "", "", ""].slice(0, 3);
                          const blueTeams = [...match.blue, "", "", ""].slice(0, 3);
                          const matchNum = matchKey.split("_").pop()?.replace("qm", "") ?? "";
                          const redStats = allianceFsm(match.red);
                          const blueStats = allianceFsm(match.blue);
                          return (
                            <tr
                              key={matchKey}
                              onClick={() => setSelectedMatch({ matchKey, match })}
                              style={{
                                borderBottom: "1px solid var(--border-color)",
                                cursor: "pointer",
                                background: idx % 2 === 0 ? "var(--background-pred)" : "transparent",
                                transition: "background 0.15s",
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(253, 224, 71, 0.06)"; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = idx % 2 === 0 ? "var(--background-pred)" : "transparent"; }}
                            >
                              <td style={{ padding: "0.35rem 0.4rem", textAlign: "center", color: "var(--gray-less)", fontSize: "0.75rem" }}>
                                {hasResult ? "⊙" : ""}
                              </td>
                              <td style={{ padding: "0.35rem 0.5rem", fontWeight: 600, whiteSpace: "nowrap" }}>Quals {matchNum}</td>
                              {redTeams.map((t, i) => {
                                const num = t.replace(/^frc/, "");
                                const highlighted = teamHighlighted(t, matchFilter);
                                return (
                                  <td key={`r${i}`} style={{
                                    padding: "0.35rem 0.4rem",
                                    color: highlighted ? "#000" : "#ff4d4d",
                                    fontWeight: redWon ? 700 : 400,
                                    textAlign: "center",
                                    background: highlighted ? "var(--yellow-color)" : "transparent",
                                    borderRadius: highlighted ? 3 : 0,
                                  }}>
                                    {num}
                                  </td>
                                );
                              })}
                              {blueTeams.map((t, i) => {
                                const num = t.replace(/^frc/, "");
                                const highlighted = teamHighlighted(t, matchFilter);
                                return (
                                  <td key={`b${i}`} style={{
                                    padding: "0.35rem 0.4rem",
                                    color: highlighted ? "#000" : "#4d8cff",
                                    fontWeight: blueWon ? 700 : 400,
                                    textAlign: "center",
                                    background: highlighted ? "var(--yellow-color)" : "transparent",
                                    borderRadius: highlighted ? 3 : 0,
                                  }}>
                                    {num}
                                  </td>
                                );
                              })}
                              <td style={{
                                padding: "0.35rem 0.5rem",
                                fontWeight: redWon ? 700 : 400,
                                textAlign: "center",
                                background: redWon ? "rgba(255, 77, 77, 0.15)" : "transparent",
                                color: hasResult ? "var(--foreground)" : "var(--gray-less)",
                                fontStyle: hasResult ? "normal" : "italic",
                              }}>
                                <div>{redScore}</div>
                                <div style={{ fontSize: "0.62rem", fontWeight: 400, color: "var(--gray-less)", fontStyle: "normal", lineHeight: 1.1, marginTop: 1 }}>
                                  {redStats.fsm.toFixed(0)} FSM · {redStats.auto.toFixed(0)} Auto
                                </div>
                              </td>
                              <td style={{
                                padding: "0.35rem 0.5rem",
                                fontWeight: blueWon ? 700 : 400,
                                textAlign: "center",
                                background: blueWon ? "rgba(77, 140, 255, 0.15)" : "transparent",
                                color: hasResult ? "var(--foreground)" : "var(--gray-less)",
                                fontStyle: hasResult ? "normal" : "italic",
                              }}>
                                <div>{blueScore}</div>
                                <div style={{ fontSize: "0.62rem", fontWeight: 400, color: "var(--gray-less)", fontStyle: "normal", lineHeight: 1.1, marginTop: 1 }}>
                                  {blueStats.fsm.toFixed(0)} FSM · {blueStats.auto.toFixed(0)} Auto
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ padding: "1rem", textAlign: "center", color: "var(--gray-less)", background: "var(--background-pred)", borderRadius: 12, border: "2px solid var(--border-color)" }}>
                    No qualification matches found
                  </div>
                )}
              </div>

              {/* Right column: Alliances + Playoffs */}
              <div>
                {/* Alliances Table */}
                {alliances && alliances.length > 0 && (
                  <div style={{ marginBottom: "2rem", overflowX: "auto" }}>
                    <h3 style={{ color: "var(--yellow-color)", textAlign: "center", marginBottom: "0.75rem" }}>
                      Alliances
                    </h3>
                    <div style={{ borderRadius: 8, border: "1px solid var(--border-color)", overflow: "hidden" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                        <thead>
                          <tr style={{ background: "var(--gray-more)", borderBottom: "2px solid var(--border-color)" }}>
                            <th style={{ padding: "0.45rem 0.6rem", textAlign: "left", fontWeight: 600, fontSize: "0.78rem", color: "var(--gray-less)" }}>Alliance</th>
                            <th style={{ padding: "0.45rem 0.6rem", textAlign: "center", fontWeight: 600, fontSize: "0.78rem", color: "var(--gray-less)" }}>Captain</th>
                            <th style={{ padding: "0.45rem 0.6rem", textAlign: "center", fontWeight: 600, fontSize: "0.78rem", color: "var(--gray-less)" }}>Pick 1</th>
                            <th style={{ padding: "0.45rem 0.6rem", textAlign: "center", fontWeight: 600, fontSize: "0.78rem", color: "var(--gray-less)" }}>Pick 2</th>
                            <th style={{ padding: "0.45rem 0.6rem", textAlign: "center", fontWeight: 600, fontSize: "0.78rem", color: "var(--gray-less)" }}>Pick 3</th>
                            <th style={{ padding: "0.45rem 0.6rem", textAlign: "center", fontWeight: 600, fontSize: "0.78rem", color: "var(--yellow-color)" }}>FSM</th>
                            <th style={{ padding: "0.45rem 0.6rem", textAlign: "center", fontWeight: 600, fontSize: "0.78rem", color: "var(--yellow-color)" }}>Auto</th>
                          </tr>
                        </thead>
                        <tbody>
                          {alliances.map((alliance: any, idx: number) => {
                            const picks = alliance.picks ?? [];
                            const stats = allianceFsm(picks, 3);
                            return (
                              <tr key={idx} style={{ borderBottom: "1px solid var(--border-color)", background: idx % 2 === 0 ? "var(--background-pred)" : "transparent" }}>
                                <td style={{ padding: "0.4rem 0.6rem", fontWeight: 600 }}>Alliance {idx + 1}</td>
                                <td style={{ padding: "0.4rem 0.6rem", textAlign: "center" }}>{picks[0]?.replace(/^frc/, "") ?? ""}</td>
                                <td style={{ padding: "0.4rem 0.6rem", textAlign: "center" }}>{picks[1]?.replace(/^frc/, "") ?? ""}</td>
                                <td style={{ padding: "0.4rem 0.6rem", textAlign: "center" }}>{picks[2]?.replace(/^frc/, "") ?? ""}</td>
                                <td style={{ padding: "0.4rem 0.6rem", textAlign: "center" }}>{picks[3]?.replace(/^frc/, "") ?? ""}</td>
                                <td style={{ padding: "0.4rem 0.6rem", textAlign: "center", fontWeight: 700, color: "var(--yellow-color)" }}>{stats.fsm.toFixed(1)}</td>
                                <td style={{ padding: "0.4rem 0.6rem", textAlign: "center", fontWeight: 700, color: "var(--yellow-color)" }}>{stats.auto.toFixed(1)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Playoff Results */}
                {elimsEntries.length > 0 ? (
                  <div style={{ overflowX: "auto" }}>
                    <h3 style={{ color: "var(--yellow-color)", textAlign: "center", marginBottom: "0.75rem" }}>
                      Playoff Results ({elimsEntries.length})
                    </h3>
                    <div style={{ borderRadius: 8, border: "1px solid var(--border-color)", overflow: "hidden" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                        <thead>
                          <tr style={{ background: "var(--gray-more)", borderBottom: "2px solid var(--border-color)" }}>
                            <th style={{ padding: "0.45rem 0.5rem", width: 28 }}></th>
                            <th style={{ padding: "0.45rem 0.5rem", textAlign: "left", fontWeight: 600, fontSize: "0.78rem", color: "var(--gray-less)", whiteSpace: "nowrap" }}>Match</th>
                            <th colSpan={3} style={{ padding: "0.45rem 0.5rem", textAlign: "center", fontWeight: 600, fontSize: "0.78rem", color: "#ff4d4d" }}>Red Alliance</th>
                            <th colSpan={3} style={{ padding: "0.45rem 0.5rem", textAlign: "center", fontWeight: 600, fontSize: "0.78rem", color: "#4d8cff" }}>Blue Alliance</th>
                            <th colSpan={2} style={{ padding: "0.45rem 0.5rem", textAlign: "center", fontWeight: 600, fontSize: "0.78rem", color: "var(--gray-less)" }}>Scores</th>
                          </tr>
                        </thead>
                        <tbody>
                          {elimsEntries.map(([matchKey, match], idx) => {
                            const hasResult = match.result && match.result.length === 2 && match.result[0] !== -1 && match.result[1] !== -1;
                            const redScore = hasResult ? match.result[0] : Math.round(Number(match.preds[0]));
                            const blueScore = hasResult ? match.result[1] : Math.round(Number(match.preds[1]));
                            const redWon = hasResult && redScore > blueScore;
                            const blueWon = hasResult && blueScore > redScore;
                            const redTeams = [...match.red, "", "", ""].slice(0, 3);
                            const blueTeams = [...match.blue, "", "", ""].slice(0, 3);
                            const suffix = matchKey.split("_").pop() ?? "";
                            let matchLabel = suffix;
                            const sfMatch = suffix.match(/^sf(\d+)m(\d+)$/);
                            const fMatch = suffix.match(/^f(\d+)m(\d+)$/);
                            if (sfMatch) matchLabel = `Match ${sfMatch[1]}`;
                            else if (fMatch) matchLabel = `Final ${fMatch[2]}`;
                            const redStats = allianceFsm(match.red);
                            const blueStats = allianceFsm(match.blue);
                            return (
                              <tr
                                key={matchKey}
                                onClick={() => setSelectedMatch({ matchKey, match })}
                                style={{
                                  borderBottom: "1px solid var(--border-color)",
                                  cursor: "pointer",
                                  background: idx % 2 === 0 ? "var(--background-pred)" : "transparent",
                                  transition: "background 0.15s",
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(253, 224, 71, 0.06)"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = idx % 2 === 0 ? "var(--background-pred)" : "transparent"; }}
                              >
                                <td style={{ padding: "0.35rem 0.4rem", textAlign: "center", color: "var(--gray-less)", fontSize: "0.75rem" }}>
                                  {hasResult ? "⊙" : ""}
                                </td>
                                <td style={{ padding: "0.35rem 0.5rem", fontWeight: 600, whiteSpace: "nowrap" }}>{matchLabel}</td>
                                {redTeams.map((t, i) => {
                                  const num = t.replace(/^frc/, "");
                                  const highlighted = teamHighlighted(t, matchFilter);
                                  return (
                                    <td key={`r${i}`} style={{
                                      padding: "0.35rem 0.4rem",
                                      color: highlighted ? "#000" : "#ff4d4d",
                                      fontWeight: redWon ? 700 : 400,
                                      textAlign: "center",
                                      background: highlighted ? "var(--yellow-color)" : "transparent",
                                      borderRadius: highlighted ? 3 : 0,
                                    }}>
                                      {num}
                                    </td>
                                  );
                                })}
                                {blueTeams.map((t, i) => {
                                  const num = t.replace(/^frc/, "");
                                  const highlighted = teamHighlighted(t, matchFilter);
                                  return (
                                    <td key={`b${i}`} style={{
                                      padding: "0.35rem 0.4rem",
                                      color: highlighted ? "#000" : "#4d8cff",
                                      fontWeight: blueWon ? 700 : 400,
                                      textAlign: "center",
                                      background: highlighted ? "var(--yellow-color)" : "transparent",
                                      borderRadius: highlighted ? 3 : 0,
                                    }}>
                                      {num}
                                    </td>
                                  );
                                })}
                                <td style={{
                                  padding: "0.35rem 0.5rem",
                                  fontWeight: redWon ? 700 : 400,
                                  textAlign: "center",
                                  background: redWon ? "rgba(255, 77, 77, 0.15)" : "transparent",
                                  color: hasResult ? "var(--foreground)" : "var(--gray-less)",
                                  fontStyle: hasResult ? "normal" : "italic",
                                }}>
                                  <div>{redScore}</div>
                                  <div style={{ fontSize: "0.62rem", fontWeight: 400, color: "var(--gray-less)", fontStyle: "normal", lineHeight: 1.1, marginTop: 1 }}>
                                    {redStats.fsm.toFixed(0)} FSM · {redStats.auto.toFixed(0)} Auto
                                  </div>
                                </td>
                                <td style={{
                                  padding: "0.35rem 0.5rem",
                                  fontWeight: blueWon ? 700 : 400,
                                  textAlign: "center",
                                  background: blueWon ? "rgba(77, 140, 255, 0.15)" : "transparent",
                                  color: hasResult ? "var(--foreground)" : "var(--gray-less)",
                                  fontStyle: hasResult ? "normal" : "italic",
                                }}>
                                  <div>{blueScore}</div>
                                  <div style={{ fontSize: "0.62rem", fontWeight: 400, color: "var(--gray-less)", fontStyle: "normal", lineHeight: 1.1, marginTop: 1 }}>
                                    {blueStats.fsm.toFixed(0)} FSM · {blueStats.auto.toFixed(0)} Auto
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: "1rem", textAlign: "center", color: "var(--gray-less)", background: "var(--background-pred)", borderRadius: 12, border: "2px solid var(--border-color)" }}>
                    No elimination matches found
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "rankings" && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              color: "var(--foreground)",
              borderRadius: 12,
              width: "100%",
              marginTop: "0.25rem",
            }}
          >
            <div
              style={{
                width: "100%",
                overflowX: "auto",
                borderRadius: 12,
                border: "2px solid var(--border-color)",
                boxShadow:
                  "0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  minWidth: "760px",
                }}
              >
                <thead>
                  <tr
                    style={{
                      background: "var(--gray-more)",
                      borderBottom: "2px solid var(--border-color)",
                    }}
                  >
                    {[
                      "Rank",
                      "Team",
                      "Current RP",
                      "Forecast RP",
                      "W/L/T",
                      "Played",
                    ].map(
                      (header) => (
                        <th
                          key={header}
                          style={{
                            padding: "0.9rem",
                            textAlign: "left",
                            fontWeight: "700",
                            fontSize: "0.875rem",
                            letterSpacing: "0.05em",
                            color: "var(--yellow-color)",
                          }}
                        >
                          {header}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {projectedRankings.map((row) => {
                    const currentAvg =
                      row.played > 0 ? row.currentRp / row.played : 0;
                    const forecastAvg =
                      (row as any).forecastAvgRp != null
                        ? Number((row as any).forecastAvgRp)
                        : row.played > 0
                          ? row.forecastRp / row.played
                          : 0;
                    const w = Math.round(Number(row.wins) || 0);
                    const l = Math.round(Number(row.losses) || 0);
                    const t = Math.round(Number(row.ties) || 0);
                    return (
                    <tr
                      key={row.teamKey}
                      style={{
                        borderBottom: "1px solid var(--border-color)",
                        background: "var(--background-pred)",
                      }}
                    >
                      <td style={{ padding: "0.85rem", fontWeight: "700" }}>
                        {row.rank}
                      </td>
                      <td style={{ padding: "0.85rem", fontWeight: "600" }}>
                        <TeamLink teamKey={row.teamKey} year={year} />
                      </td>
                      <td style={{ padding: "0.85rem", fontWeight: "700" }}>
                        {currentAvg.toFixed(2)}
                      </td>
                      <td
                        style={{
                          padding: "0.85rem",
                          fontWeight: "700",
                          color: "var(--yellow-color)",
                        }}
                      >
                        {forecastAvg.toFixed(2)}
                      </td>
                      <td style={{ padding: "0.85rem", fontWeight: 600 }}>
                        {w}-{l}-{t}
                      </td>
                      <td style={{ padding: "0.85rem" }}>
                        {row.played}/{(row as any).scheduled ?? row.played}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {selectedMatch && (
          <MatchDetailModal
            matchKey={selectedMatch.matchKey}
            year={String(year)}
            match={selectedMatch.match}
            onClose={() => setSelectedMatch(null)}
          />
        )}
      </main>
    </div>
  );
}
