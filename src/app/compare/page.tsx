"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import styles from "../page.module.css";

interface GlobalTeam {
  teamKey: string;
  bestFSM: string;
  country: string;
  state_prov: string;
}

interface ResolvedTeam {
  teamKey: string;
  number: string;
  bestFSM: number;
  country: string;
  state_prov: string;
  rank: number;
  percentile: number;
}

function CompareContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [teamNumbers, setTeamNumbers] = useState<string[]>(() => {
    const param = searchParams.get("teams");
    if (param) {
      return param
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 4);
    }
    return [];
  });

  const [inputValue, setInputValue] = useState("");
  const [allTeams, setAllTeams] = useState<GlobalTeam[]>([]);
  const [resolvedTeams, setResolvedTeams] = useState<ResolvedTeam[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    fetch("/api/global-stats?year=2026")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch rankings");
        return res.json();
      })
      .then((data) => {
        setAllTeams(Array.isArray(data) ? data : []);
      })
      .catch(() => setError("Failed to load global rankings."))
      .finally(() => setLoading(false));
  }, []);

  const resolveTeams = useCallback(
    (numbers: string[], teams: GlobalTeam[]) => {
      if (teams.length === 0) return;

      const sorted = [...teams].sort(
        (a, b) => Number(b.bestFSM) - Number(a.bestFSM)
      );
      const totalTeams = sorted.length;

      const resolved: ResolvedTeam[] = numbers
        .map((num) => {
          const key = `frc${num}`;
          const rankIndex = sorted.findIndex((t) => t.teamKey === key);
          if (rankIndex === -1) return null;

          const team = sorted[rankIndex];
          return {
            teamKey: team.teamKey,
            number: num,
            bestFSM: Number(team.bestFSM),
            country: team.country || "—",
            state_prov: team.state_prov || "—",
            rank: rankIndex + 1,
            percentile: parseFloat(
              (((rankIndex + 1) / totalTeams) * 100).toFixed(1)
            ),
          };
        })
        .filter((t): t is ResolvedTeam => t !== null);

      setResolvedTeams(resolved);
    },
    []
  );

  useEffect(() => {
    resolveTeams(teamNumbers, allTeams);
  }, [teamNumbers, allTeams, resolveTeams]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (teamNumbers.length > 0) {
      params.set("teams", teamNumbers.join(","));
    }
    const newUrl = teamNumbers.length > 0 ? `?${params.toString()}` : "";
    router.replace(`/compare${newUrl}`, { scroll: false });
  }, [teamNumbers, router]);

  const addTeam = () => {
    const num = inputValue.trim().replace(/^frc/i, "");
    if (!num || teamNumbers.includes(num)) {
      setInputValue("");
      return;
    }
    if (teamNumbers.length >= 4) {
      setError("Maximum 4 teams allowed.");
      return;
    }
    setError("");
    setTeamNumbers((prev) => [...prev, num]);
    setInputValue("");
  };

  const removeTeam = (num: string) => {
    setTeamNumbers((prev) => prev.filter((t) => t !== num));
    setError("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTeam();
    }
  };

  const bestFSM =
    resolvedTeams.length > 0
      ? Math.max(...resolvedTeams.map((t) => t.bestFSM))
      : null;
  const bestRank =
    resolvedTeams.length > 0
      ? Math.min(...resolvedTeams.map((t) => t.rank))
      : null;
  const bestPercentile =
    resolvedTeams.length > 0
      ? Math.min(...resolvedTeams.map((t) => t.percentile))
      : null;

  const rows: {
    label: string;
    getValue: (t: ResolvedTeam) => string;
    isBest: (t: ResolvedTeam) => boolean;
  }[] = [
    {
      label: "FSM Score",
      getValue: (t) => t.bestFSM.toFixed(1),
      isBest: (t) => t.bestFSM === bestFSM,
    },
    {
      label: "Global Rank",
      getValue: (t) => `#${t.rank}`,
      isBest: (t) => t.rank === bestRank,
    },
    {
      label: "Top Percentile",
      getValue: (t) => `${t.percentile}%`,
      isBest: (t) => t.percentile === bestPercentile,
    },
    {
      label: "Country",
      getValue: (t) => t.country,
      isBest: () => false,
    },
    {
      label: "State / Province",
      getValue: (t) => t.state_prov,
      isBest: () => false,
    },
  ];

  const notFound = teamNumbers.filter(
    (num) => !resolvedTeams.find((r) => r.number === num)
  );

  return (
    <div
      className={styles.page}
      style={{ position: "relative", minHeight: "100vh" }}
    >
      <main className={styles.main} style={{ maxWidth: 960, margin: "0 auto" }}>
        <h1
          className={styles.pageTitle}
          style={{ marginBottom: "0.5rem" }}
        >
          Team Comparison
        </h1>
        <p
          style={{
            textAlign: "center",
            color: "var(--gray-less)",
            fontSize: "1.05rem",
            marginBottom: "1.5rem",
          }}
        >
          Compare up to 4 teams side by side
        </p>

        {/* Input area */}
        <div
          style={{
            background: "var(--gray-more)",
            border: "2px solid var(--border-color)",
            borderRadius: 16,
            padding: "1.5rem",
            marginBottom: "1.5rem",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <input
              type="text"
              placeholder="Enter team number (e.g. 254)"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className={styles.input}
              style={{
                padding: "12px 16px",
                fontSize: 16,
                borderRadius: 10,
                border: "2px solid var(--border-color)",
                flex: "1 1 200px",
                minWidth: 0,
                transition: "all 0.3s ease",
                boxSizing: "border-box",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "var(--yellow-color)";
                e.currentTarget.style.boxShadow =
                  "0 0 0 3px rgba(253, 224, 71, 0.1)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "var(--border-color)";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
            <button
              onClick={addTeam}
              disabled={teamNumbers.length >= 4}
              style={{
                padding: "12px 24px",
                fontSize: 16,
                fontWeight: 600,
                borderRadius: 10,
                background:
                  teamNumbers.length >= 4
                    ? "var(--gray-less)"
                    : "var(--yellow-color)",
                color: "#000",
                border: "none",
                cursor: teamNumbers.length >= 4 ? "not-allowed" : "pointer",
                transition: "all 0.3s ease",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                opacity: teamNumbers.length >= 4 ? 0.5 : 1,
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => {
                if (teamNumbers.length < 4) {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow =
                    "0 6px 20px rgba(0,0,0,0.2)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow =
                  "0 4px 12px rgba(0,0,0,0.15)";
              }}
            >
              Add Team
            </button>
          </div>

          {/* Team chips */}
          {teamNumbers.length > 0 && (
            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                marginTop: 12,
              }}
            >
              {teamNumbers.map((num) => (
                <div
                  key={num}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 14px",
                    borderRadius: 8,
                    background: "var(--background-pred)",
                    border: "1px solid var(--border-color)",
                    fontSize: 14,
                    fontWeight: 600,
                    color: "var(--foreground)",
                  }}
                >
                  <span style={{ color: "var(--yellow-color)" }}>
                    {num}
                  </span>
                  <button
                    onClick={() => removeTeam(num)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--gray-less)",
                      cursor: "pointer",
                      fontSize: 16,
                      lineHeight: 1,
                      padding: "0 2px",
                      transition: "color 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "#ff6b6b";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "var(--gray-less)";
                    }}
                    aria-label={`Remove team ${num}`}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {error && (
            <p
              style={{
                color: "#ff6b6b",
                fontSize: 14,
                marginTop: 8,
              }}
            >
              {error}
            </p>
          )}
        </div>

        {/* Loading state */}
        {loading && (
          <p
            style={{
              textAlign: "center",
              color: "var(--gray-less)",
              padding: "2rem",
            }}
          >
            Loading rankings data...
          </p>
        )}

        {/* Not found warnings */}
        {!loading && notFound.length > 0 && allTeams.length > 0 && (
          <div
            style={{
              background: "rgba(255, 107, 107, 0.1)",
              border: "1px solid rgba(255, 107, 107, 0.3)",
              borderRadius: 10,
              padding: "12px 16px",
              marginBottom: "1rem",
              fontSize: 14,
              color: "#ff6b6b",
            }}
          >
            Team{notFound.length > 1 ? "s" : ""} not found in 2026
            rankings:{" "}
            <strong>{notFound.join(", ")}</strong>
          </div>
        )}

        {/* Comparison table */}
        {!loading && resolvedTeams.length >= 2 && (
          <div className={styles.tableWrapper} style={{ overflow: "hidden" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
              }}
            >
              <thead>
                <tr
                  style={{
                    background: "var(--gray-more)",
                    borderBottom: "2px solid var(--border-color)",
                  }}
                >
                  <th
                    style={{
                      padding: "1rem",
                      textAlign: "left",
                      fontWeight: 700,
                      fontSize: "0.875rem",
                      letterSpacing: "0.05em",
                      color: "var(--foreground)",
                      minWidth: 130,
                    }}
                  >
                    METRIC
                  </th>
                  {resolvedTeams.map((team) => (
                    <th
                      key={team.teamKey}
                      style={{
                        padding: "1rem",
                        textAlign: "center",
                        fontWeight: 700,
                        fontSize: "1rem",
                        color: "var(--yellow-color)",
                        letterSpacing: "0.02em",
                      }}
                    >
                      <a
                        href={`/team/${team.teamKey}-2026`}
                        style={{
                          color: "var(--yellow-color)",
                          textDecoration: "none",
                          transition: "opacity 0.2s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.opacity = "0.8";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.opacity = "1";
                        }}
                      >
                        {team.number}
                      </a>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr
                    key={row.label}
                    style={{
                      borderBottom:
                        idx < rows.length - 1
                          ? "1px solid var(--border-color)"
                          : "none",
                      background:
                        idx % 2 === 0
                          ? "var(--background-pred)"
                          : "var(--gray-more)",
                    }}
                  >
                    <td
                      style={{
                        padding: "0.875rem 1rem",
                        fontWeight: 600,
                        fontSize: "0.875rem",
                        color: "var(--gray-less)",
                        letterSpacing: "0.03em",
                        textTransform: "uppercase",
                      }}
                    >
                      {row.label}
                    </td>
                    {resolvedTeams.map((team) => {
                      const best = row.isBest(team);
                      return (
                        <td
                          key={team.teamKey}
                          style={{
                            padding: "0.875rem 1rem",
                            textAlign: "center",
                            fontWeight: best ? 700 : 500,
                            fontSize: best ? "1.1rem" : "1rem",
                            color: best
                              ? "var(--yellow-color)"
                              : "var(--foreground)",
                            transition: "all 0.2s ease",
                          }}
                        >
                          {row.getValue(team)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Prompt when fewer than 2 teams resolved */}
        {!loading &&
          resolvedTeams.length < 2 &&
          teamNumbers.length > 0 &&
          allTeams.length > 0 && (
            <div
              style={{
                textAlign: "center",
                padding: "3rem 1rem",
                background: "var(--background-pred)",
                border: "2px solid var(--border-color)",
                borderRadius: 16,
              }}
            >
              <p
                style={{
                  color: "var(--gray-less)",
                  fontSize: "1.05rem",
                }}
              >
                Add at least 2 valid teams to see the comparison.
              </p>
            </div>
          )}

        {/* Empty state */}
        {!loading && teamNumbers.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "3rem 1rem",
              background: "var(--background-pred)",
              border: "2px solid var(--border-color)",
              borderRadius: 16,
            }}
          >
            <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>
              📊
            </div>
            <p
              style={{
                color: "var(--foreground)",
                fontSize: "1.15rem",
                fontWeight: 600,
                marginBottom: "0.5rem",
              }}
            >
              Enter team numbers above to start comparing
            </p>
            <p
              style={{
                color: "var(--gray-less)",
                fontSize: "0.95rem",
              }}
            >
              Try sharing a link like{" "}
              <code
                style={{
                  background: "var(--gray-more)",
                  padding: "2px 6px",
                  borderRadius: 4,
                  fontSize: "0.85rem",
                }}
              >
                /compare?teams=254,1678,118
              </code>
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense
      fallback={
        <div
          className={styles.page}
          style={{ position: "relative", minHeight: "100vh" }}
        >
          <main
            className={styles.main}
            style={{ maxWidth: 960, margin: "0 auto" }}
          >
            <h1 className={styles.pageTitle}>Team Comparison</h1>
            <p
              style={{
                textAlign: "center",
                color: "var(--gray-less)",
                padding: "2rem",
              }}
            >
              Loading...
            </p>
          </main>
        </div>
      }
    >
      <CompareContent />
    </Suspense>
  );
}
