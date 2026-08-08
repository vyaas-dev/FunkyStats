"use client";

import { memo, useEffect, useState, useMemo, useRef, useCallback, type CSSProperties } from "react";
import TeamLink from "./TeamLink";
import styles from "../page.module.css";
import Image from "next/image";
import EventSearchInput from "./EventSearchInput";

type TeamTableRow = {
  key: string;
  rank: number;
  fsm: string;
  nickname?: string;
  auto?: string;
  coral?: string;
  algae?: string;
  climb?: string;
  foul?: string;
  fuel?: string;
  predicted?: boolean;
};

const num = (v: string | number | undefined | null) => Number(v) || 0;

type TeamMedia = {
  url: string;
  type: string;
  mediaType: "image" | "video";
  preferred: boolean;
  foreignKey?: string;
};

function EventStatsTable({
  teams,
  defensiveScores,
  unluckyMetrics,
  sosZScoreMetrics,
  gameYear = 2025,
}: {
  teams: TeamTableRow[];
  defensiveScores?: { [teamKey: string]: number };
  unluckyMetrics?: { [teamKey: string]: number };
  sosZScoreMetrics?: { [teamKey: string]: number };
  /** 2026 = REBUILT metrics (fuel, climb); default 2025 */
  gameYear?: number;
}) {
  const [sortField, setSortField] = useState<string>("rank");
  const [isAscending, setIsAscending] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredTeamKey, setHoveredTeamKey] = useState<string | null>(null);
  const [mediaCache, setMediaCache] = useState<Record<string, TeamMedia[]>>({});
  const [mediaLoading, setMediaLoading] = useState<Record<string, boolean>>({});
  const [mediaIndex, setMediaIndex] = useState(0);
  const hoverShowRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverHideRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);
  const is2026 = gameYear === 2026;

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const HOVER_DELAY_MS = 350;
  const LEAVE_DELAY_MS = 200;

  const handleRowMouseEnter = useCallback(
    (teamKey: string) => {
      if (hoverHideRef.current) {
        clearTimeout(hoverHideRef.current);
        hoverHideRef.current = null;
      }
      hoverShowRef.current = setTimeout(() => setHoveredTeamKey(teamKey), HOVER_DELAY_MS);
    },
    []
  );

  const handleRowMouseLeave = useCallback(() => {
    if (hoverShowRef.current) {
      clearTimeout(hoverShowRef.current);
      hoverShowRef.current = null;
    }
    hoverHideRef.current = setTimeout(() => setHoveredTeamKey(null), LEAVE_DELAY_MS);
  }, []);

  useEffect(() => {
    if (!hoveredTeamKey) return;
    setMediaIndex(0);
    if (mediaCache[hoveredTeamKey] || mediaLoading[hoveredTeamKey]) return;

    setMediaLoading((prev) => ({ ...prev, [hoveredTeamKey]: true }));
    const teamKeyForMedia = hoveredTeamKey.startsWith("frc")
      ? hoveredTeamKey
      : `frc${hoveredTeamKey}`;
    fetch(
      `/api/team-media?team=${encodeURIComponent(teamKeyForMedia)}&year=${gameYear}`
    )
      .then((r) => (r.ok ? r.json() : []))
      .then((data: TeamMedia[]) => {
        const images = Array.isArray(data)
          ? data.filter((m) => m && m.mediaType === "image" && typeof m.url === "string")
          : [];
        images.sort((a, b) => Number(b.preferred) - Number(a.preferred));
        setMediaCache((prev) => ({ ...prev, [hoveredTeamKey]: images.slice(0, 8) }));
      })
      .catch(() => {
        setMediaCache((prev) => ({ ...prev, [hoveredTeamKey]: [] }));
      })
      .finally(() => {
        setMediaLoading((prev) => ({ ...prev, [hoveredTeamKey]: false }));
      });
  }, [hoveredTeamKey, mediaCache, mediaLoading, gameYear]);

  useEffect(() => {
    if (!hoveredTeamKey) return;
    const images = mediaCache[hoveredTeamKey] ?? [];
    if (images.length <= 1) return;
    const id = setInterval(() => {
      setMediaIndex((prev) => (prev + 1) % images.length);
    }, 2800);
    return () => clearInterval(id);
  }, [hoveredTeamKey, mediaCache]);

  const filteredTeams = useMemo(() => {
    if (!searchQuery) return teams;
    const q = searchQuery.toLowerCase();
    return teams.filter(
      (team) =>
        team.key.toLowerCase().includes(q) ||
        team.key.replace(/^frc/, "").includes(q) ||
        (team.nickname ?? "").toLowerCase().includes(q)
    );
  }, [teams, searchQuery]);

  const sortedTeams = useMemo(() => {
    const sorted = [...filteredTeams];

    sorted.sort((a, b) => {
      let aValue: number, bValue: number;

      switch (sortField) {
        case "rank":
          aValue = a.rank;
          bValue = b.rank;
          break;
        case "fsm":
          aValue = num(a.fsm);
          bValue = num(b.fsm);
          break;
        case "auto":
          aValue = num(a.auto);
          bValue = num(b.auto);
          break;
        case "coral":
          aValue = num(a.coral);
          bValue = num(b.coral);
          break;
        case "algae":
          aValue = num(a.algae);
          bValue = num(b.algae);
          break;
        case "climb":
          aValue = num(a.climb);
          bValue = num(b.climb);
          break;
        case "fuel":
          aValue = num(a.fuel);
          bValue = num(b.fuel);
          break;
        case "foul":
          aValue = num(a.foul);
          bValue = num(b.foul);
          break;
        case "def":
          aValue = defensiveScores?.[a.key] || 0;
          bValue = defensiveScores?.[b.key] || 0;
          break;
        case "unlucky":
          aValue = unluckyMetrics?.[a.key] || 0;
          bValue = unluckyMetrics?.[b.key] || 0;
          break;
        case "sosZScore":
          aValue = sosZScoreMetrics?.[a.key] || 0;
          bValue = sosZScoreMetrics?.[b.key] || 0;
          break;
        default:
          return 0;
      }

      return isAscending ? aValue - bValue : bValue - aValue;
    });

    return sorted;
  }, [filteredTeams, sortField, isAscending, defensiveScores, sosZScoreMetrics, unluckyMetrics]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setIsAscending(!isAscending);
    } else {
      setSortField(field);
      setIsAscending(field === "rank");
    }
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) return "";
    return isAscending ? "▲" : "▼";
  };

  const getStatColor = (value: number, max: number) => {
    const percentage = (value / max) * 100;
    if (percentage >= 99) return "#10b981"; // Emerald - 99-100
    if (percentage >= 90) return "#22c55e"; // Green - 90-99
    if (percentage >= 75) return "#84cc16"; // Lime - 75-90
    if (percentage >= 25) return "#eab308"; // Yellow - 25-75
    return "#ef4444"; // Red - 0-25
  };
  const getFoulColor = (value: number) => {
    if (value > 0) return "#ef4444";
    if (value < 0) return "#22c55e";
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

  const maxValues = useMemo(() => {
    return {
      fsm: Math.max(...teams.map((t) => num(t.fsm))),
      auto: Math.max(...teams.map((t) => num(t.auto))),
      coral: Math.max(...teams.map((t) => num(t.coral))),
      algae: Math.max(...teams.map((t) => num(t.algae))),
      climb: Math.max(...teams.map((t) => num(t.climb))),
      fuel: Math.max(...teams.map((t) => num(t.fuel ?? "0")), 0.01),
      def: defensiveScores ? Math.max(...Object.values(defensiveScores), 0) : 0,
      unlucky: unluckyMetrics ? Math.max(...Object.values(unluckyMetrics), 0) : 0,
      unluckyMin: unluckyMetrics ? Math.min(...Object.values(unluckyMetrics), 0) : 0,
    };
  }, [teams, defensiveScores, unluckyMetrics]);

  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
        padding: "0 1rem",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          width: "100%",
          marginBottom: "0.25rem",
        }}
      >
        <EventSearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search teams…"
        />
      </div>

      <div className={styles.tableWrapper}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            minWidth: "720px",
            tableLayout: "fixed",
          }}
        >
          <colgroup>
            <col style={{ width: "3.5rem" }} />
            <col style={{ width: is2026 ? "28%" : "22%" }} />
            <col style={{ width: is2026 ? "9%" : "7%" }} />
            {(is2026
              ? ["fsm", "auto", "fuel", "climb", "foul"]
              : [
                  "fsm",
                  "auto",
                  "coral",
                  "algae",
                  "climb",
                  "foul",
                  "def",
                  "sos",
                  "unlucky",
                ]
            ).map((key) => (
              <col key={key} />
            ))}
          </colgroup>
          <thead>
            <tr
              style={{
                background: "var(--gray-more)",
                borderBottom: "2px solid var(--border-color)",
              }}
            >
              <th
                aria-label="Sort position"
                style={{
                  padding: "0.65rem 0.5rem 0.65rem 1rem",
                  textAlign: "left",
                }}
              />
              {(is2026
                ? [
                    { key: "key", label: "TEAM", sortable: false },
                    { key: "rank", label: "RANK", sortable: true },
                    { key: "fsm", label: "FSM", sortable: true },
                    { key: "auto", label: "AUTO", sortable: true },
                    { key: "fuel", label: "FUEL", sortable: true },
                    { key: "climb", label: "CLIMB", sortable: true },
                    { key: "foul", label: "PENALTY", sortable: true },
                  ]
                : [
                    { key: "key", label: "TEAM", sortable: false },
                    { key: "rank", label: "RANK", sortable: true },
                    { key: "fsm", label: "FSM", sortable: true },
                    { key: "auto", label: "AUTO", sortable: true },
                    { key: "coral", label: "CORAL", sortable: true },
                    { key: "algae", label: "ALGAE", sortable: true },
                    { key: "climb", label: "CLIMB", sortable: true },
                    { key: "foul", label: "FOULS", sortable: true },
                    { key: "def", label: "DEF", sortable: true },
                    { key: "sosZScore", label: "SOS", sortable: true },
                    { key: "unlucky", label: "UNLUCKY", sortable: true },
                  ]
              ).map((col) => (
                <th
                  key={col.key}
                  onClick={() => col.sortable && handleSort(col.key)}
                  style={{
                    padding: "0.65rem 0.85rem",
                    textAlign: col.key === "key" ? "left" : "center",
                    fontWeight: "700",
                    fontSize: "0.75rem",
                    letterSpacing: "0.04em",
                    color: "var(--yellow-color)",
                    cursor: col.sortable ? "pointer" : "default",
                    userSelect: "none",
                    transition: "background 0.2s",
                    whiteSpace: "nowrap",
                  }}
                  onMouseEnter={(e) => {
                    if (col.sortable) {
                      e.currentTarget.style.background =
                        "rgba(255, 255, 255, 0.05)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  {col.label} {col.sortable && getSortIcon(col.key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedTeams.map((team, idx) => {
              const defScore = defensiveScores?.[team.key] || 0;
              const foulValue = num(team.foul);
              const sosZScoreValue = sosZScoreMetrics?.[team.key] || 0;
              const unluckyValue = unluckyMetrics?.[team.key] || 0;
              const metricTd: CSSProperties = {
                padding: "0.7rem 0.85rem",
                textAlign: "center",
                fontWeight: "600",
                fontSize: "0.92rem",
                whiteSpace: "nowrap",
              };

              return (
                <tr
                  key={team.key}
                  style={{
                    borderBottom: "1px solid var(--border-color)",
                    background: "var(--background-pred)",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--gray-more)";
                    e.currentTarget.style.transform = "scale(1.01)";
                    handleRowMouseEnter(team.key);
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "var(--background-pred)";
                    e.currentTarget.style.transform = "scale(1)";
                    handleRowMouseLeave();
                  }}
                >
                  <td
                    style={{
                      padding: "0.7rem 0.5rem 0.7rem 1rem",
                      fontWeight: "600",
                      color: "var(--gray-less)",
                      fontSize: "0.9rem",
                    }}
                  >
                    {idx + 1}
                  </td>
                  <td
                    style={{
                      padding: "0.7rem 0.85rem",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "baseline",
                        gap: "0.55rem",
                        minWidth: 0,
                      }}
                    >
                      <span style={{ fontWeight: 700, flexShrink: 0 }}>
                        <TeamLink teamKey={team.key} year={gameYear} />
                      </span>
                      {team.nickname ? (
                        <span
                          style={{
                            color: "var(--gray-less)",
                            fontWeight: 500,
                            fontSize: "0.9rem",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            minWidth: 0,
                          }}
                          title={team.nickname}
                        >
                          {team.nickname}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td
                    style={{
                      ...metricTd,
                      fontWeight: "bold",
                      fontSize: "1rem",
                    }}
                  >
                    #{team.rank}
                  </td>
                  <td
                    style={{
                      ...metricTd,
                      fontWeight: "bold",
                      fontSize: "1rem",
                      color: getStatColor(num(team.fsm), maxValues.fsm),
                    }}
                  >
                    <span
                      style={
                        team.predicted
                          ? {
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.35rem",
                              padding: "0.1rem 0.4rem",
                              borderRadius: 999,
                              border: "2px solid var(--yellow-color)",
                              boxShadow: "0 0 0 3px rgba(253, 224, 71, 0.18)",
                            }
                          : undefined
                      }
                    >
                      {num(team.fsm).toFixed(1)}
                      {team.predicted && (
                        <span
                          style={{ color: "var(--yellow-color)", fontWeight: 800, fontSize: "0.75rem" }}
                        >
                          Pred
                        </span>
                      )}
                    </span>
                  </td>
                  {!is2026 && (
                    <>
                      <td
                        style={{
                          ...metricTd,
                          color: getStatColor(num(team.auto), maxValues.auto),
                        }}
                      >
                        {num(team.auto).toFixed(1)}
                      </td>
                      <td
                        style={{
                          ...metricTd,
                          color: getStatColor(num(team.coral), maxValues.coral),
                        }}
                      >
                        {num(team.coral).toFixed(1)}
                      </td>
                      <td
                        style={{
                          ...metricTd,
                          color: getStatColor(num(team.algae), maxValues.algae),
                        }}
                      >
                        {num(team.algae).toFixed(1)}
                      </td>
                    </>
                  )}
                  {is2026 && (
                    <td
                      style={{
                        ...metricTd,
                        color: getStatColor(num(team.auto), maxValues.auto),
                      }}
                    >
                      {num(team.auto).toFixed(1)}
                    </td>
                  )}
                  {is2026 && (
                    <td
                      style={{
                        ...metricTd,
                        color: getStatColor(
                          num(team.fuel ?? "0"),
                          maxValues.fuel
                        ),
                      }}
                    >
                      {num(team.fuel ?? "0").toFixed(1)}
                    </td>
                  )}
                  <td
                    style={{
                      ...metricTd,
                      color: getStatColor(num(team.climb), maxValues.climb),
                    }}
                  >
                    {num(team.climb).toFixed(1)}
                  </td>
                  <td
                    style={{
                      ...metricTd,
                      color: getFoulColor(foulValue),
                    }}
                  >
                    {foulValue.toFixed(1)}
                  </td>
                  {!is2026 && (
                    <>
                      <td
                        style={{
                          ...metricTd,
                          fontWeight: "bold",
                          color: getStatColor(defScore, maxValues.def),
                        }}
                      >
                        {defScore.toFixed(1)}
                      </td>
                      <td
                        style={{
                          ...metricTd,
                          color: getZScoreColor(sosZScoreValue),
                        }}
                      >
                        {sosZScoreValue !== 0 ? sosZScoreValue.toFixed(1) : "—"}
                      </td>
                      <td
                        style={{
                          ...metricTd,
                          color: getUnluckyColor(
                            unluckyValue,
                            maxValues.unlucky || 1,
                            maxValues.unluckyMin || 0
                          ),
                        }}
                      >
                        {unluckyValue !== 0 ? unluckyValue.toFixed(1) : "—"}
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {filteredTeams.length === 0 && (
        <div
          style={{
            padding: "3rem",
            textAlign: "center",
            color: "var(--gray-less)",
            background: "var(--background-pred)",
            borderRadius: 12,
            border: "2px solid var(--border-color)",
            boxShadow:
              "0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)",
          }}
        >
          <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>🔍</div>
          <h3
            style={{
              fontSize: "1.25rem",
              fontWeight: "bold",
              color: "var(--foreground)",
              marginBottom: "0.5rem",
            }}
          >
            No Teams Found
          </h3>
          <p style={{ fontSize: "0.9rem" }}>
            Try adjusting your search to see more results
          </p>
        </div>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.5rem",
          padding: "1.5rem 1rem",
          fontSize: "0.9rem",
          color: "var(--foreground)",
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontWeight: "600" }}>Key (Percentile):</span>
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              padding: "0.4rem 0.8rem",
              borderRadius: 6,
              background: "#ef4444",
              color: "#fff",
              fontWeight: "500",
            }}
          >
            0 - 25
          </span>
          <span
            style={{
              padding: "0.4rem 0.8rem",
              borderRadius: 6,
              background: "#eab308",
              color: "#fff",
              fontWeight: "500",
            }}
          >
            25 - 75
          </span>
          <span
            style={{
              padding: "0.4rem 0.8rem",
              borderRadius: 6,
              background: "#84cc16",
              color: "#fff",
              fontWeight: "500",
            }}
          >
            75 - 90
          </span>
          <span
            style={{
              padding: "0.4rem 0.8rem",
              borderRadius: 6,
              background: "#22c55e",
              color: "#fff",
              fontWeight: "500",
            }}
          >
            90 - 99
          </span>
          <span
            style={{
              padding: "0.4rem 0.8rem",
              borderRadius: 6,
              background: "#10b981",
              color: "#fff",
              fontWeight: "500",
            }}
          >
            99 - 100
          </span>
        </div>
      </div>

      {hoveredTeamKey && isDesktop && (() => {
        const hoveredTeam = sortedTeams.find((t) => t.key === hoveredTeamKey);
        if (!hoveredTeam) return null;
        const images = mediaCache[hoveredTeamKey] ?? [];
        const isLoadingMedia = mediaLoading[hoveredTeamKey] === true;
        const currentImage = images.length > 0 ? images[mediaIndex % images.length] : null;
        return (
          <div
            role="tooltip"
            onMouseEnter={() => {
              if (hoverHideRef.current) {
                clearTimeout(hoverHideRef.current);
                hoverHideRef.current = null;
              }
            }}
            onMouseLeave={handleRowMouseLeave}
            style={{
              position: "fixed",
              right: 16,
              top: "50%",
              transform: "translateY(-50%)",
              zIndex: 1000,
              width: "25vw",
              maxWidth: 400,
              minWidth: 240,
            }}
          >
            <div
              style={{
                background: "var(--background-pred)",
                border: "2px solid var(--border-color)",
                borderRadius: 12,
                padding: "0.75rem 1rem",
                boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
              }}
            >
              <div
                style={{
                  fontWeight: "700",
                  fontSize: "1rem",
                  marginBottom: "0.5rem",
                  color: "var(--yellow-color)",
                }}
              >
                Team {hoveredTeam.key.replace("frc", "")}
              </div>
              {(isLoadingMedia || currentImage) ? (
                <div
                  style={{
                    width: "100%",
                    height: "55vw",
                    maxHeight: 320,
                    minHeight: 180,
                    borderRadius: 10,
                    overflow: "hidden",
                    border: "1px solid var(--border-color)",
                    background: "var(--gray-more)",
                    marginBottom: "0.65rem",
                    position: "relative",
                  }}
                >
                  {currentImage ? (
                    <Image
                      key={currentImage.url}
                      src={currentImage.url}
                      alt={`${hoveredTeamKey} robot`}
                      fill
                      unoptimized
                      style={{ objectFit: "cover" }}
                      onError={() => {
                        setMediaCache((prev) => {
                          const next = { ...prev };
                          next[hoveredTeamKey] = (next[hoveredTeamKey] ?? []).filter(
                            (m) => m.url !== currentImage.url
                          );
                          return next;
                        });
                        setMediaIndex((prev) => prev + 1);
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--gray-less)",
                        fontSize: "0.85rem",
                        fontWeight: 600,
                      }}
                    >
                      Loading image…
                    </div>
                  )}
                  {images.length > 1 && (
                    <div
                      style={{
                        position: "absolute",
                        bottom: 8,
                        right: 8,
                        padding: "0.15rem 0.45rem",
                        borderRadius: 999,
                        background: "rgba(0,0,0,0.55)",
                        color: "#fff",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                      }}
                    >
                      {(mediaIndex % images.length) + 1}/{images.length}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ fontSize: "0.85rem", color: "var(--foreground)" }}>
                  No robot image found
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

export default memo(EventStatsTable);
