import { TeamDataType } from "./fsm";

export interface UnluckyMetric {
  [teamKey: string]: number;
}

export interface RankUnluckyMetric {
  [teamKey: string]: number;
}

export interface SOSMetric {
  [teamKey: string]: number;
}

export interface SOSZScoreMetric {
  [teamKey: string]: number;
}

export interface RankUnluckyZScoreMetric {
  [teamKey: string]: number;
}

export interface AllianceDraftUnluckyMetric {
  [teamKey: string]: number;
}

export interface EventMetrics {
  unlucky: UnluckyMetric;
  rankUnlucky: RankUnluckyMetric;
  sos: SOSMetric;
  sosZScore: SOSZScoreMetric;
  rankUnluckyZScore: RankUnluckyZScoreMetric;
  allianceDraftUnlucky: AllianceDraftUnluckyMetric;
}

interface MatchData {
  alliances?: {
    red?: { team_keys?: string[]; score?: number };
    blue?: { team_keys?: string[]; score?: number };
  };
}

interface AllianceData {
  picks?: string[];
  declines?: string[];
}

export async function calculateEventUnluckiness(
  teams: TeamDataType[],
  matches: MatchData[],
  alliances?: AllianceData[]
): Promise<EventMetrics> {
  const unluckyMap: UnluckyMetric = {};
  const rankUnluckyMap: RankUnluckyMetric = {};
  const sosMap: SOSMetric = {};
  const sosZScoreMap: SOSZScoreMetric = {};
  const rankUnluckyZScoreMap: RankUnluckyZScoreMetric = {};
  const allianceDraftUnluckyMap: AllianceDraftUnluckyMetric = {};

  if (teams.length === 0) {
    return {
      unlucky: unluckyMap,
      rankUnlucky: rankUnluckyMap,
      sos: sosMap,
      sosZScore: sosZScoreMap,
      rankUnluckyZScore: rankUnluckyZScoreMap,
      allianceDraftUnlucky: allianceDraftUnluckyMap,
    };
  }

  const fsmMap: { [key: string]: number } = {};
  teams.forEach((team) => {
    fsmMap[team.key] = Number(team.fsm);
  });

  const sosSumMap: { [key: string]: number } = {};
  const opponentCounts: { [key: string]: number } = {};

  if (matches.length > 0) {
    for (const match of matches) {
      if (!match.alliances) continue;

      const redTeams = match.alliances.red?.team_keys || [];
      const blueTeams = match.alliances.blue?.team_keys || [];

      const redFsmSum = redTeams.reduce(
        (sum, key) => sum + (fsmMap[key] || 0),
        0
      );
      const blueFsmSum = blueTeams.reduce(
        (sum, key) => sum + (fsmMap[key] || 0),
        0
      );
      const redAvgFsm = redTeams.length > 0 ? redFsmSum / redTeams.length : 0;
      const blueAvgFsm =
        blueTeams.length > 0 ? blueFsmSum / blueTeams.length : 0;

      for (const team of redTeams) {
        if (!sosSumMap[team]) {
          sosSumMap[team] = 0;
          opponentCounts[team] = 0;
        }
        const otherRedTeams = redTeams.filter((t) => t !== team);
        const otherRedFsmSum = otherRedTeams.reduce(
          (sum, key) => sum + (fsmMap[key] || 0),
          0
        );
        const otherRedAvgFsm =
          otherRedTeams.length > 0 ? otherRedFsmSum / otherRedTeams.length : 0;

        const diff = blueAvgFsm - otherRedAvgFsm;
        const diffSquared = Math.pow(diff, 2);
        const sosContribution = Math.sign(diff) * diffSquared;
        sosSumMap[team] += sosContribution;
        opponentCounts[team]++;
      }

      for (const team of blueTeams) {
        if (!sosSumMap[team]) {
          sosSumMap[team] = 0;
          opponentCounts[team] = 0;
        }
        const otherBlueTeams = blueTeams.filter((t) => t !== team);
        const otherBlueFsmSum = otherBlueTeams.reduce(
          (sum, key) => sum + (fsmMap[key] || 0),
          0
        );
        const otherBlueAvgFsm =
          otherBlueTeams.length > 0
            ? otherBlueFsmSum / otherBlueTeams.length
            : 0;

        const diff = redAvgFsm - otherBlueAvgFsm;
        const diffSquared = Math.pow(diff, 2);
        const sosContribution = Math.sign(diff) * diffSquared;
        sosSumMap[team] += sosContribution;
        opponentCounts[team]++;
      }
    }
  } else {
    teams.forEach((team) => {
      sosSumMap[team.key] = 0;
      opponentCounts[team.key] = 0;
    });
  }

  const avgSosMap: { [key: string]: number } = {};
  for (const teamKey in sosSumMap) {
    if (opponentCounts[teamKey] > 0) {
      const avgSos = sosSumMap[teamKey] / opponentCounts[teamKey];
      avgSosMap[teamKey] = avgSos;
      sosMap[teamKey] = avgSos;
    } else {
      avgSosMap[teamKey] = 0;
      sosMap[teamKey] = 0;
    }
  }

  teams.forEach((team) => {
    if (!sosMap[team.key]) {
      sosMap[team.key] = 0;
    }
  });

  const teamsWithFsm = teams
    .filter((t) => Number(t.fsm) > 0)
    .map((t) => ({
      key: t.key,
      fsm: Number(t.fsm),
      rank: t.rank,
    }))
    .sort((a, b) => b.fsm - a.fsm);

  const expectedRankMap: { [key: string]: number } = {};
  teamsWithFsm.forEach((team, idx) => {
    expectedRankMap[team.key] = idx + 1;
  });

  const rankDiffs: number[] = [];
  const sosValues: number[] = [];
  const fsms: number[] = [];

  for (const team of teams) {
    const actualRank = team.rank;
    const expectedRank = expectedRankMap[team.key];
    if (actualRank > 0 && expectedRank > 0) {
      const rankDiff = actualRank - expectedRank;
      if (rankDiff > 0) {
        rankDiffs.push(rankDiff);
      }
      const sos = avgSosMap[team.key] || 0;
      if (sos !== 0) {
        sosValues.push(Math.abs(sos));
      }
    }
    const fsm = Number(team.fsm);
    if (fsm > 0) {
      fsms.push(fsm);
    }
  }

  const maxRankDiff = rankDiffs.length > 0 ? Math.max(...rankDiffs) : 1;
  const minFsm = fsms.length > 0 ? Math.min(...fsms) : 0;
  const maxFsm = fsms.length > 0 ? Math.max(...fsms) : 1;
  const fsmRange = maxFsm - minFsm;

  for (const team of teams) {
    const teamKey = team.key;
    const actualRank = team.rank;
    const expectedRank = expectedRankMap[teamKey];

    if (actualRank > 0 && expectedRank > 0) {
      const rankDiff = actualRank - expectedRank;

      if (rankDiff > 0) {
        const teamFsm = Number(team.fsm) || 0;

        const normalizedFsm =
          fsmRange > 0 ? (teamFsm - minFsm) / fsmRange : 0.5;

        const normalizedRankDiff = rankDiff / maxRankDiff;
        const rankDiffPower = Math.pow(normalizedRankDiff, 3.0);

        let fsmWeight: number;
        if (normalizedFsm < 0.5) {
          fsmWeight = 0.4 + normalizedFsm * 4.2;
        } else {
          fsmWeight = 2.5 - (normalizedFsm - 0.5) * 1.4;
        }

        const fsmPercentile = normalizedFsm;

        let rankWeight: number;
        if (fsmPercentile >= 0.5) {
          rankWeight = 1.0;
        } else {
          const blendFactor = fsmPercentile / 0.3;
          const smoothBlend = Math.pow(blendFactor, 2.5);
          rankWeight = 0.1 + smoothBlend * 0.9;
        }

        const baseUnlucky = rankDiffPower * 100;
        const fsmWeightedUnlucky = baseUnlucky * fsmWeight;
        const rankWeightedUnlucky = fsmWeightedUnlucky * rankWeight;

        rankUnluckyMap[teamKey] = rankWeightedUnlucky;
      } else {
        rankUnluckyMap[teamKey] = 0;
      }
    } else {
      rankUnluckyMap[teamKey] = 0;
    }
  }

  teams.forEach((team) => {
    if (!rankUnluckyMap[team.key]) {
      rankUnluckyMap[team.key] = 0;
    }
  });

  const allSosContributions: number[] = [];
  const teamSosContributions: { [teamKey: string]: number[] } = {};

  teams.forEach((team) => {
    teamSosContributions[team.key] = [];
  });

  if (matches.length > 0) {
    for (const match of matches) {
      if (!match.alliances) continue;

      const redTeams = match.alliances.red?.team_keys || [];
      const blueTeams = match.alliances.blue?.team_keys || [];

      const redFsmSum = redTeams.reduce(
        (sum, key) => sum + (fsmMap[key] || 0),
        0
      );
      const blueFsmSum = blueTeams.reduce(
        (sum, key) => sum + (fsmMap[key] || 0),
        0
      );
      const redAvgFsm = redTeams.length > 0 ? redFsmSum / redTeams.length : 0;
      const blueAvgFsm =
        blueTeams.length > 0 ? blueFsmSum / blueTeams.length : 0;

      for (const team of redTeams) {
        const otherRedTeams = redTeams.filter((t) => t !== team);
        const otherRedFsmSum = otherRedTeams.reduce(
          (sum, key) => sum + (fsmMap[key] || 0),
          0
        );
        const otherRedAvgFsm =
          otherRedTeams.length > 0 ? otherRedFsmSum / otherRedTeams.length : 0;
        const diff = blueAvgFsm - otherRedAvgFsm;
        const sosContribution = Math.sign(diff) * Math.pow(diff, 2);
        allSosContributions.push(sosContribution);
        teamSosContributions[team].push(sosContribution);
      }

      for (const team of blueTeams) {
        const otherBlueTeams = blueTeams.filter((t) => t !== team);
        const otherBlueFsmSum = otherBlueTeams.reduce(
          (sum, key) => sum + (fsmMap[key] || 0),
          0
        );
        const otherBlueAvgFsm =
          otherBlueTeams.length > 0
            ? otherBlueFsmSum / otherBlueTeams.length
            : 0;
        const diff = redAvgFsm - otherBlueAvgFsm;
        const sosContribution = Math.sign(diff) * Math.pow(diff, 2);
        allSosContributions.push(sosContribution);
        teamSosContributions[team].push(sosContribution);
      }
    }
  }

  const sosContributionMean =
    allSosContributions.length > 0
      ? allSosContributions.reduce((sum, val) => sum + val, 0) /
        allSosContributions.length
      : 0;
  const sosContributionVariance =
    allSosContributions.length > 0
      ? allSosContributions.reduce(
          (sum, val) => sum + Math.pow(val - sosContributionMean, 2),
          0
        ) / allSosContributions.length
      : 0;
  const sosContributionStdDev = Math.sqrt(sosContributionVariance);

  teams.forEach((team) => {
    const numMatches = opponentCounts[team.key] || 0;
    const actualSos = sosMap[team.key] || 0;

    if (numMatches > 0 && sosContributionStdDev > 0) {
      const expectedSos = sosContributionMean;
      const sosStdDevOfAverage = sosContributionStdDev / Math.sqrt(numMatches);
      const sosZScore =
        sosStdDevOfAverage > 0
          ? (actualSos - expectedSos) / sosStdDevOfAverage
          : 0;
      sosZScoreMap[team.key] = sosZScore;
    } else {
      sosZScoreMap[team.key] = 0;
    }
  });

  if (alliances && alliances.length > 0 && fsmRange > 0) {
    const captainFsms: number[] = [];
    
    for (const alliance of alliances) {
      if (!alliance.picks || alliance.picks.length < 2) continue;
      const captain = alliance.picks[0];
      if (captain && fsmMap[captain]) {
        captainFsms.push(fsmMap[captain]);
      }
    }
    
    if (captainFsms.length > 0) {
      const avgCaptainFsm = captainFsms.reduce((sum, fsm) => sum + fsm, 0) / captainFsms.length;
      
      for (const alliance of alliances) {
        if (!alliance.picks || alliance.picks.length < 2) continue;
        const captain = alliance.picks[0];
        const firstPick = alliance.picks[1];
        if (captain && firstPick && fsmMap[captain] && fsmMap[firstPick]) {
          const captainFsm = fsmMap[captain];
          const firstPickFsm = fsmMap[firstPick];
          
          if (captainFsm < avgCaptainFsm) {
            const fsmDeficit = avgCaptainFsm - captainFsm;
            const normalizedFirstPickFsm = (firstPickFsm - minFsm) / fsmRange;
            const firstPickWeight = 0.5 + (normalizedFirstPickFsm * 1.5);
            const draftUnlucky = Math.max(0, fsmDeficit * firstPickWeight);
            allianceDraftUnluckyMap[firstPick] = (allianceDraftUnluckyMap[firstPick] || 0) + draftUnlucky;
          }
        }
      }
    }
  }

  teams.forEach((team) => {
    if (!allianceDraftUnluckyMap[team.key]) {
      allianceDraftUnluckyMap[team.key] = 0;
    }
  });

  const allRankUnluckyValues: number[] = [];
  teams.forEach((team) => {
    const rankUnlucky = rankUnluckyMap[team.key] || 0;
    if (rankUnlucky > 0) {
      allRankUnluckyValues.push(rankUnlucky);
    }
  });

  const rankUnluckyMean =
    allRankUnluckyValues.length > 0
      ? allRankUnluckyValues.reduce((sum, val) => sum + val, 0) /
        allRankUnluckyValues.length
      : 0;
  const rankUnluckyVariance =
    allRankUnluckyValues.length > 0
      ? allRankUnluckyValues.reduce(
          (sum, val) => sum + Math.pow(val - rankUnluckyMean, 2),
          0
        ) / allRankUnluckyValues.length
      : 0;
  const rankUnluckyStdDev = Math.sqrt(rankUnluckyVariance);

  const allDraftUnluckyValues: number[] = [];
  teams.forEach((team) => {
    const draftUnlucky = allianceDraftUnluckyMap[team.key] || 0;
    if (draftUnlucky > 0) {
      allDraftUnluckyValues.push(draftUnlucky);
    }
  });

  const draftUnluckyMean = allDraftUnluckyValues.length > 0
    ? allDraftUnluckyValues.reduce((sum, val) => sum + val, 0) / allDraftUnluckyValues.length
    : 0;
  const draftUnluckyVariance = allDraftUnluckyValues.length > 0
    ? allDraftUnluckyValues.reduce((sum, val) => sum + Math.pow(val - draftUnluckyMean, 2), 0) / allDraftUnluckyValues.length
    : 0;
  const draftUnluckyStdDev = Math.sqrt(draftUnluckyVariance);

  teams.forEach((team) => {
    const rankUnlucky = rankUnluckyMap[team.key] || 0;
    const rankUnluckyZScore =
      rankUnluckyStdDev > 0
        ? (rankUnlucky - rankUnluckyMean) / rankUnluckyStdDev
        : 0;
    rankUnluckyZScoreMap[team.key] = rankUnluckyZScore;

    const draftUnlucky = allianceDraftUnluckyMap[team.key] || 0;
    const draftUnluckyZScore = draftUnluckyStdDev > 0
      ? (draftUnlucky - draftUnluckyMean) / draftUnluckyStdDev
      : 0;

    const sosZScore = sosZScoreMap[team.key] || 0;
    const sosZScoreSquared =
      Math.sign(sosZScore) * Math.pow(Math.abs(sosZScore), 2);
    unluckyMap[team.key] = sosZScoreSquared * 0.7 + rankUnluckyZScore * 0.25 + draftUnluckyZScore * 0.05;
  });

  return {
    unlucky: unluckyMap,
    rankUnlucky: rankUnluckyMap,
    sos: sosMap,
    sosZScore: sosZScoreMap,
    rankUnluckyZScore: rankUnluckyZScoreMap,
    allianceDraftUnlucky: allianceDraftUnluckyMap,
  };
}
