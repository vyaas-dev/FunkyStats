"use client";

import { useEffect, useState } from "react";
import TeamLink from "@/app/components/TeamLink";

interface MatchDetailModalProps {
  matchKey: string;
  year?: string;
  match: {
    preds: string[];
    red: string[];
    blue: string[];
    result: number[];
  };
  onClose: () => void;
}

interface AllianceBreakdown {
  score: number;
  [key: string]: number | string | boolean | undefined | null;
}

interface MatchDetails {
  key?: string;
  videos?: Array<{
    type: string;
    key: string;
  }>;
  score_breakdown?: {
    red?: AllianceBreakdown;
    blue?: AllianceBreakdown;
  };
  alliances?: {
    red: {
      score: number;
      team_keys: string[];
    };
    blue: {
      score: number;
      team_keys: string[];
    };
  };
}

export default function MatchDetailModal({
  matchKey,
  year = "2026",
  match,
  onClose,
}: MatchDetailModalProps) {
  const [matchDetails, setMatchDetails] = useState<MatchDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMatchDetails() {
      try {
        const res = await fetch(
          `/api/match-details?matchKey=${encodeURIComponent(matchKey)}&year=${encodeURIComponent(year)}`
        );
        if (!res.ok) throw new Error("Failed to fetch match details");
        const data = await res.json();
        setMatchDetails(data);
      } catch (err) {
        console.error("Error fetching match details:", err);
        setError("Failed to load match details");
      } finally {
        setLoading(false);
      }
    }

    fetchMatchDetails();
  }, [matchKey]);

  useEffect(() => {
    // Prevent body scroll when modal is open
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  const [predRed, predBlue] = match.preds;
  const hasResult = match.result && match.result.length === 2;
  const [actualRed, actualBlue] = hasResult ? match.result : [null, null];

  const predWinner = Number(predRed) > Number(predBlue) ? "red" : "blue";
  const actualWinner =
    hasResult && actualRed !== null && actualBlue !== null
      ? actualRed > actualBlue
        ? "red"
        : actualBlue > actualRed
        ? "blue"
        : "tie"
      : null;

  const isPredictionCorrect =
    actualWinner !== null &&
    actualWinner !== "tie" &&
    predWinner === actualWinner;

  const scoreBreakdown = matchDetails?.score_breakdown;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.8)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "2rem",
        overflow: "auto",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--background)",
          borderRadius: 12,
          maxWidth: "900px",
          width: "100%",
          maxHeight: "90vh",
          overflow: "auto",
          position: "relative",
          border: "2px solid var(--border-color)",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "1rem",
            right: "1rem",
            background: "rgba(255, 255, 255, 0.1)",
            border: "1px solid var(--border-color)",
            borderRadius: 6,
            width: 32,
            height: 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            fontSize: "1.25rem",
            color: "var(--foreground)",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
          }}
        >
          ×
        </button>

        <div style={{ padding: "2rem" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              marginBottom: "2rem",
              flexWrap: "wrap",
            }}
          >
            <h2
              style={{
                color: "var(--yellow-color)",
                fontSize: "1.75rem",
                fontWeight: "bold",
                margin: 0,
              }}
            >
              {matchKey}
            </h2>
            {isPredictionCorrect !== null && (
              <div
                style={{
                  background: isPredictionCorrect
                    ? "rgba(34, 197, 94, 0.15)"
                    : "rgba(239, 68, 68, 0.15)",
                  color: isPredictionCorrect ? "#22c55e" : "#ef4444",
                  padding: "0.35rem 0.75rem",
                  borderRadius: 6,
                  fontSize: "0.75rem",
                  fontWeight: "700",
                }}
              >
                {isPredictionCorrect
                  ? "✓ CORRECT PREDICTION"
                  : "✗ INCORRECT PREDICTION"}
              </div>
            )}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "1rem",
              marginBottom: "2rem",
            }}
          >
            <div
              style={{
                background: "rgba(255, 77, 77, 0.05)",
                border: `2px solid ${
                  hasResult && actualWinner === "red"
                    ? "#ff4d4d"
                    : "rgba(255, 77, 77, 0.3)"
                }`,
                borderRadius: 8,
                padding: "1rem",
                position: "relative",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "0.75rem",
                }}
              >
                <div
                  style={{
                    fontSize: "0.875rem",
                    fontWeight: "700",
                    color: "#ff4d4d",
                    letterSpacing: "0.05em",
                  }}
                >
                  RED ALLIANCE
                </div>
                {hasResult && actualWinner === "red" && (
                  <div
                    style={{
                      background: "#22c55e",
                      color: "#fff",
                      padding: "0.25rem 0.75rem",
                      borderRadius: 6,
                      fontSize: "0.75rem",
                      fontWeight: "700",
                      letterSpacing: "0.05em",
                    }}
                  >
                    WINNER
                  </div>
                )}
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                  marginBottom: "1rem",
                }}
              >
                {match.red.map((team) => (
                  <div
                    key={team}
                    style={{
                      background: "rgba(255, 77, 77, 0.15)",
                      padding: "0.5rem",
                      borderRadius: 6,
                      fontWeight: "600",
                      textAlign: "center",
                      fontSize: "1rem",
                    }}
                  >
                    <TeamLink teamKey={team} year={Number(year)} />
                  </div>
                ))}
              </div>
              <div
                style={{
                  borderTop: "1px solid rgba(255, 77, 77, 0.2)",
                  paddingTop: "0.75rem",
                }}
              >
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--gray-less)",
                    marginBottom: "0.25rem",
                  }}
                >
                  Predicted Score
                </div>
                <div
                  style={{
                    fontSize: "2rem",
                    fontWeight: "bold",
                    color: "#ff4d4d",
                  }}
                >
                  {Math.round(Number(predRed))}
                </div>
                {hasResult && (
                  <>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--gray-less)",
                        marginTop: "0.75rem",
                        marginBottom: "0.25rem",
                      }}
                    >
                      Actual Score
                    </div>
                    <div
                      style={{
                        fontSize: "2rem",
                        fontWeight: "bold",
                        color: "#ff6666",
                      }}
                    >
                      {actualRed}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div
              style={{
                background: "rgba(77, 140, 255, 0.05)",
                border: `2px solid ${
                  hasResult && actualWinner === "blue"
                    ? "#4d8cff"
                    : "rgba(77, 140, 255, 0.3)"
                }`,
                borderRadius: 8,
                padding: "1rem",
                position: "relative",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "0.75rem",
                }}
              >
                <div
                  style={{
                    fontSize: "0.875rem",
                    fontWeight: "700",
                    color: "#4d8cff",
                    letterSpacing: "0.05em",
                  }}
                >
                  BLUE ALLIANCE
                </div>
                {hasResult && actualWinner === "blue" && (
                  <div
                    style={{
                      background: "#22c55e",
                      color: "#fff",
                      padding: "0.25rem 0.75rem",
                      borderRadius: 6,
                      fontSize: "0.75rem",
                      fontWeight: "700",
                      letterSpacing: "0.05em",
                    }}
                  >
                    WINNER
                  </div>
                )}
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                  marginBottom: "1rem",
                }}
              >
                {match.blue.map((team) => (
                  <div
                    key={team}
                    style={{
                      background: "rgba(77, 140, 255, 0.15)",
                      padding: "0.5rem",
                      borderRadius: 6,
                      fontWeight: "600",
                      textAlign: "center",
                      fontSize: "1rem",
                    }}
                  >
                    <TeamLink teamKey={team} year={Number(year)} />
                  </div>
                ))}
              </div>
              <div
                style={{
                  borderTop: "1px solid rgba(77, 140, 255, 0.2)",
                  paddingTop: "0.75rem",
                }}
              >
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--gray-less)",
                    marginBottom: "0.25rem",
                  }}
                >
                  Predicted Score
                </div>
                <div
                  style={{
                    fontSize: "2rem",
                    fontWeight: "bold",
                    color: "#4d8cff",
                  }}
                >
                  {Math.round(Number(predBlue))}
                </div>
                {hasResult && (
                  <>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--gray-less)",
                        marginTop: "0.75rem",
                        marginBottom: "0.25rem",
                      }}
                    >
                      Actual Score
                    </div>
                    <div
                      style={{
                        fontSize: "2rem",
                        fontWeight: "bold",
                        color: "#6699ff",
                      }}
                    >
                      {actualBlue}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {loading ? (
            <div
              style={{
                textAlign: "center",
                padding: "2rem",
                color: "var(--gray-less)",
              }}
            >
              Loading match details...
            </div>
          ) : error ? (
            <div
              style={{
                textAlign: "center",
                padding: "2rem",
                color: "#ef4444",
              }}
            >
              {error}
            </div>
          ) : (
            <>
              {scoreBreakdown &&
                (scoreBreakdown.red || scoreBreakdown.blue) && (
                  <div style={{ marginBottom: "2rem" }}>
                    <h3
                      style={{
                        color: "var(--foreground)",
                        fontSize: "1.5rem",
                        marginBottom: "1.5rem",
                        fontWeight: "700",
                        textAlign: "center",
                      }}
                    >
                      Score Breakdown
                    </h3>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "1.5rem",
                      }}
                    >
                      {scoreBreakdown.red && (
                        <div
                          style={{
                            background: "rgba(255, 77, 77, 0.03)",
                            border: "2px solid rgba(255, 77, 77, 0.25)",
                            borderRadius: 12,
                            padding: "1.25rem",
                          }}
                        >
                          <div
                            style={{
                              fontSize: "1rem",
                              fontWeight: "700",
                              color: "#ff4d4d",
                              marginBottom: "1rem",
                              letterSpacing: "0.05em",
                              textTransform: "uppercase",
                            }}
                          >
                            Red Alliance
                          </div>
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "0.65rem",
                            }}
                          >
                            {Object.entries(scoreBreakdown.red)
                              .filter(([key]) => {
                                const lowerKey = key.toLowerCase();
                                return (
                                  lowerKey === "autopoints" ||
                                  lowerKey === "totalautopoints" ||
                                  lowerKey === "autotowerpoints" ||
                                  lowerKey === "autocoralcount" ||
                                  lowerKey === "automobilitypoints" ||
                                  lowerKey === "teleoppoints" ||
                                  lowerKey === "teleopcoralcount" ||
                                  lowerKey === "teleopfuelpoints" ||
                                  lowerKey === "fuelpoints" ||
                                  lowerKey === "algaepoints" ||
                                  lowerKey === "netalgaecount" ||
                                  lowerKey === "wallalgaecount" ||
                                  lowerKey === "endgamebargepoints" ||
                                  lowerKey === "endgametowerpoints" ||
                                  lowerKey === "endgameclimbpoints" ||
                                  lowerKey === "climbpoints" ||
                                  lowerKey === "adjustpoints" ||
                                  lowerKey === "totalpointsnoscore" ||
                                  lowerKey === "totalpoints" ||
                                  lowerKey === "foulcount"
                                );
                              })
                              .sort(([a], [b]) => {
                                const order = [
                                  "autopoints",
                                  "totalautopoints",
                                  "autotowerpoints",
                                  "autocoralcount",
                                  "automobilitypoints",
                                  "teleoppoints",
                                  "teleopcoralcount",
                                  "teleopfuelpoints",
                                  "fuelpoints",
                                  "algaepoints",
                                  "netalgaecount",
                                  "wallalgaecount",
                                  "endgamebargepoints",
                                  "endgametowerpoints",
                                  "endgameclimbpoints",
                                  "climbpoints",
                                  "adjustpoints",
                                  "totalpointsnoscore",
                                  "totalpoints",
                                  "foulcount",
                                ];
                                return (
                                  order.indexOf(a.toLowerCase()) -
                                  order.indexOf(b.toLowerCase())
                                );
                              })
                              .map(([key, value]) => {
                                const formattedKey = key
                                  .replace(/([A-Z])/g, " $1")
                                  .replace(/_/g, " ")
                                  .replace(/\b\w/g, (l) => l.toUpperCase())
                                  .trim();

                                return (
                                  <div
                                    key={key}
                                    style={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      alignItems: "center",
                                      padding: "0.5rem 0.75rem",
                                      background: "rgba(255, 77, 77, 0.05)",
                                      borderRadius: 6,
                                      borderLeft:
                                        "3px solid rgba(255, 77, 77, 0.4)",
                                    }}
                                  >
                                    <span
                                      style={{
                                        color: "var(--foreground)",
                                        fontSize: "0.9rem",
                                        fontWeight: "500",
                                      }}
                                    >
                                      {formattedKey}
                                    </span>
                                    <span
                                      style={{
                                        color: "#ff6666",
                                        fontWeight: "700",
                                        fontSize: "0.95rem",
                                      }}
                                    >
                                      {typeof value === "boolean"
                                        ? value
                                          ? "Yes"
                                          : "No"
                                        : String(value)}
                                    </span>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      )}
                      {scoreBreakdown.blue && (
                        <div
                          style={{
                            background: "rgba(77, 140, 255, 0.03)",
                            border: "2px solid rgba(77, 140, 255, 0.25)",
                            borderRadius: 12,
                            padding: "1.25rem",
                          }}
                        >
                          <div
                            style={{
                              fontSize: "1rem",
                              fontWeight: "700",
                              color: "#4d8cff",
                              marginBottom: "1rem",
                              letterSpacing: "0.05em",
                              textTransform: "uppercase",
                            }}
                          >
                            Blue Alliance
                          </div>
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "0.65rem",
                            }}
                          >
                            {Object.entries(scoreBreakdown.blue)
                              .filter(([key]) => {
                                const lowerKey = key.toLowerCase();
                                return (
                                  lowerKey === "autopoints" ||
                                  lowerKey === "totalautopoints" ||
                                  lowerKey === "autotowerpoints" ||
                                  lowerKey === "autocoralcount" ||
                                  lowerKey === "automobilitypoints" ||
                                  lowerKey === "teleoppoints" ||
                                  lowerKey === "teleopcoralcount" ||
                                  lowerKey === "teleopfuelpoints" ||
                                  lowerKey === "fuelpoints" ||
                                  lowerKey === "algaepoints" ||
                                  lowerKey === "netalgaecount" ||
                                  lowerKey === "wallalgaecount" ||
                                  lowerKey === "endgamebargepoints" ||
                                  lowerKey === "endgametowerpoints" ||
                                  lowerKey === "endgameclimbpoints" ||
                                  lowerKey === "climbpoints" ||
                                  lowerKey === "adjustpoints" ||
                                  lowerKey === "totalpointsnoscore" ||
                                  lowerKey === "totalpoints" ||
                                  lowerKey === "foulcount"
                                );
                              })
                              .sort(([a], [b]) => {
                                const order = [
                                  "autopoints",
                                  "totalautopoints",
                                  "autotowerpoints",
                                  "autocoralcount",
                                  "automobilitypoints",
                                  "teleoppoints",
                                  "teleopcoralcount",
                                  "teleopfuelpoints",
                                  "fuelpoints",
                                  "algaepoints",
                                  "netalgaecount",
                                  "wallalgaecount",
                                  "endgamebargepoints",
                                  "endgametowerpoints",
                                  "endgameclimbpoints",
                                  "climbpoints",
                                  "adjustpoints",
                                  "totalpointsnoscore",
                                  "totalpoints",
                                  "foulcount",
                                ];
                                return (
                                  order.indexOf(a.toLowerCase()) -
                                  order.indexOf(b.toLowerCase())
                                );
                              })
                              .map(([key, value]) => {
                                const formattedKey = key
                                  .replace(/([A-Z])/g, " $1")
                                  .replace(/_/g, " ")
                                  .replace(/\b\w/g, (l) => l.toUpperCase())
                                  .trim();

                                return (
                                  <div
                                    key={key}
                                    style={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      alignItems: "center",
                                      padding: "0.5rem 0.75rem",
                                      background: "rgba(77, 140, 255, 0.05)",
                                      borderRadius: 6,
                                      borderLeft:
                                        "3px solid rgba(77, 140, 255, 0.4)",
                                    }}
                                  >
                                    <span
                                      style={{
                                        color: "var(--foreground)",
                                        fontSize: "0.9rem",
                                        fontWeight: "500",
                                      }}
                                    >
                                      {formattedKey}
                                    </span>
                                    <span
                                      style={{
                                        color: "#6699ff",
                                        fontWeight: "700",
                                        fontSize: "0.95rem",
                                      }}
                                    >
                                      {typeof value === "boolean"
                                        ? value
                                          ? "Yes"
                                          : "No"
                                        : String(value)}
                                    </span>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              {matchDetails?.videos && matchDetails.videos.length > 0 && (
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "1rem",
                    }}
                  >
                    <h3
                      style={{
                        color: "var(--foreground)",
                        fontSize: "1.5rem",
                        fontWeight: "700",
                        margin: 0,
                      }}
                    >
                      Match Videos
                    </h3>
                    {matchDetails.videos.length > 1 && (
                      <div
                        style={{
                          background: "var(--yellow-color)",
                          color: "#000",
                          padding: "0.35rem 0.75rem",
                          borderRadius: 6,
                          fontSize: "0.75rem",
                          fontWeight: "700",
                        }}
                      >
                        {matchDetails.videos.length} Videos
                      </div>
                    )}
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        matchDetails.videos.length === 1 ? "1fr" : "1fr",
                      gap: "1.5rem",
                    }}
                  >
                    {matchDetails.videos.map((video, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: "var(--background-pred)",
                          border: "2px solid var(--border-color)",
                          borderRadius: 12,
                          overflow: "hidden",
                        }}
                      >
                        {(matchDetails.videos?.length ?? 0) > 1 && (
                          <div
                            style={{
                              background: "var(--gray-more)",
                              padding: "0.5rem 1rem",
                              borderBottom: "1px solid var(--border-color)",
                              fontSize: "0.85rem",
                              fontWeight: "600",
                              color: "var(--foreground)",
                            }}
                          >
                            Video {idx + 1} of {matchDetails.videos?.length}
                          </div>
                        )}
                        {video.type === "youtube" && (
                          <iframe
                            width="100%"
                            height="450"
                            src={`https://www.youtube.com/embed/${video.key}`}
                            title={`Match video ${idx + 1}`}
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            style={{ display: "block" }}
                          />
                        )}
                        {video.type !== "youtube" && (
                          <div
                            style={{
                              padding: "2rem",
                              textAlign: "center",
                              color: "var(--gray-less)",
                            }}
                          >
                            <a
                              href={`https://www.thebluealliance.com/match/${matchKey}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                color: "var(--yellow-color)",
                                textDecoration: "none",
                                fontSize: "1rem",
                                fontWeight: "600",
                              }}
                            >
                              View video on The Blue Alliance →
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(!matchDetails?.videos || matchDetails.videos?.length === 0) && (
                <div
                  style={{
                    textAlign: "center",
                    padding: "2rem",
                    background: "var(--background-pred)",
                    border: "1px solid var(--border-color)",
                    borderRadius: 8,
                    color: "var(--gray-less)",
                  }}
                >
                  <div style={{ marginBottom: "0.75rem" }}>
                    No videos available for this match yet
                  </div>
                  <a
                    href={`https://www.thebluealliance.com/match/${matchDetails?.key ?? matchKey}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: "var(--yellow-color)",
                      textDecoration: "none",
                      fontSize: "0.95rem",
                      fontWeight: "600",
                    }}
                  >
                    Open match on The Blue Alliance →
                  </a>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
