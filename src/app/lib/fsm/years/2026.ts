import { levelToPoints } from "../constants";
import type {
  AllianceAttrDef,
  ClimbDef,
  Match,
  PostProcessContext,
  ScoreBreakdown,
  TeamDataBase,
  YearFsmConfig,
} from "../types";

export type TeamData2026 = TeamDataBase & {
  fuel: string;
  auto: string;
  foul: string;
  climb: string;
};

export const INTERACTION_2026 = 1 / 4000;

/** 2026 tower climb level tokens → point values (substring match via levelToPoints). */
export const TOWER_LEVEL_POINTS_2026: Record<string, number> = {
  traverse: 15,
  high: 10,
  mid: 6,
  low: 4,
  park: 2,
  climb: 8,
};

function fuelFromBreakdown(sb: ScoreBreakdown): number {
  return (
    Number(sb.hubScore?.totalCount) ||
    Number(sb.hubScore?.teleopCount) ||
    Number(sb.hubScore?.totalPoints) ||
    Number(sb.hubScore?.teleopPoints) ||
    0
  );
}

function autoFromBreakdown(sb: ScoreBreakdown): number {
  return (
    Number(sb.totalAutoPoints) ||
    Number(sb.hubScore?.autoPoints) ||
    Number(sb.hubScore?.autoCount) ||
    0
  );
}

function robotTowerPoints(
  sb: ScoreBreakdown,
  robotIndex: 0 | 1 | 2
): number {
  const n = robotIndex + 1;
  const autoPts = levelToPoints(sb[`autoTowerRobot${n}`], TOWER_LEVEL_POINTS_2026);
  const endPts = levelToPoints(
    sb[`endGameTowerRobot${n}`],
    TOWER_LEVEL_POINTS_2026
  );
  return autoPts + endPts;
}

/** Scale per-robot raw points to match alliance API tower total when present. */
function scaledRobotTowerPoints(
  sb: ScoreBreakdown,
  robotIndex: 0 | 1 | 2
): number {
  const raw = [0, 1, 2].map((i) =>
    robotTowerPoints(sb, i as 0 | 1 | 2)
  ) as [number, number, number];
  const rawTotal = raw[0] + raw[1] + raw[2];
  const apiTotal =
    Number(sb.totalTowerPoints) ||
    Number(sb.autoTowerPoints) + Number(sb.endGameTowerPoints) ||
    Number(sb.endGameTowerPoints) ||
    Number(sb.autoTowerPoints) ||
    0;

  if (apiTotal <= 0) return 0;
  if (rawTotal > 0) return raw[robotIndex] * (apiTotal / rawTotal);
  return apiTotal / 3;
}

const attributes: AllianceAttrDef[] = [
  { key: "fuel", fromBreakdown: (sb) => fuelFromBreakdown(sb) },
  { key: "auto", fromBreakdown: (sb) => autoFromBreakdown(sb) },
  { key: "foul", fromBreakdown: (sb) => Number(sb.foulPoints) || 0 },
];

const climb: ClimbDef = {
  key: "climb",
  robotPoints: (sb, robotIndex) => scaledRobotTowerPoints(sb, robotIndex),
};

function emptyTeam(key: string, rank = 0): TeamData2026 {
  return {
    key,
    rank,
    fsm: "0.00",
    fuel: "0.00",
    auto: "0.00",
    foul: "0.00",
    climb: "0.00",
  };
}

function adjustFSMOutliers(
  matches: Match[],
  fsms: { [key: string]: number }
) {
  const perTeamContribs: { [key: string]: number[] } = {};

  for (const match of matches) {
    if (!match.score_breakdown) continue;
    const redTeams = match.alliances.red.team_keys;
    const blueTeams = match.alliances.blue.team_keys;
    if (redTeams.length === 0 || blueTeams.length === 0) continue;

    const redPerTeam =
      (Number(match.alliances.red.score) || 0) / redTeams.length;
    const bluePerTeam =
      (Number(match.alliances.blue.score) || 0) / blueTeams.length;

    for (const team of redTeams) {
      (perTeamContribs[team] ??= []).push(redPerTeam);
    }
    for (const team of blueTeams) {
      (perTeamContribs[team] ??= []).push(bluePerTeam);
    }
  }

  for (const team in perTeamContribs) {
    const contribs = perTeamContribs[team];
    if (contribs.length < 3) continue;

    const sorted = contribs.slice().sort((a, b) => a - b);
    const dropCount = sorted.length >= 5 ? 2 : 1;

    let totalAll = 0;
    let totalSqAll = 0;
    for (const v of contribs) {
      totalAll += v;
      totalSqAll += v * v;
    }
    const nAll = contribs.length;
    const avgAll = totalAll / nAll;
    const varAll =
      nAll > 1 ? Math.max(0, totalSqAll / nAll - avgAll * avgAll) : 0;

    let totalTrimmed = 0;
    for (let i = dropCount; i < sorted.length; i++) totalTrimmed += sorted[i];
    const remaining = sorted.length - dropCount;
    if (remaining <= 0) continue;
    const avgTrimmed = totalTrimmed / remaining;
    if (avgAll <= 0 || avgTrimmed <= avgAll) continue;

    fsms[team] *=
      (avgTrimmed / avgAll) *
      (1 + 0.5 * (varAll / (avgAll * avgAll + 1e-6)));
  }
}

function postProcess(ctx: PostProcessContext) {
  adjustFSMOutliers(ctx.matches, ctx.fsms);

  const fuel = ctx.attrs.fuel ?? {};
  const foul = ctx.attrs.foul ?? {};
  for (const team of Object.keys(ctx.fsms)) {
    const blended =
      0.8 *
        ((fuel[team] || 0) + (ctx.climb[team] || 0) - (foul[team] || 0)) +
      0.2 * (ctx.fsms[team] || 0);
    ctx.fsms[team] = blended;
  }
}

export const year2026: YearFsmConfig = {
  year: 2026,
  attributes,
  climb,
  interaction: INTERACTION_2026,
  fsmDeltaMode: "modRootPerTeam",
  postProcess,
  predictScores: (own, opp) => [
    Math.max(0, own + opp * INTERACTION_2026 * own),
    Math.max(0, opp + own * INTERACTION_2026 * opp),
  ],
  emptyTeam,
};
