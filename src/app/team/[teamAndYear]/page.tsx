/* eslint-disable */
import styles from "../../page.module.css";
import {
  getTeamStats,
  EventDataType,
  getTeamInfo,
  getTeamMedia,
  getTeamAwards,
} from "../../lib/team";
import { getGlobalStats, getGlobalStatsWithoutLocation } from "@/app/lib/global";
import Link from "next/link";
import InteractiveChart from "../../components/Graph";
import TeamYearSelector from "@/app/components/TeamYearSelector";

import StatCard from "./StatCard";
import EventCard from "./EventCard";
import TeamImageGallery from "./TeamImageGallery";


export default async function TeamPage({
  params,
}: {
  params: Promise<{ teamAndYear: string }>;
}) {
  const { teamAndYear } = await params;
  const [teamKey, year] = teamAndYear.split("-");

  if (year === "general") {
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 15 }, (_, i) => currentYear - i)
      .filter((y) => y !== 2020 && y !== 2021 && y >= 2018)
      .reverse();

    let normSumSq = 0,
      normCount = 0;
    let allStats: { year: number; normFSM: number; isPrediction?: boolean }[] =
      [];

    const yearResults = await Promise.allSettled(
      years.map((y) => getGlobalStatsWithoutLocation(y))
    );

    yearResults.forEach((result, idx) => {
      if (result.status === "fulfilled") {
        const y = years[idx];
        const globalStats = result.value;

        const teamGlobalData = globalStats.find(
          (t: any) => t.teamKey === teamKey
        );
        if (!teamGlobalData) return;

        const fsms = globalStats.map((t: any) => Number(t.bestFSM));
        const mean = fsms.reduce((a, b) => a + b, 0) / fsms.length;
        const variance =
          fsms.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / fsms.length;
        const stddev = Math.sqrt(variance);
        const fsm = Number(teamGlobalData.bestFSM);
        if (!isNaN(fsm) && stddev > 0) {
          const normFSM = ((fsm - mean) / stddev) * 100.0 + 1500.0;
          allStats.push({ year: y, normFSM });
        }
      }
    });

    const statsForAvg =
      allStats.length > 1
        ? allStats.filter(
            (s) => s.normFSM !== Math.min(...allStats.map((a) => a.normFSM))
          )
        : allStats;

    for (const s of statsForAvg) {
      normSumSq += s.normFSM * s.normFSM;
      normCount++;
    }

    const avgNormFSM =
      normCount > 0 ? Math.sqrt(normSumSq / normCount).toFixed(0) : 1500;

    const minTeamFSM = Math.min(...allStats.map((s) => s.normFSM));
    const maxTeamFSM = Math.max(...allStats.map((s) => s.normFSM));

    const minPossibleFSM = Math.floor(minTeamFSM / 50) * 50 - 50;
    const maxPossibleFSM = Math.ceil(maxTeamFSM / 50) * 50 + 50;

    const teamPercentile = (() => {
      const globalAvg = 1500.0;
      const globalStdDev = 100.0;
      const z = (Number(avgNormFSM) - globalAvg) / globalStdDev;
      function erf(x: number): number {
        const sign = x >= 0 ? 1 : -1;
        x = Math.abs(x);
        const a1 = 0.254829592;
        const a2 = -0.284496736;
        const a3 = 1.421413741;
        const a4 = -1.453152027;
        const a5 = 1.061405429;
        const p = 0.3275911;
        const t = 1.0 / (1.0 + p * x);
        const y =
          1.0 -
          ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
        return sign * y;
      }
      const percentile = 0.5 * (1 + erf(z / Math.sqrt(2)));
      return Math.round(percentile * 100);
    })();

    const trendSlope = (() => {
      const actual = allStats.filter((s) => !s.isPrediction);
      if (actual.length < 2) return null;
      const n = actual.length;
      const sumX = actual.reduce((s, p) => s + p.year, 0);
      const sumY = actual.reduce((s, p) => s + p.normFSM, 0);
      const sumXY = actual.reduce((s, p) => s + p.year * p.normFSM, 0);
      const sumXX = actual.reduce((s, p) => s + p.year * p.year, 0);
      const denom = n * sumXX - sumX * sumX;
      if (denom === 0) return null;
      return (n * sumXY - sumX * sumY) / denom;
    })();

    const trendValue =
      trendSlope == null
        ? "—"
        : `${trendSlope >= 0 ? "↑" : "↓"} ${Math.abs(trendSlope).toFixed(0)}`;
    const trendColor =
      trendSlope == null
        ? undefined
        : trendSlope > 2
          ? "#22c55e"
          : trendSlope < -2
            ? "#ef4444"
            : "var(--gray-less)";

    return (
      <div
        className={styles.page}
        style={{ position: "relative", minHeight: "100vh", width: "100%" }}
      >
        <main className={styles.main}>
          <h1 className={styles.pageTitle}>10-Year Team Analysis</h1>
          <h2
            style={{
              color: "var(--yellow-color)",
              textAlign: "center",
              fontSize: "2rem",
              marginTop: "-1rem",
            }}
          >
            {teamKey}
          </h2>
          <TeamYearSelector teamKey={teamKey} currentYear={"general"} />
          <div className={styles.teamGeneralStats}>
            <StatCard
              grow={false}
              label="RMS NORMALIZED FSM"
              value={Number(avgNormFSM).toFixed(0)}
              subtitle="2018–2025"
            />
            <StatCard
              grow={false}
              label="PERCENTILE"
              value={`${(100 - teamPercentile).toFixed(1)}%`}
              subtitle={`Top ${(100 - teamPercentile).toFixed(1)}%`}
              color="#22c55e"
            />
            <StatCard
              grow={false}
              label="TREND"
              value={trendValue}
              subtitle={
                trendSlope != null ? "Norm. FSM pts / year" : "Not enough data"
              }
              color={trendColor}
            />
          </div>

          <div
            className="desktop-only"
            style={{
              background: "var(--background-pred)",
              border: "2px solid var(--border-color)",
              borderRadius: 12,
              padding: "2rem",
              margin: "0 auto 2rem",
              maxWidth: "95%",
              boxShadow:
                "0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)",
            }}
          >
            <h3
              style={{
                color: "var(--foreground)",
                textAlign: "center",
                marginBottom: "1rem",
                fontSize: "1.25rem",
              }}
            >
              Historical Performance
            </h3>
            {allStats.some((s) => s.isPrediction) && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: "1.5rem",
                  marginBottom: "1rem",
                  fontSize: "13px",
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <div
                    style={{
                      width: "16px",
                      height: "3px",
                      background: "#0070f3",
                    }}
                  />
                  <span style={{ color: "var(--foreground)" }}>
                    Actual Data
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <div
                    style={{
                      width: "16px",
                      height: "3px",
                      background: "#f59e0b",
                      borderTop: "2px dashed #f59e0b",
                    }}
                  />
                  <span style={{ color: "#f59e0b", fontWeight: "bold" }}>
                    Predicted
                  </span>
                </div>
              </div>
            )}
            <InteractiveChart
              allStats={allStats}
              minPossibleFSM={minPossibleFSM}
              maxPossibleFSM={maxPossibleFSM}
            />
          </div>

          <div
            className="mobile-only"
            style={{
              maxWidth: "min(600px, 95%)",
              margin: "0 auto",
              overflowX: "auto",
              borderRadius: 12,
              border: "2px solid var(--border-color)",
              boxShadow:
                "0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)",
            }}
          >
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
                      fontWeight: "700",
                      fontSize: "0.875rem",
                      letterSpacing: "0.05em",
                      color: "var(--yellow-color)",
                    }}
                  >
                    YEAR
                  </th>
                  <th
                    style={{
                      padding: "1rem",
                      textAlign: "left",
                      fontWeight: "700",
                      fontSize: "0.875rem",
                      letterSpacing: "0.05em",
                      color: "var(--yellow-color)",
                    }}
                  >
                    NORMALIZED FSM
                  </th>
                </tr>
              </thead>
              <tbody>
                {allStats
                  .slice()
                  .reverse()
                  .map((s, idx) => (
                    <tr
                      key={s.year}
                      style={{
                        borderBottom: "1px solid var(--border-color)",
                        background: "var(--background-pred)",
                      }}
                    >
                      <td
                        style={{
                          padding: "1rem",
                          fontWeight: "600",
                        }}
                      >
                        {s.year}
                        {s.isPrediction && (
                          <span
                            style={{
                              marginLeft: "0.5rem",
                              fontSize: "0.75rem",
                              color: "#f59e0b",
                              fontWeight: "bold",
                            }}
                          >
                            (Predicted)
                          </span>
                        )}
                      </td>
                      <td
                        style={{
                          padding: "1rem",
                          fontWeight: "bold",
                          fontSize: "1.125rem",
                          color: s.isPrediction
                            ? "#f59e0b"
                            : "var(--yellow-color)",
                          fontStyle: s.isPrediction ? "italic" : "normal",
                        }}
                      >
                        {s.normFSM.toFixed(0)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    );
  }

  let yearprov = year ?? "2025";
  if (
    Number(yearprov) < 2018 ||
    Number(yearprov) === 2021 ||
    Number(yearprov) === 2020 ||
    Number(yearprov) > 2026
  ) {
    yearprov = "2025";
  }

  let teamStats;
  let teamInfo: any;
  let gstats;
  let teamMedia;
  let teamAwards: any[] = [];

  try {
    [teamStats, teamInfo, gstats, teamMedia, teamAwards] = await Promise.all([
      getTeamStats(teamKey, Number(yearprov)),
      getTeamInfo(teamKey),
      getGlobalStats(Number(yearprov)),
      getTeamMedia(teamKey, Number(yearprov)),
      getTeamAwards(teamKey, Number(yearprov)),
    ]);
  } catch {
    return (
      <div
        className={styles.page}
        style={{ position: "relative", minHeight: "100vh", width: "100%" }}
      >
        <main className={styles.main}>
          <h1 className={styles.pageTitle}>Team Not Found</h1>
          <TeamYearSelector teamKey={teamKey} currentYear={yearprov} />
          <div
            style={{
              background: "var(--background-pred)",
              border: "2px solid var(--border-color)",
              borderRadius: 12,
              padding: "3rem",
              maxWidth: "600px",
              margin: "0 auto",
              textAlign: "center",
              boxShadow:
                "0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)",
            }}
          >
            <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>⚠️</div>
            <h2
              style={{
                color: "var(--foreground)",
                marginBottom: "1rem",
              }}
            >
              No Data Available
            </h2>
            <p
              style={{
                color: "var(--gray-less)",
                fontSize: "1rem",
                lineHeight: 1.6,
              }}
            >
              The team "{teamKey}" does not have data for the year {yearprov}.
              <br />
              Please check the team key and year, or select a different year
              above.
            </p>
          </div>
        </main>
      </div>
    );
  }

  const teamFSM = teamStats.bestFSM;

  const statsWithUpdatedFSM = gstats.map((team) => {
    if (team.teamKey === teamKey) {
      return { ...team, bestFSM: teamFSM.toString() };
    }
    return team;
  });

  const sortedStats = [...statsWithUpdatedFSM].sort(
    (a, b) => Number(b.bestFSM) - Number(a.bestFSM)
  );

  const teamIndex =
    sortedStats.findIndex((team) => team.teamKey === teamKey) + 1;

  const teamCountry = teamInfo?.country || "";
  const teamStateProv = teamInfo?.state_prov || "";

  const countryTeams = sortedStats.filter((t: any) => t.country === teamCountry);
  const countryRank = countryTeams.findIndex((t: any) => t.teamKey === teamKey) + 1;
  const countryTotal = countryTeams.length;

  const stateTeams = teamCountry === "USA" && teamStateProv
    ? sortedStats.filter((t: any) => t.country === "USA" && t.state_prov === teamStateProv)
    : [];
  const stateRank = stateTeams.length > 0
    ? stateTeams.findIndex((t: any) => t.teamKey === teamKey) + 1
    : 0;
  const stateTotal = stateTeams.length;

  const teamNumber = teamKey.replace(/^frc/i, "");
  const teamDisplayName = teamInfo.nickname || `Team ${teamNumber}`;

  return (
    <div
      className={styles.page}
      style={{ position: "relative", minHeight: "100vh", width: "100%" }}
    >
      <main className={styles.main}>
        <div
          style={{
            textAlign: "center",
            marginBottom: "1rem",
          }}
        >
          <h1 className={styles.teamPageTitle}>
            {teamDisplayName}{" "}
            <span className={styles.teamPageNumber}>
              (#<span className={styles.teamPageNumberDigits}>{teamNumber}</span>)
            </span>
          </h1>
          <p style={{ color: "var(--gray-less)", fontSize: "1rem", margin: "0.35rem 0 0" }}>
            {teamInfo.city}, {teamInfo.state_prov}, {teamInfo.country}
          </p>
          {/* Team Metadata */}
          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap", marginTop: "0.5rem" }}>
            {teamInfo.rookie_year && (
              <span style={{ fontSize: "0.85rem", color: "var(--gray-less)", padding: "0.25rem 0.65rem", background: "var(--gray-more)", borderRadius: 999, fontWeight: 600 }}>
                Rookie {teamInfo.rookie_year}
              </span>
            )}
            {teamInfo.website && (
              <a
                href={teamInfo.website}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: "0.85rem", color: "var(--yellow-color)", padding: "0.25rem 0.65rem", background: "var(--gray-more)", borderRadius: 999, fontWeight: 600, textDecoration: "none" }}
              >
                Website
              </a>
            )}
            {teamAwards.length > 0 && (
              <span style={{ fontSize: "0.85rem", color: "#eab308", padding: "0.25rem 0.65rem", background: "var(--gray-more)", borderRadius: 999, fontWeight: 600 }}>
                {teamAwards.length} Award{teamAwards.length !== 1 ? "s" : ""} in {yearprov}
              </span>
            )}
          </div>
        </div>

        <TeamYearSelector teamKey={teamKey} currentYear={yearprov} />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: teamMedia.length > 0 ? "1fr 400px" : "1fr",
            gap: "1.5rem",
            padding: "0 1rem",
            alignItems: "start",
          }}
          className="team-layout-grid"
        >
          <div>
            <div className={styles.teamYearStats}>
              <StatCard compact label="FSM" value={teamFSM.toFixed(1)} />
              <StatCard
                compact
                label="GLOBAL RANK"
                value={`#${teamIndex}`}
                color="#22c55e"
              />
              {countryRank > 0 && (
                <StatCard
                  compact
                  label={`${teamCountry} RANK`}
                  value={`#${countryRank}`}
                  subtitle={`of ${countryTotal}`}
                  color="#8b5cf6"
                />
              )}
              {stateRank > 0 && (
                <StatCard
                  compact
                  label={`${teamStateProv} RANK`}
                  value={`#${stateRank}`}
                  subtitle={`of ${stateTotal}`}
                  color="#6366f1"
                />
              )}
            </div>

            {/* Awards Section */}
            {teamAwards.length > 0 && (
              <div className={styles.panel} style={{ padding: "1.25rem", marginBottom: "1.5rem" }}>
                <h3 className={styles.sectionTitle} style={{ textAlign: "center" }}>
                  {yearprov} Awards
                </h3>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", justifyContent: "center" }}>
                  {teamAwards.map((award: any, i: number) => (
                    <span
                      key={i}
                      style={{
                        padding: "0.35rem 0.75rem",
                        borderRadius: 8,
                        background: "var(--gray-more)",
                        color: "#eab308",
                        fontSize: "0.85rem",
                        fontWeight: 600,
                      }}
                    >
                      {award.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3
                style={{
                  color: "var(--foreground)",
                  textAlign: "center",
                  marginBottom: "1.5rem",
                  fontSize: "1.5rem",
                }}
              >
                Event Performance
              </h3>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fill, minmax(min(100%, 300px), 1fr))",
                  gap: "1rem",
                }}
              >
                {teamStats.teamData.map((event: EventDataType) => (
                  <EventCard
                    key={event.event}
                    event={event}
                    yearprov={yearprov}
                  />
                ))}
              </div>
            </div>
          </div>

          {teamMedia.length > 0 && (
            <div>
              <TeamImageGallery
                images={teamMedia}
                teamKey={teamKey}
                year={yearprov}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
