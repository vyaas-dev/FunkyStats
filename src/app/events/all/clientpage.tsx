"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type EventMetrics = {
  key: string;
  shortCode: string;
  name: string;
  city?: string;
  stateProv?: string;
  country?: string;
  startDate?: string;
  endDate?: string;
  week: number | null;
  district?: string | null;
  top10Rms: number;
  top25Rms: number;
  overallRms: number;
};

type SortOption = "top10" | "top25" | "overall";

function formatDateRange(start?: string, end?: string) {
  if (!start || !end) return "Dates TBD";

  const startDate = new Date(start);
  const endDate = new Date(end);

  const startFormatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  });

  const endFormatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return `${startFormatter.format(startDate)} to ${endFormatter.format(
    endDate
  )}`;
}

function formatLocation(event: EventMetrics) {
  if (event.city && event.stateProv) {
    return `${event.city}, ${event.stateProv}, ${event.country ?? ""}`.trim();
  }
  if (event.city && event.country) {
    return `${event.city}, ${event.country}`;
  }
  return event.country || "Location TBD";
}

function getEventStatus(startDate?: string, endDate?: string) {
  if (!startDate || !endDate) {
    return { label: "Upcoming", color: "#eab308", bg: "rgba(234, 179, 8, 0.12)" };
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = new Date(startDate);
  const end = new Date(endDate);
  const endWithBuffer = new Date(end);
  endWithBuffer.setDate(endWithBuffer.getDate() + 1);

  if (today >= start && today <= endWithBuffer) {
    return { label: "LIVE", color: "#22c55e", bg: "rgba(34, 197, 94, 0.15)" };
  }
  if (today < start) {
    return { label: "Upcoming", color: "#eab308", bg: "rgba(234, 179, 8, 0.12)" };
  }
  return { label: "Completed", color: "var(--gray-less)", bg: "rgba(128, 128, 128, 0.12)" };
}

function getWeekGroupLabel(week: number | null) {
  if (week === null || week < 0) return "Other";
  return `Week ${week}`;
}

interface ClientPageProps {
  events: EventMetrics[];
}

export default function ClientPage({ events }: ClientPageProps) {
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<string>("All");
  const [selectedRegion, setSelectedRegion] = useState<string>("All");
  const [sortOption, setSortOption] = useState<SortOption>("top10");

  const weekOptions = useMemo(() => {
    const unique = new Set<number>();
    events.forEach((event) => {
      if (typeof event.week === "number") {
        unique.add(event.week);
      }
    });

    return Array.from(unique)
      .filter((week) => Number.isFinite(week))
      .sort((a, b) => a - b);
  }, [events]);

  const districts = useMemo(() => {
    const unique = new Set<string>();
    events.forEach((event) => {
      if (event.district) unique.add(event.district);
    });
    return ["All", ...Array.from(unique).sort((a, b) => a.localeCompare(b))];
  }, [events]);

  const regions = useMemo(() => {
    const unique = new Set<string>();
    events.forEach((event) => {
      if (event.stateProv) {
        unique.add(event.stateProv);
      } else if (event.country) {
        unique.add(event.country);
      }
    });
    return ["All", ...Array.from(unique).sort((a, b) => a.localeCompare(b))];
  }, [events]);

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      if (selectedWeek !== null && event.week !== selectedWeek) {
        return false;
      }

      if (selectedDistrict !== "All") {
        if (!event.district || event.district !== selectedDistrict)
          return false;
      }

      if (selectedRegion !== "All") {
        const regionValue = event.stateProv || event.country || "";
        if (regionValue !== selectedRegion) return false;
      }

      return true;
    });
  }, [events, selectedDistrict, selectedRegion, selectedWeek]);

  const eventsByWeek = useMemo(() => {
    const groups = new Map<string, EventMetrics[]>();

    filteredEvents.forEach((event) => {
      const label = getWeekGroupLabel(event.week);
      if (!groups.has(label)) {
        groups.set(label, []);
      }
      groups.get(label)!.push(event);
    });

    const sortedGroups = Array.from(groups.entries()).sort(([a], [b]) => {
      const weekA = a === "Other" ? Infinity : Number(a.replace("Week ", ""));
      const weekB = b === "Other" ? Infinity : Number(b.replace("Week ", ""));
      return weekA - weekB;
    });

    return sortedGroups.map(([label, eventsInWeek]) => {
      const sortedEvents = [...eventsInWeek].sort((a, b) => {
        const getValue = (event: EventMetrics) => {
          if (sortOption === "top10") return event.top10Rms;
          if (sortOption === "top25") return event.top25Rms;
          return event.overallRms;
        };
        return getValue(b) - getValue(a);
      });

      return { label, events: sortedEvents };
    });
  }, [filteredEvents, sortOption]);

  return (
    <div className="events-layout-container">
      <aside className="events-layout-sidebar">
        <div
          style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
        >
          <label style={{ fontSize: "0.9rem", fontWeight: 600 }}>
            District
          </label>
          <select
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            style={{
              padding: "0.6rem",
              borderRadius: 8,
              border: "1px solid var(--border-color)",
              background: "var(--background-pred)",
              color: "var(--foreground)",
            }}
          >
            {districts.map((district) => (
              <option key={district} value={district}>
                {district}
              </option>
            ))}
          </select>
        </div>

        <div
          style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
        >
          <label style={{ fontSize: "0.9rem", fontWeight: 600 }}>Region</label>
          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            style={{
              padding: "0.6rem",
              borderRadius: 8,
              border: "1px solid var(--border-color)",
              background: "var(--background-pred)",
              color: "var(--foreground)",
            }}
          >
            {regions.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
        </div>

        <div
          style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
        >
          <label style={{ fontSize: "0.9rem", fontWeight: 600 }}>Weeks</label>
          <button
            onClick={() => setSelectedWeek(null)}
            style={{
              textAlign: "left",
              padding: "0.5rem 0.75rem",
              borderRadius: 6,
              border: "1px solid var(--border-color)",
              background:
                selectedWeek === null
                  ? "var(--gray-more)"
                  : "var(--background)",
              color: "var(--foreground)",
              fontWeight: selectedWeek === null ? 700 : 500,
            }}
          >
            All Weeks
          </button>
          {weekOptions.map((weekNumber) => (
            <button
              key={weekNumber}
              onClick={() => setSelectedWeek(weekNumber)}
              style={{
                textAlign: "left",
                padding: "0.5rem 0.75rem",
                borderRadius: 6,
                border: "1px solid var(--border-color)",
                background:
                  selectedWeek === weekNumber
                    ? "var(--gray-more)"
                    : "var(--background)",
                color: "var(--foreground)",
                fontWeight: selectedWeek === weekNumber ? 700 : 500,
              }}
            >
              {`Week ${weekNumber}`}
            </button>
          ))}
        </div>
      </aside>

      <main className="events-layout-main">
        <header
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "1rem",
            }}
          >
            <div>
              <h1 style={{ fontSize: "1.75rem", fontWeight: 700 }}>
                Events
              </h1>
              <p style={{ color: "var(--gray-less)" }}>
                Browse events with predicted FSM summaries.
              </p>
            </div>
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              <label style={{ fontSize: "0.9rem", fontWeight: 600 }}>
                Sort by
              </label>
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as SortOption)}
                style={{
                  padding: "0.6rem",
                  borderRadius: 8,
                  border: "1px solid var(--border-color)",
                  background: "var(--background-pred)",
                  color: "var(--foreground)",
                }}
              >
                <option value="top10">RMS FSM (Top 10%)</option>
                <option value="top25">RMS FSM (Top 25%)</option>
                <option value="overall">RMS FSM (All)</option>
              </select>
            </div>
          </div>
        </header>

        <div className="events-mobile-filters">
          <div className="events-mobile-filter-group">
            <label>District</label>
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
            >
              {districts.map((district) => (
                <option key={district} value={district}>
                  {district}
                </option>
              ))}
            </select>
          </div>
          <div className="events-mobile-filter-group">
            <label>Region</label>
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
            >
              {regions.map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </select>
          </div>
          <div className="events-mobile-week-list">
            <button
              onClick={() => setSelectedWeek(null)}
              className={selectedWeek === null ? "active" : ""}
            >
              All Weeks
            </button>
            {weekOptions.map((weekNumber) => (
              <button
                key={weekNumber}
                onClick={() => setSelectedWeek(weekNumber)}
                className={selectedWeek === weekNumber ? "active" : ""}
              >
                {`Week ${weekNumber}`}
              </button>
            ))}
          </div>
        </div>

        {eventsByWeek.length === 0 ? (
          <div
            style={{
              padding: "3rem",
              textAlign: "center",
              border: "1px dashed var(--border-color)",
              borderRadius: 12,
              color: "var(--gray-less)",
            }}
          >
            No events match the selected filters.
          </div>
        ) : (
          eventsByWeek.map(({ label, events: weekEvents }) =>
            weekEvents.length === 0 ? null : (
              <section
                key={label}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1.25rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <h2 style={{ fontSize: "1.4rem", fontWeight: 700 }}>
                    {label}
                  </h2>
                  <span
                    style={{ color: "var(--gray-less)", fontSize: "0.9rem" }}
                  >
                    {weekEvents.length} Events
                  </span>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                    gap: "1.25rem",
                  }}
                >
                  {weekEvents.map((event) => (
                    <Link
                      key={event.key}
                      href={`/events/${event.key}`}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.75rem",
                        padding: "1.25rem",
                        borderRadius: 12,
                        border: "1px solid var(--border-color)",
                        background: "var(--background-pred)",
                        boxShadow: "0 8px 16px rgba(0, 0, 0, 0.07)",
                        transition: "transform 0.2s ease, box-shadow 0.2s ease",
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-4px)";
                        e.currentTarget.style.boxShadow =
                          "0 16px 24px rgba(0, 0, 0, 0.12)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow =
                          "0 8px 16px rgba(0, 0, 0, 0.07)";
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          gap: "0.5rem",
                        }}
                      >
                        <div>
                          <h3 style={{ fontSize: "1.1rem", fontWeight: 700 }}>
                            {event.name}
                          </h3>
                          <p
                            style={{
                              fontSize: "0.9rem",
                              color: "var(--gray-less)",
                            }}
                          >
                            {formatLocation(event)}
                          </p>
                          <p
                            style={{
                              fontSize: "0.85rem",
                              color: "var(--gray-less)",
                              marginTop: "0.25rem",
                            }}
                          >
                            {formatDateRange(event.startDate, event.endDate)}
                          </p>
                        </div>
                        <div style={{ display: "flex", gap: "0.4rem", alignItems: "center", flexShrink: 0 }}>
                          {event.district && (
                            <span
                              style={{
                                fontSize: "0.75rem",
                                padding: "0.25rem 0.5rem",
                                borderRadius: 999,
                                background: "var(--gray-more)",
                                color: "var(--foreground)",
                                fontWeight: 600,
                              }}
                            >
                              {event.district}
                            </span>
                          )}
                          {(() => {
                            const status = getEventStatus(event.startDate, event.endDate);
                            return (
                              <span
                                style={{
                                  fontSize: "0.7rem",
                                  padding: "0.2rem 0.5rem",
                                  borderRadius: 999,
                                  background: status.bg,
                                  color: status.color,
                                  fontWeight: 700,
                                  border: `1px solid ${status.color}33`,
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "0.3rem",
                                }}
                              >
                                {status.label === "LIVE" && (
                                  <span
                                    className="pulse-dot"
                                    style={{
                                      width: 6,
                                      height: 6,
                                      borderRadius: "50%",
                                      background: status.color,
                                      display: "inline-block",
                                    }}
                                  />
                                )}
                                {status.label}
                              </span>
                            );
                          })()}
                        </div>
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                          gap: "0.75rem",
                        }}
                      >
                        {[
                          { label: "Top 10% RMS", value: event.top10Rms },
                          { label: "Top 25% RMS", value: event.top25Rms },
                          { label: "Overall RMS", value: event.overallRms },
                        ].map((metric) => (
                          <div
                            key={metric.label}
                            style={{
                              background: "rgba(255, 255, 255, 0.04)",
                              borderRadius: 10,
                              padding: "0.65rem",
                              display: "flex",
                              flexDirection: "column",
                              gap: "0.35rem",
                              border: "1px solid rgba(255, 255, 255, 0.08)",
                            }}
                          >
                            <span
                              style={{
                                fontSize: "0.75rem",
                                color: "var(--gray-less)",
                                fontWeight: 600,
                              }}
                            >
                              {metric.label}
                            </span>
                            <span
                              style={{ fontSize: "1.1rem", fontWeight: 700 }}
                            >
                              {metric.value.toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )
          )
        )}
      </main>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.4;
            transform: scale(0.75);
          }
        }

        .pulse-dot {
          animation: pulse 1.5s ease-in-out infinite;
        }

        .events-layout-container {
          display: flex;
          min-height: 100vh;
          background: var(--background);
          color: var(--foreground);
        }

        .events-layout-sidebar {
          width: 250px;
          border-right: 1px solid var(--border-color);
          padding: 7rem 1.25rem 2rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .events-layout-main {
          flex: 1;
          padding: 5.5rem 2.5rem 2.5rem;
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .events-mobile-filters {
          display: none;
        }

        .events-mobile-filter-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .events-mobile-filter-group label {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--gray-less);
        }

        .events-mobile-filter-group select {
          padding: 0.55rem;
          border-radius: 8px;
          border: 1px solid var(--border-color);
          background: var(--background-pred);
          color: var(--foreground);
        }

        .events-mobile-week-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.45rem;
        }

        .events-mobile-week-list button {
          flex: 1;
          min-width: 110px;
          text-align: center;
          padding: 0.45rem 0.6rem;
          border-radius: 6px;
          border: 1px solid var(--border-color);
          background: var(--background);
          color: var(--foreground);
          font-weight: 500;
        }

        .events-mobile-week-list button.active {
          background: var(--gray-more);
          font-weight: 700;
        }

        @media (max-width: 1024px) {
          .events-layout-container {
            flex-direction: column;
          }

          .events-layout-sidebar {
            width: 100%;
            border-right: none;
            border-bottom: 1px solid var(--border-color);
            padding: 3.5rem 1.5rem 1.5rem;
          }

          .events-layout-main {
            padding: 2rem 1.25rem 2.5rem;
          }
        }

        @media (max-width: 640px) {
          .events-layout-sidebar {
            padding: 4.75rem 1.1rem 1.25rem;
            gap: 1rem;
            display: none;
          }

          .events-layout-main {
            padding: 4.75rem 1.1rem 2.25rem;
            gap: 1.25rem;
          }

          .events-mobile-filters {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
            padding-top: 1.35rem;
          }

          .events-mobile-week-list {
            gap: 0.6rem;
          }

          .events-mobile-week-list button {
            width: 100%;
          }

          .events-sort-container {
            width: 100%;
            justify-content: flex-start;
          }
        }
      `}</style>
    </div>
  );
}
