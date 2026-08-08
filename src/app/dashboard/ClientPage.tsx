"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "../page.module.css";
import TeamLink from "../components/TeamLink";

interface Event {
  key: string;
  value: string;
}

interface Team {
  key: string;
  rank: number;
  fsm: string;
  fuel: string;
  climb: string;
  foul: string;
  algae: string;
  coral: string;
  auto: string;
}

interface Ranking {
  rank: number;
  team_key: string;
  matches_played: number;
  qual_average: number;
  sort_orders: number[];
  record: {
    wins: number;
    losses: number;
    ties: number;
  };
}

interface MatchPrediction {
  preds: string[];
  red: string[];
  blue: string[];
  result: number[];
}

interface NexusScheduleData {
  scheduledTime: string | null;
  actualTime: string | null;
  status: string;
  label: string;
}

interface ClientPageProps {
  events: Event[];
}

function getMatchStatus(
  scheduledTime: string | null,
  actualTime: string | null
) {
  if (!scheduledTime || actualTime) return null;

  const now = new Date();
  const matchTime = new Date(scheduledTime);
  const timeDiff = matchTime.getTime() - now.getTime();
  const minutesDiff = Math.floor(timeDiff / 60000);

  if (timeDiff < -600000) return null;

  if (minutesDiff <= 5 && minutesDiff >= 0) {
    return "queuing";
  } else if (minutesDiff > 5 && minutesDiff <= 10) {
    return "ondeck";
  }

  return null;
}

function formatMatchTime(scheduledTime: string | null) {
  if (!scheduledTime) return null;

  const matchTime = new Date(scheduledTime);
  const now = new Date();
  const minutesDiff = Math.floor((matchTime.getTime() - now.getTime()) / 60000);

  const timeStr = matchTime.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return minutesDiff > 0 && minutesDiff <= 60
    ? `${timeStr} (${minutesDiff}m)`
    : timeStr;
}

function getWinProbability(redPred: number, bluePred: number) {
  const total = redPred + bluePred;
  if (total === 0) return { redProb: 50, blueProb: 50 };
  return {
    redProb: (redPred / total) * 100,
    blueProb: (bluePred / total) * 100,
  };
}

