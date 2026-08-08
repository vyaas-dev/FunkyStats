import {
  ATTRIBUTE_MULT,
  ATTRIBUTE_REDUC,
  DECAY_FAC,
  ELIM_MULT_FAC,
  ELIM_REDUC_FAC,
  FSM_DOWN_FAC,
  FSM_UP_FAC,
  MAX_ITERS,
  elimModRoot,
  modRoot,
  rms,
} from "./constants";
import type {
  ClimbDef,
  FsmDeltaMode,
  Match,
  MatchFeatures,
  YearFsmConfig,
} from "./types";

function updateDict(
  dict: { [key: string]: number },
  teams: string[],
  value: number,
  decay: number,
  fsmDeltaMode: FsmDeltaMode,
  isAttribute: boolean
) {
  const n = teams.length;
  if (n === 0) return;

  let dictpred = 0;
  const init = value / n;
  for (let i = 0; i < n; i++) {
    const team = teams[i];
    let cur = dict[team];
    if (cur === undefined) {
      cur = init;
      dict[team] = cur;
    }
    dictpred += cur;
  }

  let delta: number;
  if (isAttribute) {
    delta =
      fsmDeltaMode === "modRootPerTeam"
        ? modRoot((value - dictpred) / n)
        : (value - dictpred) / n;
  } else {
    delta =
      fsmDeltaMode === "modRootPerTeam"
        ? modRoot((value - dictpred) / n)
        : modRoot(value - dictpred) / n;
  }

  const fac =
    (delta > 0
      ? (isAttribute ? ATTRIBUTE_MULT : 1) * FSM_UP_FAC
      : (isAttribute ? ATTRIBUTE_REDUC : 1) * FSM_DOWN_FAC) * decay;

  for (let i = 0; i < n; i++) {
    dict[teams[i]] += delta * fac;
  }
}

function precomputeMatchFeatures(
  matches: Match[],
  config: YearFsmConfig
): MatchFeatures[] {
  const features: MatchFeatures[] = [];
  const n = matches.length;
  const attrs = config.attributes;

  for (let j = 0; j < n; j++) {
    const match = matches[j];
    if (!match.score_breakdown) continue;
    const redSb = match.score_breakdown.red;
    const blueSb = match.score_breakdown.blue;
    if (!redSb || !blueSb) continue;

    const kz = n - j;
    const redAttrs = new Array(attrs.length);
    const blueAttrs = new Array(attrs.length);
    for (let a = 0; a < attrs.length; a++) {
      redAttrs[a] = attrs[a].fromBreakdown(redSb, "red", match);
      blueAttrs[a] = attrs[a].fromBreakdown(blueSb, "blue", match);
    }

    features.push({
      redTeams: match.alliances.red.team_keys,
      blueTeams: match.alliances.blue.team_keys,
      redScore: Number(match.alliances.red.score) || 0,
      blueScore: Number(match.alliances.blue.score) || 0,
      redAttrs,
      blueAttrs,
      replays: kz < 25 ? 3 : kz < 45 ? 2 : 1,
    });
  }

  return features;
}

export function calculateFSM(matches: Match[], config: YearFsmConfig) {
  const FSMs: { [key: string]: number } = {};
  const attrs: { [attrKey: string]: { [teamKey: string]: number } } = {};
  for (const attr of config.attributes) {
    attrs[attr.key] = {};
  }

  const features = precomputeMatchFeatures(matches, config);
  const interaction = config.interaction;
  const mode = config.fsmDeltaMode;
  let decay = 1;

  for (let i = 0; i < MAX_ITERS; i++) {
    if (i > 0) decay *= DECAY_FAC;

    for (let f = 0; f < features.length; f++) {
      const m = features[f];
      for (let z = 0; z < m.replays; z++) {
        let redAllianceFSM = 0;
        let blueAllianceFSM = 0;
        if (interaction !== 0) {
          for (let t = 0; t < m.redTeams.length; t++) {
            redAllianceFSM += FSMs[m.redTeams[t]] || 0;
          }
          for (let t = 0; t < m.blueTeams.length; t++) {
            blueAllianceFSM += FSMs[m.blueTeams[t]] || 0;
          }
        }

        const redTarget =
          interaction === 0
            ? m.redScore
            : m.redScore + blueAllianceFSM * interaction * redAllianceFSM;
        const blueTarget =
          interaction === 0
            ? m.blueScore
            : m.blueScore + redAllianceFSM * interaction * blueAllianceFSM;

        updateDict(FSMs, m.redTeams, redTarget, decay, mode, false);
        updateDict(FSMs, m.blueTeams, blueTarget, decay, mode, false);

        for (let a = 0; a < config.attributes.length; a++) {
          const key = config.attributes[a].key;
          updateDict(attrs[key], m.redTeams, m.redAttrs[a], decay, mode, true);
          updateDict(attrs[key], m.blueTeams, m.blueAttrs[a], decay, mode, true);
        }
      }
    }
  }

  return { FSMs, attrs };
}

