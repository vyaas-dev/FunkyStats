export type ScoreBreakdown = Record<string, unknown> & {
  hubScore?: {
    totalCount?: number;
    teleopCount?: number;
    totalPoints?: number;
    teleopPoints?: number;
    autoPoints?: number;
    autoCount?: number;
  };
  totalTowerPoints?: number;
  endGameTowerPoints?: number;
  autoTowerPoints?: number;
  foulPoints?: number;
  foulCount?: number;
  totalAutoPoints?: number;
  netAlgaeCount?: number;
  wallAlgaeCount?: number;
  autoCoralCount?: number;
  teleopReef?: {
    botRow?: Record<string, boolean | number>;
    midRow?: Record<string, boolean | number>;
    topRow?: Record<string, boolean | number>;
    trough?: number;
  };
};

export type Match = {
  key: string;
  comp_level: string;
  match_number?: number;
  set_number?: number;
  alliances: {
    red: { team_keys: string[]; score: number };
    blue: { team_keys: string[]; score: number };
  };
  score_breakdown?: {
    red?: ScoreBreakdown;
    blue?: ScoreBreakdown;
  } | null;
};

export type AttendingTeam = {
  key: string;
  nickname?: string;
  team_number?: number;
};
export type RankingEntry = { team_key: string; rank: number };

export type TeamDataBase = {
  key: string;
  rank: number;
  fsm: string;
  nickname?: string;
};

/** Year-shaped team row: base fields plus attribute/climb string values. */
export type TeamData = TeamDataBase & {
  [attr: string]: string | number;
};

export type AllianceAttrDef = {
  key: string;
  fromBreakdown: (
    sb: ScoreBreakdown,
    alliance: "red" | "blue",
    match: Match
  ) => number;
};

/**
 * At most one climb field per year. Points come from TBA per-robot level fields
 * (alliance slot order = team_keys index). Aggregated as RMS of point values.
 */
export type ClimbDef = {
  key: string;
  robotPoints: (sb: ScoreBreakdown, robotIndex: 0 | 1 | 2) => number;
};

export type FsmDeltaMode = "legacyRoot" | "modRootPerTeam";

export type PostProcessContext = {
  matches: Match[];
  fsms: { [key: string]: number };
  attrs: { [attrKey: string]: { [teamKey: string]: number } };
  climb: { [teamKey: string]: number };
};

export type YearFsmConfig = {
  year: number;
  attributes: AllianceAttrDef[];
  climb?: ClimbDef;
  interaction: number;
  fsmDeltaMode: FsmDeltaMode;
  postProcess?: (ctx: PostProcessContext) => void;
  predictScores: (ownSum: number, oppSum: number) => [number, number];
  emptyTeam: (key: string, rank?: number) => TeamData;
};

export type MatchFeatures = {
  redTeams: string[];
  blueTeams: string[];
  redScore: number;
  blueScore: number;
  /** Parallel to config.attributes */
  redAttrs: number[];
  blueAttrs: number[];
  replays: number;
};
