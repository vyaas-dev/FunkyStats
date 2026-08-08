import { levelToPoints } from "../constants";
import type {
  AllianceAttrDef,
  ClimbDef,
  ScoreBreakdown,
  TeamDataBase,
  YearFsmConfig,
} from "../types";

export type TeamData2025 = TeamDataBase & {
  algae: string;
  coral: string;
  auto: string;
  foul: string;
  climb: string;
};

/** 2025 barge/cage endgame levels → point values. */
export const CAGE_LEVEL_POINTS_2025: Record<string, number> = {
  Parked: 2,
  DeepCage: 12,
  ShallowCage: 6,
};

function countReefRow(
  row: Record<string, boolean | number> | undefined
): number {
  if (!row) return 0;
  let count = 0;
  for (const key in row) {
    if (row[key]) count += Number(row[key]) || 0;
  }
  return count;
}

function coralCount(sb: ScoreBreakdown): number {
  const reef = sb.teleopReef;
  if (!reef) return 0;
  return (
    countReefRow(reef.botRow) +
    countReefRow(reef.midRow) +
    countReefRow(reef.topRow) +
    (Number(reef.trough) || 0)
  );
}

const attributes: AllianceAttrDef[] = [
  {
    key: "algae",
    fromBreakdown: (sb) =>
      (Number(sb.netAlgaeCount) || 0) + (Number(sb.wallAlgaeCount) || 0),
  },
  {
    key: "coral",
    fromBreakdown: (sb) => coralCount(sb),
  },
  {
    key: "auto",
    fromBreakdown: (sb) => Number(sb.autoCoralCount) || 0,
  },
  {
    key: "foul",
    // Opponent foul count (legacy 2025 behavior)
    fromBreakdown: (_sb, alliance, match) => {
      const opp = alliance === "red" ? "blue" : "red";
      const oppSb = match.score_breakdown?.[opp];
      return Number(oppSb?.foulCount) || 0;
    },
  },
];

const climb: ClimbDef = {
  key: "climb",
  robotPoints: (sb, robotIndex) =>
    levelToPoints(sb[`endGameRobot${robotIndex + 1}`], CAGE_LEVEL_POINTS_2025),
};

function emptyTeam(key: string, rank = 0): TeamData2025 {
  return {
    key,
    rank,
    fsm: "0.00",
    algae: "0.00",
    coral: "0.00",
    auto: "0.00",
    foul: "0.00",
    climb: "0.00",
  };
}

export const year2025: YearFsmConfig = {
  year: 2025,
  attributes,
  climb,
  interaction: 0,
  fsmDeltaMode: "legacyRoot",
  predictScores: (own, opp) => [own, opp],
  emptyTeam,
};
