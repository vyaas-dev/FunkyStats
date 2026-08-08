export type {
  TeamData,
  TeamDataBase,
  Match,
  YearFsmConfig,
  AllianceAttrDef,
  ClimbDef,
} from "./types";

/** Compat alias for older imports. */
export type { TeamData as TeamDataType } from "./types";

export { levelToPoints, rms } from "./constants";
export { resolveYearConfig, getEventTeams, getMatchPredictions, seedEventTeamsCache } from "./getEventTeams";
export {
  getAttendingTeams,
  getEventQualMatches,
  getEventAlliances,
  getNexusMatchSchedule,
  fetchAllMatches,
} from "./tba";

export { year2025 } from "./years/2025";
export { year2026, INTERACTION_2026 } from "./years/2026";