export default function ClientPage({ events }: ClientPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [selectedEvent, setSelectedEvent] = useState<string>(
    searchParams.get("event") || ""
  );
  const [selectedTeam, setSelectedTeam] = useState<string>(
    searchParams.get("team") || ""
  );
  const [tempVideoUrl, setTempVideoUrl] = useState<string>("");
  const [confirmedVideoUrl, setConfirmedVideoUrl] = useState<string>("");
  const [teams, setTeams] = useState<Team[]>([]);
  const [eventSearchQuery, setEventSearchQuery] = useState<string>("");
  const [isEventDropdownOpen, setIsEventDropdownOpen] = useState(false);
  const [matchPredictions, setMatchPredictions] = useState<{
    [key: string]: MatchPrediction;
  }>({});
  const [nexusSchedule, setNexusSchedule] = useState<{
    [key: string]: NexusScheduleData;
  }>({});
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const handleConfirmVideo = () => {
    setConfirmedVideoUrl(tempVideoUrl);
  };

  const handleClearVideo = () => {
    setConfirmedVideoUrl("");
    setTempVideoUrl("");
  };

  const getEmbedUrl = (url: string): string | null => {
    if (!url) return null;

    if (url.includes("youtube.com/watch")) {
      const videoId = url.split("v=")[1]?.split("&")[0];
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }
    if (url.includes("youtu.be/")) {
      const videoId = url.split("youtu.be/")[1]?.split("?")[0];
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }

    if (url.includes("twitch.tv/")) {
      const channel = url.split("twitch.tv/")[1]?.split("?")[0].split("/")[0];
      return channel
        ? `https://player.twitch.tv/?channel=${channel}&parent=${window.location.hostname}`
        : null;
    }

    if (url.includes("youtube.com/embed") || url.includes("player.twitch.tv")) {
      return url;
    }

    return null;
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!selectedEvent) {
      setTeams([]);
      setSelectedTeam("");
      setRankings([]);
      setMatchPredictions({});
      setNexusSchedule({});
      return;
    }

    let cancelled = false;

    const refreshData = async () => {
      setLoading(true);
      try {
        const [teamsRes, rankingsRes, predictionsRes, nexusRes] =
          await Promise.all([
            fetch(`/api/event-teams?event=${selectedEvent}`),
            fetch(`/api/event-rankings?event=${selectedEvent}`),
            fetch(`/api/match-predictions?event=${selectedEvent}`),
            fetch(`/api/nexus-schedule?event=${selectedEvent}`),
          ]);

        if (cancelled) return;

        if (teamsRes.ok) {
          setTeams(await teamsRes.json());
        }

        if (rankingsRes.ok) {
          const rankingsData = await rankingsRes.json();
          if (rankingsData.rankings) {
            setRankings(rankingsData.rankings);
          }
        }

        if (predictionsRes.ok) {
          setMatchPredictions(await predictionsRes.json());
        }

        if (nexusRes.ok) {
          setNexusSchedule(await nexusRes.json());
        }
      } catch (error) {
        console.error("Error refreshing dashboard data:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    refreshData();
    const refreshInterval = setInterval(refreshData, 60000);

    return () => {
      cancelled = true;
      clearInterval(refreshInterval);
    };
  }, [selectedEvent]);

  const updateURLParams = (event: string, team: string) => {
    const params = new URLSearchParams();
    if (event) params.set("event", event);
    if (team) params.set("team", team);
    const newURL = params.toString()
      ? `/dashboard?${params.toString()}`
      : "/dashboard";
    router.push(newURL);
  };

  const handleClearSelection = () => {
    setSelectedEvent("");
    setSelectedTeam("");
    setEventSearchQuery("");
    router.push("/dashboard");
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-event-dropdown]")) {
        setIsEventDropdownOpen(false);
      }
    };

    if (isEventDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isEventDropdownOpen]);

  const teamUpcomingMatches = useMemo(() => {
    if (!selectedTeam) return [];

    const matches = Object.entries(matchPredictions).filter(([key, match]) => {
      const hasTeam =
        match.red.includes(selectedTeam) || match.blue.includes(selectedTeam);
      const hasResult = match.result[0] !== -1 && match.result[1] !== -1;
      const scheduleData = nexusSchedule[key];
      const isPast = scheduleData?.actualTime || hasResult;

      return hasTeam && !isPast;
    });

    matches.sort(([keyA], [keyB]) => {
      const scheduleA = nexusSchedule[keyA];
      const scheduleB = nexusSchedule[keyB];

      if (scheduleA?.scheduledTime && scheduleB?.scheduledTime) {
        return (
          new Date(scheduleA.scheduledTime).getTime() -
          new Date(scheduleB.scheduledTime).getTime()
        );
      }

      const numA = parseInt(keyA.match(/\d+/)?.[0] ?? "0", 10);
      const numB = parseInt(keyB.match(/\d+/)?.[0] ?? "0", 10);
      return numA - numB;
    });

    return matches.slice(0, 5);
  }, [selectedTeam, matchPredictions, nexusSchedule, currentTime]);

  const teamRecentMatches = useMemo(() => {
    if (!selectedTeam) return [];

    const matches = Object.entries(matchPredictions).filter(([key, match]) => {
      const hasTeam =
        match.red.includes(selectedTeam) || match.blue.includes(selectedTeam);
      const hasResult = match.result[0] !== -1 && match.result[1] !== -1;
      const scheduleData = nexusSchedule[key];
      const isPast = scheduleData?.actualTime || hasResult;

      return hasTeam && isPast;
    });

    matches.sort(([keyA], [keyB]) => {
      const scheduleA = nexusSchedule[keyA];
      const scheduleB = nexusSchedule[keyB];

      if (scheduleA?.scheduledTime && scheduleB?.scheduledTime) {
        return (
          new Date(scheduleB.scheduledTime).getTime() -
          new Date(scheduleA.scheduledTime).getTime()
        );
      }

      const numA = parseInt(keyA.match(/\d+/)?.[0] ?? "0", 10);
      const numB = parseInt(keyB.match(/\d+/)?.[0] ?? "0", 10);
      return numB - numA;
    });

    return matches.slice(0, 3);
  }, [selectedTeam, matchPredictions, nexusSchedule, currentTime]);

  const sortedTeams = useMemo(() => {
    return [...teams].sort((a, b) => Number(b.fsm) - Number(a.fsm));
  }, [teams]);

  const sortedTeamsForDropdown = useMemo(() => {
    return [...teams].sort((a, b) => {
      const teamNumA = parseInt(a.key.replace("frc", ""), 10);
      const teamNumB = parseInt(b.key.replace("frc", ""), 10);
      return teamNumA - teamNumB;
    });
  }, [teams]);

  const event2026Options = events.filter((e) => e.key.startsWith("2026"));

  const filteredEvents = useMemo(() => {
    if (!eventSearchQuery.trim()) return event2026Options;
    const query = eventSearchQuery.toLowerCase();
    return event2026Options.filter(
      (event) =>
        event.key.toLowerCase().includes(query) ||
        event.value.toLowerCase().includes(query)
    );
  }, [eventSearchQuery, event2026Options]);

  const selectedEventName = useMemo(() => {
    const event = events.find((e) => e.key === selectedEvent);
    return event ? event.value : "";
  }, [selectedEvent, events]);

  const handleSelectEvent = (eventKey: string) => {
    setSelectedEvent(eventKey);
    setIsEventDropdownOpen(false);
    setEventSearchQuery("");
    updateURLParams(eventKey, "");
  };

  return (
    <div
      className={styles.page}
      style={{
        position: "relative",
        minHeight: "100vh",
        width: "100vw",
        maxWidth: "100%",
      }}
    >
      <main className={styles.main} style={{ padding: "1rem" }}>
        {(!selectedEvent || !selectedTeam) && (
          <>
            <h1 className={styles.pageTitle}>Dashboard</h1>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
                width: "100%",
                maxWidth: "1200px",
                padding: "1rem",
                marginBottom: "2rem",
                marginLeft: "auto",
                marginRight: "auto",
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: "1rem",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div
                  style={{ flex: "1 1 250px", position: "relative" }}
                  data-event-dropdown
                >
                  <label
                    htmlFor="event-select"
                    style={{
                      display: "block",
                      marginBottom: "0.5rem",
                      fontWeight: "600",
                      color: "var(--yellow-color)",
                      fontSize: "0.875rem",
                      letterSpacing: "0.05em",
                    }}
                  >
                    EVENT
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type="text"
                      placeholder={
                        selectedEvent ? selectedEventName : "Search events..."
                      }
                      value={eventSearchQuery}
                      onChange={(e) => {
                        setEventSearchQuery(e.target.value);
                        setIsEventDropdownOpen(true);
                      }}
                      onFocus={() => setIsEventDropdownOpen(true)}
                      style={{
                        width: "100%",
                        padding: "0.75rem",
                        paddingRight: "2.5rem",
                        borderRadius: 8,
                        border: "1px solid var(--border-color)",
                        background: "var(--input-bg)",
                        color: "var(--input-text)",
                        fontSize: "1rem",
                      }}
                    />
                    <button
                      onClick={() =>
                        setIsEventDropdownOpen(!isEventDropdownOpen)
                      }
                      style={{
                        position: "absolute",
                        right: "0.5rem",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        color: "var(--foreground)",
                        cursor: "pointer",
                        fontSize: "1.2rem",
                        padding: "0.25rem",
                      }}
                    >
                      {isEventDropdownOpen ? "▲" : "▼"}
                    </button>
                    {selectedEvent && (
                      <button
                        onClick={() => {
                          setSelectedEvent("");
                          setEventSearchQuery("");
                          router.push("/dashboard");
                        }}
                        style={{
                          position: "absolute",
                          right: "2rem",
                          top: "50%",
                          transform: "translateY(-50%)",
                          background: "none",
                          border: "none",
                          color: "var(--gray-less)",
                          cursor: "pointer",
                          fontSize: "1rem",
                          padding: "0.25rem",
                        }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  {isEventDropdownOpen && (
                    <div
                      style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        right: 0,
                        marginTop: "0.25rem",
                        maxHeight: "300px",
                        overflowY: "auto",
                        background: "var(--input-bg)",
                        border: "1px solid var(--border-color)",
                        borderRadius: 8,
                        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                        zIndex: 1000,
                      }}
                    >
                      {filteredEvents.length > 0 ? (
                        filteredEvents.map((event) => (
                          <div
                            key={event.key}
                            onClick={() => handleSelectEvent(event.key)}
                            style={{
                              padding: "0.75rem",
                              cursor: "pointer",
                              background:
                                event.key === selectedEvent
                                  ? "var(--yellow-color)"
                                  : "transparent",
                              color:
                                event.key === selectedEvent
                                  ? "#000"
                                  : "var(--input-text)",
                              transition: "background 0.2s",
                              fontSize: "0.9rem",
                            }}
                            onMouseEnter={(e) => {
                              if (event.key !== selectedEvent) {
                                e.currentTarget.style.background =
                                  "var(--gray-more)";
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (event.key !== selectedEvent) {
                                e.currentTarget.style.background =
                                  "transparent";
                              }
                            }}
                          >
                            {event.value}
                          </div>
                        ))
                      ) : (
                        <div
                          style={{
                            padding: "1rem",
                            textAlign: "center",
                            color: "var(--gray-less)",
                            fontSize: "0.9rem",
                          }}
                        >
                          No events found
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div style={{ flex: "1 1 250px" }}>
                  <label
                    htmlFor="team-select"
                    style={{
                      display: "block",
                      marginBottom: "0.5rem",
                      fontWeight: "600",
                      color: "var(--yellow-color)",
                      fontSize: "0.875rem",
                      letterSpacing: "0.05em",
                    }}
                  >
                    TEAM
                  </label>
                  <select
                    id="team-select"
                    value={selectedTeam}
                    onChange={(e) => {
                      const newTeam = e.target.value;
                      setSelectedTeam(newTeam);
                      updateURLParams(selectedEvent, newTeam);
                    }}
                    disabled={!selectedEvent || loading}
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      borderRadius: 8,
                      border: "1px solid var(--border-color)",
                      background: "var(--input-bg)",
                      color: "var(--input-text)",
                      fontSize: "1rem",
                      cursor:
                        !selectedEvent || loading ? "not-allowed" : "pointer",
                      opacity: !selectedEvent || loading ? 0.6 : 1,
                    }}
                  >
                    <option value="">Select Team</option>
                    {sortedTeamsForDropdown.map((team) => (
                      <option key={team.key} value={team.key}>
                        {team.key.replace("frc", "")}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </>
        )}

        {selectedEvent && selectedTeam && (
          <div
            style={{
              display: "flex",
              gap: "1rem",
              width: "100%",
              maxWidth: "calc(100vw - 2rem)",
              alignItems: "flex-start",
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                flex: "1 1 500px",
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
              }}
            >
              {teamUpcomingMatches.length > 0 && (
                <div
                  style={{
                    background: "var(--gray-more)",
                    padding: "0.75rem",
                    borderRadius: 10,
                    border: "2px solid var(--border-color)",
                    boxShadow:
                      "0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.04)",
                  }}
                >
                  <h2
                    style={{
                      color: "var(--yellow-color)",
                      fontSize: "0.95rem",
                      fontWeight: "bold",
                      marginBottom: "0.75rem",
                      letterSpacing: "0.025em",
                    }}
                  >
                    Upcoming Matches for {selectedTeam.replace("frc", "")}
                  </h2>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      gap: "0.5rem",
                      overflowX: "auto",
                      flexWrap: "wrap",
                    }}
                  >
                    {teamUpcomingMatches.map(([matchKey, match]) => {
                      const scheduleData = nexusSchedule[matchKey];
                      const matchStatus = getMatchStatus(
                        scheduleData?.scheduledTime,
                        scheduleData?.actualTime
                      );
                      const matchTime = scheduleData?.scheduledTime
                        ? formatMatchTime(scheduleData.scheduledTime)
                        : null;
                      const [predRed, predBlue] = match.preds;
                      const predWinner =
                        Number(predRed) > Number(predBlue) ? "red" : "blue";

                      return (
                        <div
                          key={matchKey}
                          style={{
                            border: "2px solid var(--border-color)",
                            borderRadius: 6,
                            padding: "0.5rem",
                            background: "var(--background-pred)",
                            boxShadow:
                              "0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.06)",
                            minWidth: "280px",
                            flex: "1 1 auto",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: "0.4rem",
                              paddingBottom: "0.4rem",
                              borderBottom: "1px solid var(--border-color)",
                            }}
                          >
                            <span
                              style={{
                                fontWeight: "bold",
                                fontSize: "0.8rem",
                                color: "var(--yellow-color)",
                              }}
                            >
                              {matchKey.split("_")[1] || matchKey}
                            </span>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.3rem",
                              }}
                            >
                              {matchTime && (
                                <span
                                  style={{
                                    color: "var(--gray-less)",
                                    fontSize: "0.65rem",
                                    fontWeight: "500",
                                  }}
                                >
                                  🕐 {matchTime}
                                </span>
                              )}
                              {matchStatus === "queuing" && (
                                <div
                                  style={{
                                    background: "rgba(245, 158, 11, 0.2)",
                                    color: "#f59e0b",
                                    padding: "0.15rem 0.4rem",
                                    borderRadius: 4,
                                    fontSize: "0.6rem",
                                    fontWeight: "700",
                                  }}
                                >
                                  🟡 QUEUE
                                </div>
                              )}
                              {matchStatus === "ondeck" && (
                                <div
                                  style={{
                                    background: "rgba(59, 130, 246, 0.2)",
                                    color: "#3b82f6",
                                    padding: "0.15rem 0.4rem",
                                    borderRadius: 4,
                                    fontSize: "0.6rem",
                                    fontWeight: "700",
                                  }}
                                >
                                  🔵 DECK
                                </div>
                              )}
                            </div>
                          </div>

                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "0.4rem",
                            }}
                          >
                            {[
                              {
                                label: "RED",
                                teams: match.red,
                                bg: "rgba(255, 77, 77, 0.1)",
                                color: "#ff6666",
                                border: "rgba(255, 77, 77, 0.3)",
                                score: predRed,
                                isWinner: predWinner === "red",
                              },
                              {
                                label: "BLUE",
                                teams: match.blue,
                                bg: "rgba(77, 140, 255, 0.1)",
                                color: "#6699ff",
                                border: "rgba(77, 140, 255, 0.3)",
                                score: predBlue,
                                isWinner: predWinner === "blue",
                              },
                            ].map((alliance, idx) => (
                              <div
                                key={idx}
                                style={{
                                  background: alliance.bg,
                                  padding: "0.4rem",
                                  borderRadius: 5,
                                  border: `1px solid ${alliance.border}`,
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                  }}
                                >
                                  <div
                                    style={{
                                      display: "flex",
                                      gap: "0.3rem",
                                      flexWrap: "wrap",
                                      alignItems: "center",
                                      flex: 1,
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontSize: "0.6rem",
                                        fontWeight: "700",
                                        color: alliance.color,
                                        letterSpacing: "0.05em",
                                      }}
                                    >
                                      {alliance.label}
                                    </span>
                                    {alliance.teams.map((t) => {
                                      const isSelectedTeam = t === selectedTeam;
                                      return (
                                        <span
                                          key={t}
                                          style={{
                                            background: isSelectedTeam
                                              ? "var(--yellow-color)"
                                              : `rgba(${
                                                  idx === 0
                                                    ? "255, 77, 77"
                                                    : "77, 140, 255"
                                                }, 0.2)`,
                                            color: isSelectedTeam
                                              ? "#000"
                                              : alliance.color,
                                            padding: "0.25rem 0.4rem",
                                            borderRadius: 4,
                                            fontWeight: isSelectedTeam
                                              ? "bold"
                                              : "600",
                                            fontSize: "0.7rem",
                                            border: isSelectedTeam
                                              ? "2px solid var(--yellow-color)"
                                              : `1px solid ${alliance.border}`,
                                          }}
                                        >
                                          <TeamLink teamKey={t} year={2026} />
                                        </span>
                                      );
                                    })}
                                  </div>
                                  <div
                                    style={{
                                      display: "flex",
                                      flexDirection: "column",
                                      alignItems: "flex-end",
                                      marginLeft: "0.5rem",
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontSize: "1.1rem",
                                        fontWeight: "bold",
                                        color: alliance.color,
                                      }}
                                    >
                                      {alliance.score}
                                    </span>
                                    {alliance.isWinner && (
                                      <span
                                        style={{
                                          fontSize: "0.55rem",
                                          color: alliance.color,
                                          fontWeight: "700",
                                          letterSpacing: "0.05em",
                                        }}
                                      >
                                        WIN
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>

                          {(() => {
                            const { redProb, blueProb } = getWinProbability(
                              Number(predRed),
                              Number(predBlue)
                            );
                            return (
                              <div style={{ marginTop: "0.4rem" }}>
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    marginBottom: "0.15rem",
                                  }}
                                >
                                  <span
                                    style={{
                                      fontSize: "0.65rem",
                                      fontWeight: 600,
                                      color: "#ff4d4d",
                                    }}
                                  >
                                    Red {redProb.toFixed(0)}%
                                  </span>
                                  <span
                                    style={{
                                      fontSize: "0.65rem",
                                      fontWeight: 600,
                                      color: "#4d8cff",
                                    }}
                                  >
                                    {blueProb.toFixed(0)}% Blue
                                  </span>
                                </div>
                                <div
                                  style={{
                                    display: "flex",
                                    height: 6,
                                    borderRadius: 3,
                                    overflow: "hidden",
                                  }}
                                >
                                  <div
                                    style={{
                                      width: `${redProb}%`,
                                      background: "#ff4d4d",
                                    }}
                                  />
                                  <div
                                    style={{
                                      width: `${blueProb}%`,
                                      background: "#4d8cff",
                                    }}
                                  />
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {teamUpcomingMatches.length === 0 && (
                <div
                  style={{
                    background: "var(--background-pred)",
                    padding: "3rem",
                    borderRadius: 12,
                    border: "2px solid var(--border-color)",
                    textAlign: "center",
                    color: "var(--gray-less)",
                  }}
                >
                  <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>
                    📅
                  </div>
                  <h3 style={{ fontSize: "1.25rem", fontWeight: "bold" }}>
                    No Upcoming Matches
                  </h3>
                  <p style={{ fontSize: "0.9rem", marginTop: "0.5rem" }}>
                    All matches for this team have been played
                  </p>
                </div>
              )}

              <div
                style={{
                  background: "var(--gray-more)",
                  padding: "0.75rem",
                  borderRadius: 10,
                  border: "2px solid var(--border-color)",
                  boxShadow:
                    "0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.04)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "1rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <h3
                      style={{
                        color: "var(--yellow-color)",
                        fontSize: "1rem",
                        fontWeight: "700",
                        letterSpacing: "0.05em",
                        margin: 0,
                      }}
                    >
                      EVENT LIVESTREAM
                    </h3>
                  </div>
                  {confirmedVideoUrl && (
                    <button
                      onClick={handleClearVideo}
                      style={{
                        padding: "0.4rem 0.8rem",
                        borderRadius: 6,
                        border: "1px solid var(--border-color)",
                        background: "var(--background-pred)",
                        color: "var(--foreground)",
                        fontWeight: "600",
                        fontSize: "0.75rem",
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "var(--gray-more)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background =
                          "var(--background-pred)";
                      }}
                    >
                      ✕ Clear
                    </button>
                  )}
                </div>

                {!confirmedVideoUrl ? (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.75rem",
                    }}
                  >
                    <input
                      id="video-url"
                      type="text"
                      value={tempVideoUrl}
                      onChange={(e) => setTempVideoUrl(e.target.value)}
                      placeholder="Enter livestream URL (YouTube, Twitch, etc.)"
                      style={{
                        width: "100%",
                        padding: "0.75rem",
                        borderRadius: 8,
                        border: "1px solid var(--border-color)",
                        background: "var(--input-bg)",
                        color: "var(--input-text)",
                        fontSize: "0.95rem",
                      }}
                    />
                    <button
                      onClick={handleConfirmVideo}
                      disabled={!tempVideoUrl.trim()}
                      style={{
                        padding: "0.5rem 1rem",
                        borderRadius: 6,
                        border: "none",
                        background: tempVideoUrl.trim()
                          ? "var(--yellow-color)"
                          : "var(--gray-more)",
                        color: tempVideoUrl.trim()
                          ? "#000"
                          : "var(--gray-less)",
                        fontWeight: "600",
                        fontSize: "0.85rem",
                        cursor: tempVideoUrl.trim() ? "pointer" : "not-allowed",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        if (tempVideoUrl.trim()) {
                          e.currentTarget.style.opacity = "0.9";
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.opacity = "1";
                      }}
                    >
                      ✓ Confirm Video
                    </button>
                    {!tempVideoUrl && (
                      <div
                        style={{
                          padding: "3rem 1rem",
                          textAlign: "center",
                          color: "var(--gray-less)",
                          background: "var(--background-pred)",
                          borderRadius: 8,
                          border: "1px solid var(--border-color)",
                        }}
                      >
                        <div
                          style={{ fontSize: "3rem", marginBottom: "0.5rem" }}
                        >
                          📺
                        </div>
                        <p
                          style={{
                            fontSize: "0.85rem",
                            margin: 0,
                            fontStyle: "italic",
                          }}
                        >
                          No livestream configured
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.75rem",
                    }}
                  >
                    {getEmbedUrl(confirmedVideoUrl) ? (
                      <div
                        style={{
                          position: "relative",
                          paddingBottom: "56.25%",
                          height: 0,
                          overflow: "hidden",
                          borderRadius: 8,
                          background: "#000",
                        }}
                      >
                        <iframe
                          src={getEmbedUrl(confirmedVideoUrl) || ""}
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: "100%",
                            border: "none",
                            borderRadius: 8,
                          }}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    ) : (
                      <div
                        style={{
                          padding: "3rem 1rem",
                          textAlign: "center",
                          background: "var(--background-pred)",
                          borderRadius: 8,
                          border: "1px solid var(--border-color)",
                        }}
                      >
                        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>
                          ⚠️
                        </div>
                        <p
                          style={{
                            color: "var(--foreground)",
                            fontSize: "0.9rem",
                            marginBottom: "1rem",
                          }}
                        >
                          Unable to embed this video
                        </p>
                        <a
                          href={confirmedVideoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            padding: "0.5rem 1rem",
                            borderRadius: 6,
                            background: "#22c55e",
                            color: "#fff",
                            fontWeight: "600",
                            fontSize: "0.85rem",
                            textDecoration: "none",
                            display: "inline-block",
                          }}
                        >
                          ▶ Open in New Tab
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {teamRecentMatches.length > 0 && (
                <div
                  style={{
                    background: "var(--gray-more)",
                    padding: "0.6rem",
                    borderRadius: 10,
                    border: "2px solid var(--border-color)",
                    boxShadow:
                      "0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.04)",
                  }}
                >
                  <h2
                    style={{
                      color: "var(--yellow-color)",
                      fontSize: "0.8rem",
                      fontWeight: "bold",
                      marginBottom: "0.5rem",
                      letterSpacing: "0.025em",
                      textAlign: "center",
                    }}
                  >
                    Recent Matches for {selectedTeam.replace("frc", "")}
                  </h2>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      gap: "0.5rem",
                      overflowX: "auto",
                    }}
                  >
                    {teamRecentMatches.map(([matchKey, match]) => {
                      const [predRed, predBlue] = match.preds;
                      const [actualRed, actualBlue] = match.result;
                      const actualWinner =
                        actualRed > actualBlue
                          ? "red"
                          : actualBlue > actualRed
                          ? "blue"
                          : "tie";
                      const isOnRed = match.red.includes(selectedTeam);
                      const teamWon =
                        (isOnRed && actualWinner === "red") ||
                        (!isOnRed && actualWinner === "blue");

                      return (
                        <div
                          key={matchKey}
                          style={{
                            border: `2px solid ${
                              teamWon
                                ? "#22c55e"
                                : actualWinner === "tie"
                                ? "var(--border-color)"
                                : "#ef4444"
                            }`,
                            borderRadius: 5,
                            padding: "0.4rem",
                            background: "var(--background-pred)",
                            boxShadow:
                              "0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.06)",
                            minWidth: "220px",
                            flex: "0 0 auto",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: "0.3rem",
                              paddingBottom: "0.3rem",
                              borderBottom: "1px solid var(--border-color)",
                            }}
                          >
                            <span
                              style={{
                                fontWeight: "bold",
                                fontSize: "0.7rem",
                                color: "var(--yellow-color)",
                              }}
                            >
                              {matchKey.split("_")[1] || matchKey}
                            </span>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.25rem",
                              }}
                            >
                              {teamWon && (
                                <div
                                  style={{
                                    background: "rgba(34, 197, 94, 0.2)",
                                    color: "#22c55e",
                                    padding: "0.1rem 0.3rem",
                                    borderRadius: 3,
                                    fontSize: "0.55rem",
                                    fontWeight: "700",
                                  }}
                                >
                                  ✓ W
                                </div>
                              )}
                              {!teamWon && actualWinner !== "tie" && (
                                <div
                                  style={{
                                    background: "rgba(239, 68, 68, 0.2)",
                                    color: "#ef4444",
                                    padding: "0.1rem 0.3rem",
                                    borderRadius: 3,
                                    fontSize: "0.55rem",
                                    fontWeight: "700",
                                  }}
                                >
                                  ✗ L
                                </div>
                              )}
                            </div>
                          </div>

                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "0.3rem",
                            }}
                          >
                            {[
                              {
                                label: "RED",
                                teams: match.red,
                                bg: "rgba(255, 77, 77, 0.1)",
                                color: "#ff6666",
                                border: "rgba(255, 77, 77, 0.3)",
                                actualScore: actualRed,
                                predScore: predRed,
                                isWinner: actualWinner === "red",
                              },
                              {
                                label: "BLUE",
                                teams: match.blue,
                                bg: "rgba(77, 140, 255, 0.1)",
                                color: "#6699ff",
                                border: "rgba(77, 140, 255, 0.3)",
                                actualScore: actualBlue,
                                predScore: predBlue,
                                isWinner: actualWinner === "blue",
                              },
                            ].map((alliance, idx) => (
                              <div
                                key={idx}
                                style={{
                                  background: alliance.bg,
                                  padding: "0.3rem",
                                  borderRadius: 4,
                                  border: alliance.isWinner
                                    ? `2px solid ${alliance.color}`
                                    : `1px solid ${alliance.border}`,
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                  }}
                                >
                                  <div
                                    style={{
                                      display: "flex",
                                      gap: "0.2rem",
                                      flexWrap: "wrap",
                                      alignItems: "center",
                                      flex: 1,
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontSize: "0.5rem",
                                        fontWeight: "700",
                                        color: alliance.color,
                                        letterSpacing: "0.05em",
                                      }}
                                    >
                                      {alliance.label}
                                    </span>
                                    {alliance.teams.map((t) => {
                                      const isSelectedTeam = t === selectedTeam;
                                      return (
                                        <span
                                          key={t}
                                          style={{
                                            background: isSelectedTeam
                                              ? "var(--yellow-color)"
                                              : `rgba(${
                                                  idx === 0
                                                    ? "255, 77, 77"
                                                    : "77, 140, 255"
                                                }, 0.2)`,
                                            color: isSelectedTeam
                                              ? "#000"
                                              : alliance.color,
                                            padding: "0.15rem 0.3rem",
                                            borderRadius: 3,
                                            fontWeight: isSelectedTeam
                                              ? "bold"
                                              : "600",
                                            fontSize: "0.6rem",
                                            border: isSelectedTeam
                                              ? "2px solid var(--yellow-color)"
                                              : `1px solid ${alliance.border}`,
                                          }}
                                        >
                                          <TeamLink teamKey={t} year={2026} />
                                        </span>
                                      );
                                    })}
                                  </div>
                                  <div
                                    style={{
                                      display: "flex",
                                      flexDirection: "column",
                                      alignItems: "flex-end",
                                      marginLeft: "0.3rem",
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontSize: "0.9rem",
                                        fontWeight: "bold",
                                        color: alliance.color,
                                      }}
                                    >
                                      {alliance.actualScore}
                                    </span>
                                    <span
                                      style={{
                                        fontSize: "0.5rem",
                                        color: alliance.color,
                                        fontWeight: "600",
                                        opacity: 0.7,
                                      }}
                                    >
                                      p:{alliance.predScore}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>

                          {(() => {
                            const { redProb, blueProb } = getWinProbability(
                              Number(predRed),
                              Number(predBlue)
                            );
                            return (
                              <div style={{ marginTop: "0.3rem" }}>
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    marginBottom: "0.15rem",
                                  }}
                                >
                                  <span
                                    style={{
                                      fontSize: "0.65rem",
                                      fontWeight: 600,
                                      color: "#ff4d4d",
                                    }}
                                  >
                                    Red {redProb.toFixed(0)}%
                                  </span>
                                  <span
                                    style={{
                                      fontSize: "0.65rem",
                                      fontWeight: 600,
                                      color: "#4d8cff",
                                    }}
                                  >
                                    {blueProb.toFixed(0)}% Blue
                                  </span>
                                </div>
                                <div
                                  style={{
                                    display: "flex",
                                    height: 6,
                                    borderRadius: 3,
                                    overflow: "hidden",
                                  }}
                                >
                                  <div
                                    style={{
                                      width: `${redProb}%`,
                                      background: "#ff4d4d",
                                    }}
                                  />
                                  <div
                                    style={{
                                      width: `${blueProb}%`,
                                      background: "#4d8cff",
                                    }}
                                  />
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div
              style={{
                flex: "0 1 350px",
                minWidth: "310px",
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
              }}
            >
              <div
                style={{
                  background: "var(--gray-more)",
                  padding: "0.4rem",
                  borderRadius: 10,
                  border: "2px solid var(--border-color)",
                  boxShadow:
                    "0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.04)",
                  width: "100%",
                  boxSizing: "border-box",
                }}
              >
                <h2
                  style={{
                    color: "var(--yellow-color)",
                    fontSize: "0.85rem",
                    fontWeight: "bold",
                    marginBottom: "0.4rem",
                    letterSpacing: "0.025em",
                    textAlign: "center",
                  }}
                >
                  Team {selectedTeam.replace("frc", "")} Stats
                </h2>

                {(() => {
                  const teamData = teams.find((t) => t.key === selectedTeam);
                  if (!teamData) return null;

                  let wins = 0;
                  let losses = 0;
                  let ties = 0;

                  Object.entries(matchPredictions).forEach(([, match]) => {
                    const hasTeam =
                      match.red.includes(selectedTeam) ||
                      match.blue.includes(selectedTeam);
                    const hasResult =
                      match.result[0] !== -1 && match.result[1] !== -1;

                    if (hasTeam && hasResult) {
                      const [actualRed, actualBlue] = match.result;
                      const isOnRed = match.red.includes(selectedTeam);
                      const actualWinner =
                        actualRed > actualBlue
                          ? "red"
                          : actualBlue > actualRed
                          ? "blue"
                          : "tie";

                      if (actualWinner === "tie") {
                        ties++;
                      } else if (
                        (isOnRed && actualWinner === "red") ||
                        (!isOnRed && actualWinner === "blue")
                      ) {
                        wins++;
                      } else {
                        losses++;
                      }
                    }
                  });

                  const totalMatches = wins + losses + ties;
                  const winRate =
                    totalMatches > 0
                      ? ((wins / totalMatches) * 100).toFixed(1)
                      : "0.0";

                  const rankingData = rankings.find(
                    (r) => r.team_key === selectedTeam
                  );

                  return (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.4rem",
                      }}
                    >
                      <div
                        style={{
                          background: "var(--background-pred)",
                          padding: "0.4rem",
                          borderRadius: 5,
                          border: "1px solid var(--border-color)",
                        }}
                      >
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr 1fr",
                            gap: "0.5rem",
                            textAlign: "center",
                          }}
                        >
                          <div>
                            <div
                              style={{
                                fontSize: "0.6rem",
                                color: "var(--gray-less)",
                                marginBottom: "0.2rem",
                                fontWeight: "600",
                              }}
                            >
                              RECORD
                            </div>
                            <div
                              style={{
                                fontSize: "1rem",
                                fontWeight: "bold",
                                color: "var(--foreground)",
                                marginBottom: "0.1rem",
                              }}
                            >
                              {wins}-{losses}-{ties}
                            </div>
                            <div
                              style={{
                                fontSize: "0.55rem",
                                color: "var(--gray-less)",
                              }}
                            >
                              {winRate}% WR
                            </div>
                          </div>

                          {rankingData && (
                            <div>
                              <div
                                style={{
                                  fontSize: "0.6rem",
                                  color: "var(--gray-less)",
                                  marginBottom: "0.2rem",
                                  fontWeight: "600",
                                }}
                              >
                                RANK
                              </div>
                              <div
                                style={{
                                  fontSize: "1rem",
                                  fontWeight: "bold",
                                  color: "var(--foreground)",
                                  marginBottom: "0.1rem",
                                }}
                              >
                                #{rankingData.rank}
                              </div>
                              <div
                                style={{
                                  fontSize: "0.55rem",
                                  color: "var(--gray-less)",
                                }}
                              >
                                {rankingData.matches_played} matches
                              </div>
                            </div>
                          )}

                          {rankingData && (
                            <div>
                              <div
                                style={{
                                  fontSize: "0.6rem",
                                  color: "var(--gray-less)",
                                  marginBottom: "0.2rem",
                                  fontWeight: "600",
                                }}
                              >
                                RPS
                              </div>
                              <div
                                style={{
                                  fontSize: "1rem",
                                  fontWeight: "bold",
                                  color: "var(--foreground)",
                                  marginBottom: "0.1rem",
                                }}
                              >
                                {rankingData.sort_orders[0]?.toFixed(2) ||
                                  "0.00"}
                              </div>
                              <div
                                style={{
                                  fontSize: "0.55rem",
                                  color: "var(--gray-less)",
                                }}
                              >
                                points
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div
                        style={{
                          background: "var(--background-pred)",
                          padding: "0.4rem",
                          borderRadius: 5,
                          border: "1px solid var(--border-color)",
                        }}
                      >
                        <div
                          style={{
                            textAlign: "center",
                            padding: "0.3rem 0",
                            marginBottom: "0.4rem",
                            borderBottom: "1px solid var(--border-color)",
                          }}
                        >
                          <div
                            style={{
                              fontSize: "0.6rem",
                              color: "var(--gray-less)",
                              fontWeight: "600",
                              marginBottom: "0.15rem",
                            }}
                          >
                            FSM SCORE
                          </div>
                          <div
                            style={{
                              fontSize: "1.4rem",
                              fontWeight: "bold",
                              color: "var(--yellow-color)",
                              lineHeight: "1",
                            }}
                          >
                            {teamData.fsm}
                          </div>
                        </div>

                        <div
                          style={{
                            fontSize: "0.6rem",
                            color: "var(--gray-less)",
                            fontWeight: "600",
                            marginBottom: "0.25rem",
                            textAlign: "center",
                          }}
                        >
                          PERFORMANCE
                        </div>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr 1fr",
                            gap: "0.25rem 0.4rem",
                            fontSize: "0.6rem",
                          }}
                        >
                          <div style={{ textAlign: "center" }}>
                            <div
                              style={{
                                color: "var(--gray-less)",
                                fontSize: "0.55rem",
                                marginBottom: "0.1rem",
                              }}
                            >
                              Fuel
                            </div>
                            <div
                              style={{
                                fontWeight: "bold",
                                color: "var(--foreground)",
                                fontSize: "0.7rem",
                              }}
                            >
                              {teamData.fuel}
                            </div>
                          </div>
                          <div style={{ textAlign: "center" }}>
                            <div
                              style={{
                                color: "var(--gray-less)",
                                fontSize: "0.55rem",
                                marginBottom: "0.1rem",
                              }}
                            >
                              Auto
                            </div>
                            <div
                              style={{
                                fontWeight: "bold",
                                color: "var(--foreground)",
                                fontSize: "0.7rem",
                              }}
                            >
                              {teamData.auto}
                            </div>
                          </div>
                          <div style={{ textAlign: "center" }}>
                            <div
                              style={{
                                color: "var(--gray-less)",
                                fontSize: "0.55rem",
                                marginBottom: "0.1rem",
                              }}
                            >
                              Climb
                            </div>
                            <div
                              style={{
                                fontWeight: "bold",
                                color: "var(--foreground)",
                                fontSize: "0.7rem",
                              }}
                            >
                              {teamData.climb}
                            </div>
                          </div>
                          <div style={{ textAlign: "center" }}>
                            <div
                              style={{
                                color: "var(--gray-less)",
                                fontSize: "0.55rem",
                                marginBottom: "0.1rem",
                              }}
                            >
                              Penalty
                            </div>
                            <div
                              style={{
                                fontWeight: "bold",
                                color: "var(--foreground)",
                                fontSize: "0.7rem",
                              }}
                            >
                              {teamData.foul}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div
                style={{
                  background: "var(--gray-more)",
                  padding: "0.5rem",
                  borderRadius: 10,
                  border: "2px solid var(--border-color)",
                  boxShadow:
                    "0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.04)",
                  position: "sticky",
                  top: "1rem",
                  alignSelf: "flex-start",
                  width: "100%",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "0.6rem",
                    maxHeight: "calc(100vh - 4rem)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <h2
                      style={{
                        color: "var(--yellow-color)",
                        fontSize: "0.85rem",
                        fontWeight: "bold",
                        marginBottom: "0.5rem",
                        letterSpacing: "0.025em",
                        textAlign: "center",
                      }}
                    >
                      Official Rankings
                    </h2>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.25rem",
                        overflowY: "auto",
                        maxHeight: "calc(100vh - 8rem)",
                      }}
                    >
                      {rankings.map((ranking) => {
                        const isSelected = ranking.team_key === selectedTeam;
                        const rps = ranking.sort_orders?.[0] || 0;
                        return (
                          <div
                            key={ranking.team_key}
                            style={{
                              padding: "0.3rem 0.4rem",
                              borderRadius: 4,
                              background: isSelected
                                ? "var(--yellow-color)"
                                : "var(--background-pred)",
                              border: isSelected
                                ? "2px solid var(--yellow-color)"
                                : "1px solid var(--border-color)",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              transition: "all 0.2s",
                              cursor: "pointer",
                              boxShadow: isSelected
                                ? "0 4px 8px rgba(255, 215, 0, 0.3)"
                                : "none",
                              flexShrink: 0,
                            }}
                            onClick={() => {
                              setSelectedTeam(ranking.team_key);
                              updateURLParams(selectedEvent, ranking.team_key);
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.background =
                                  "var(--gray-more)";
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.background =
                                  "var(--background-pred)";
                              }
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.3rem",
                              }}
                            >
                              <span
                                style={{
                                  fontWeight: "bold",
                                  fontSize: "0.7rem",
                                  color: isSelected
                                    ? "#000"
                                    : "var(--gray-less)",
                                  minWidth: "20px",
                                }}
                              >
                                #{ranking.rank}
                              </span>
                              <span
                                style={{
                                  fontWeight: "600",
                                  fontSize: "0.7rem",
                                  color: isSelected
                                    ? "#000"
                                    : "var(--foreground)",
                                }}
                              >
                                <TeamLink
                                  teamKey={ranking.team_key}
                                  year={2026}
                                />
                              </span>
                            </div>
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "flex-end",
                              }}
                            >
                              <span
                                style={{
                                  fontWeight: "bold",
                                  fontSize: "0.8rem",
                                  color: isSelected
                                    ? "#000"
                                    : "var(--foreground)",
                                }}
                              >
                                {rps.toFixed(2)}
                              </span>
                              <span
                                style={{
                                  fontSize: "0.45rem",
                                  color: isSelected
                                    ? "#000"
                                    : "var(--gray-less)",
                                  fontWeight: "600",
                                }}
                              >
                                RPS
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <h2
                      style={{
                        color: "var(--yellow-color)",
                        fontSize: "0.9rem",
                        fontWeight: "bold",
                        marginBottom: "0.5rem",
                        letterSpacing: "0.025em",
                        textAlign: "center",
                      }}
                    >
                      FSM Leaderboard
                    </h2>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.25rem",
                        overflowY: "auto",
                        maxHeight: "calc(100vh - 8rem)",
                      }}
                    >
                      {sortedTeams.map((team, index) => {
                        const isSelected = team.key === selectedTeam;
                        return (
                          <div
                            key={team.key}
                            style={{
                              padding: "0.3rem 0.4rem",
                              borderRadius: 4,
                              background: isSelected
                                ? "var(--yellow-color)"
                                : "var(--background-pred)",
                              border: isSelected
                                ? "2px solid var(--yellow-color)"
                                : "1px solid var(--border-color)",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              transition: "all 0.2s",
                              cursor: "pointer",
                              boxShadow: isSelected
                                ? "0 4px 8px rgba(255, 215, 0, 0.3)"
                                : "none",
                              flexShrink: 0,
                            }}
                            onClick={() => {
                              setSelectedTeam(team.key);
                              updateURLParams(selectedEvent, team.key);
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.background =
                                  "var(--gray-more)";
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.background =
                                  "var(--background-pred)";
                              }
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.3rem",
                              }}
                            >
                              <span
                                style={{
                                  fontWeight: "bold",
                                  fontSize: "0.7rem",
                                  color: isSelected
                                    ? "#000"
                                    : "var(--gray-less)",
                                  minWidth: "20px",
                                }}
                              >
                                #{index + 1}
                              </span>
                              <span
                                style={{
                                  fontWeight: "600",
                                  fontSize: "0.7rem",
                                  color: isSelected
                                    ? "#000"
                                    : "var(--foreground)",
                                }}
                              >
                                <TeamLink teamKey={team.key} year={2026} />
                              </span>
                            </div>
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "flex-end",
                              }}
                            >
                              <span
                                style={{
                                  fontWeight: "bold",
                                  fontSize: "0.8rem",
                                  color: isSelected
                                    ? "#000"
                                    : index === 0
                                    ? "#10b981"
                                    : index < 3
                                    ? "#22c55e"
                                    : "var(--foreground)",
                                }}
                              >
                                {parseFloat(team.fsm).toFixed(1)}
                              </span>
                              <span
                                style={{
                                  fontSize: "0.45rem",
                                  color: isSelected
                                    ? "#000"
                                    : "var(--gray-less)",
                                  fontWeight: "600",
                                }}
                              >
                                Rank #{team.rank}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedEvent && selectedTeam && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginTop: "2rem",
              marginBottom: "2rem",
              width: "100%",
            }}
          >
            <button
              onClick={handleClearSelection}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: 8,
                border: "1px solid var(--border-color)",
                background: "var(--background-pred)",
                color: "var(--foreground)",
                fontWeight: "600",
                fontSize: "0.9rem",
                cursor: "pointer",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--gray-more)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--background-pred)";
              }}
            >
              <span style={{ fontSize: "1rem" }}>↩</span>
              Change Event/Team
            </button>
          </div>
        )}

        {(!selectedEvent || !selectedTeam) && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              padding: "4rem 2rem",
              color: "var(--gray-less)",
            }}
          >
            <div style={{ textAlign: "center", maxWidth: "500px" }}>
              <h2
                style={{
                  fontSize: "1.5rem",
                  fontWeight: "bold",
                  color: "var(--foreground)",
                  marginBottom: "1rem",
                }}
              >
                Select Event and Team
              </h2>
              <p style={{ fontSize: "1rem", lineHeight: 1.6 }}>
                Choose an event and a team from the dropdowns above to view
                upcoming matches and the FSM leaderboard.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
