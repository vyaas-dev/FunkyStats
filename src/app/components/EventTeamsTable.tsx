"use client";

import { TeamDataType } from "../lib/fsm";
import SortableTable from "./SortableTable";
import TeamLink from "./TeamLink";

export default function EventTeamsTable({ 
  teams, 
  year,
  sosZScoreMetrics,
  unluckyMetrics,
}: { 
  teams: TeamDataType[]; 
  year?: string | number;
  sosZScoreMetrics?: { [teamKey: string]: number };
  unluckyMetrics?: { [teamKey: string]: number };
}) {
  const getZScoreColor = (zScore: number) => {
    if (zScore >= 2.0) return "#ef4444";
    if (zScore >= 1.5) return "#f97316";
    if (zScore >= 1.0) return "#eab308";
    if (zScore >= 0.5) return "#fbbf24";
    if (zScore <= -2.0) return "#22c55e";
    if (zScore <= -1.5) return "#84cc16";
    if (zScore <= -1.0) return "#a3e635";
    if (zScore <= -0.5) return "#d9f99d";
    return "var(--foreground)";
  };

  const getUnluckyColor = (value: number, max: number, min: number) => {
    if (value === 0 && max === 0 && min === 0) return "var(--foreground)";
    const range = max - min;
    if (range === 0) return "var(--foreground)";
    const percentage = ((value - min) / range) * 100;
    if (percentage >= 75) return "#ef4444";
    if (percentage >= 50) return "#f97316";
    if (percentage >= 25) return "#eab308";
    if (percentage <= 25) return "#22c55e";
    return "var(--foreground)";
  };

  const maxUnlucky = unluckyMetrics 
    ? Math.max(...Object.values(unluckyMetrics), 0) 
    : 0;
  const minUnlucky = unluckyMetrics 
    ? Math.min(...Object.values(unluckyMetrics), 0) 
    : 0;

  const columns = [
    {
      key: "key",
      label: "Team",
      sortable: false,
      render: (team: TeamDataType) => <TeamLink teamKey={team.key} year={year} />,
    },
    { key: "rank", label: "Rank", sortable: true, getValue: (team: TeamDataType) => team.rank },
    { key: "fsm", label: "FSM", sortable: true, getValue: (team: TeamDataType) => parseFloat(team.fsm) },
    {
      key: "sos",
      label: "SOS",
      sortable: true,
      getValue: (team: TeamDataType) => sosZScoreMetrics?.[team.key] || 0,
      render: (team: TeamDataType) => {
        const sosZScore = sosZScoreMetrics?.[team.key] || 0;
        return (
          <span style={{ color: getZScoreColor(sosZScore), fontWeight: "600" }}>
            {sosZScore !== 0 ? sosZScore.toFixed(2) : "—"}
          </span>
        );
      },
    },
    {
      key: "unlucky",
      label: "UNLUCKY",
      sortable: true,
      getValue: (team: TeamDataType) => unluckyMetrics?.[team.key] || 0,
      render: (team: TeamDataType) => {
        const unlucky = unluckyMetrics?.[team.key] || 0;
        return (
          <span style={{ color: getUnluckyColor(unlucky, maxUnlucky || 1, minUnlucky || 0), fontWeight: "600" }}>
            {unlucky !== 0 ? unlucky.toFixed(2) : "—"}
          </span>
        );
      },
    },
  ];

  return (
    <SortableTable
      data={teams}
      columns={columns}
      defaultSort="rank"
      getItemKey={(team) => team.key}
      showSortIndex
      sortIndexHideFor="rank"
    />
  );
}
