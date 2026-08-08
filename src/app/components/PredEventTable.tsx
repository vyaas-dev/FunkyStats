"use client";

import SortableTable from "./SortableTable";
import TeamLink from "./TeamLink";

type TTType = {
  key: string;
  fsm: string;
  rank: number;
  predicted?: boolean;
};

export default function PredEventTable({ teams }: { teams: TTType[] }) {
  const columns = [
    {
      key: "key",
      label: "Team",
      sortable: false,
      render: (team: TTType) => <TeamLink teamKey={team.key} year={2025} />,
    },
    {
      key: "rank",
      label: "FSM Rank",
      sortable: true,
      getValue: (team: TTType) => team.rank,
    },
    {
      key: "fsm",
      label: "FSM",
      sortable: true,
      getValue: (team: TTType) => parseFloat(team.fsm),
      render: (team: TTType) => (
        <span
          style={
            team.predicted
              ? {
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.15rem 0.5rem",
                  borderRadius: 999,
                  border: "2px solid var(--yellow-color)",
                  boxShadow: "0 0 0 3px rgba(253, 224, 71, 0.18)",
                  fontWeight: 800,
                }
              : undefined
          }
        >
          {team.fsm}
          {team.predicted && (
            <span style={{ color: "var(--yellow-color)", fontWeight: 800 }}>
              Pred
            </span>
          )}
        </span>
      ),
    },
  ];

  return (
    <SortableTable
      data={teams}
      columns={columns}
      defaultSort="rank"
      getItemKey={(team) => team.key}
    />
  );
}