/** Per-robot TBA climb points by alliance slot → RMS across matches. */
export function computeClimbRms(
  matches: Match[],
  climb: ClimbDef
): { [teamKey: string]: number } {
  const samples: { [teamKey: string]: number[] } = {};

  const push = (team: string | undefined, pts: number) => {
    if (!team) return;
    (samples[team] ??= []).push(pts);
  };

  for (const match of matches) {
    if (!match.score_breakdown) continue;
    const redSb = match.score_breakdown.red;
    const blueSb = match.score_breakdown.blue;
    if (!redSb || !blueSb) continue;

    const redTeams = match.alliances.red.team_keys;
    const blueTeams = match.alliances.blue.team_keys;
    for (let i = 0; i < 3; i++) {
      const idx = i as 0 | 1 | 2;
      push(redTeams[i], climb.robotPoints(redSb, idx));
      push(blueTeams[i], climb.robotPoints(blueSb, idx));
    }
  }

  const out: { [teamKey: string]: number } = {};
  for (const team in samples) {
    out[team] = rms(samples[team]);
  }
  return out;
}

export function elimAdjustFSM(
  matches: Match[],
  fsms: { [key: string]: number },
  interaction: number
) {
  for (const match of matches) {
    if (!match.score_breakdown) continue;

    const redTeams = match.alliances.red.team_keys;
    const blueTeams = match.alliances.blue.team_keys;
    const redScore = Number(match.alliances.red.score) || 0;
    const blueScore = Number(match.alliances.blue.score) || 0;

    let redAllianceFSM = 0;
    let blueAllianceFSM = 0;
    if (interaction !== 0) {
      for (let t = 0; t < redTeams.length; t++) {
        redAllianceFSM += fsms[redTeams[t]] || 0;
      }
      for (let t = 0; t < blueTeams.length; t++) {
        blueAllianceFSM += fsms[blueTeams[t]] || 0;
      }
    }

    const adjustedRed =
      interaction === 0
        ? redScore
        : redScore + blueAllianceFSM * interaction * redAllianceFSM;
    const adjustedBlue =
      interaction === 0
        ? blueScore
        : blueScore + redAllianceFSM * interaction * blueAllianceFSM;

    const redDelta = elimModRoot((adjustedRed - adjustedBlue) / 3);
    const blueDelta = elimModRoot((adjustedBlue - adjustedRed) / 3);
    const redFac = redDelta > 0 ? ELIM_MULT_FAC : ELIM_REDUC_FAC;
    const blueFac = blueDelta > 0 ? ELIM_MULT_FAC : ELIM_REDUC_FAC;

    for (let t = 0; t < redTeams.length; t++) {
      fsms[redTeams[t]] += redDelta * redFac;
    }
    for (let t = 0; t < blueTeams.length; t++) {
      fsms[blueTeams[t]] += blueDelta * blueFac;
    }
  }
}

export function getMatchPredictionsForConfig(
  matches: Match[],
  FSMs: { [key: string]: number },
  config: YearFsmConfig
) {
  if (matches.length === 0) {
    throw new Error("No matches for predictions");
  }

  const predictions: {
    [key: string]: {
      preds: string[];
      red: string[];
      blue: string[];
      result: number[];
    };
  } = {};

  for (const match of matches) {
    const redTeams = match.alliances.red.team_keys;
    const blueTeams = match.alliances.blue.team_keys;

    let redScore = 0;
    let blueScore = 0;
    for (let t = 0; t < redTeams.length; t++) redScore += FSMs[redTeams[t]] || 0;
    for (let t = 0; t < blueTeams.length; t++)
      blueScore += FSMs[blueTeams[t]] || 0;

    const [predRed, predBlue] = config.predictScores(redScore, blueScore);
    predictions[match.key] = {
      preds: [predRed.toFixed(0), predBlue.toFixed(0)],
      red: redTeams,
      blue: blueTeams,
      result: [match.alliances.red.score, match.alliances.blue.score],
    };
  }
  return predictions;
}
