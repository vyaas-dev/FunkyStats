"use client";

import Link from "next/link";
import { EventDataType } from "../../lib/team";

export default function EventCard({
  event,
  yearprov,
}: {
  event: EventDataType;
  yearprov: string;
}) {
  return (
    <Link
      href={
        Number(yearprov) >= 2025
          ? `/events/${event.event}`
          : `/event/${event.event}`
      }
      style={{
        textDecoration: "none",
        color: "inherit",
      }}
    >
      <div
        style={{
          background: "var(--background-pred)",
          border: "2px solid var(--border-color)",
          borderRadius: 12,
          padding: "1.5rem",
          boxShadow:
            "0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)",
          transition: "all 0.2s",
          cursor: "pointer",
          height: "100%",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-4px)";
          e.currentTarget.style.boxShadow =
            "0 12px 24px rgba(0, 0, 0, 0.15), 0 6px 12px rgba(0, 0, 0, 0.1)";
          e.currentTarget.style.borderColor = "var(--yellow-color)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow =
            "0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)";
          e.currentTarget.style.borderColor = "var(--border-color)";
        }}
      >
        <div
          style={{
            fontSize: "1.25rem",
            fontWeight: "bold",
            color: "var(--yellow-color)",
            marginBottom: "0.75rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <span>{event.event}</span>
          {event.pending && (
            <span
              style={{
                fontSize: "0.7rem",
                color: "#f59e0b",
                background: "rgba(245, 158, 11, 0.15)",
                border: "1px solid rgba(245, 158, 11, 0.35)",
                borderRadius: 999,
                padding: "0.15rem 0.5rem",
                fontWeight: "700",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Pending
            </span>
          )}
        </div>
        {event.pending && (
          <div
            style={{
              fontSize: "0.78rem",
              color: "var(--gray-less)",
              marginBottom: "0.75rem",
            }}
          >
            Event not played yet
          </div>
        )}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "0.75rem",
                color: "var(--gray-less)",
                marginBottom: "0.25rem",
              }}
            >
              RANK
            </div>
            <div
              style={{
                fontSize: "2rem",
                fontWeight: "bold",
                color: "var(--foreground)",
              }}
            >
              #{event.teamrank}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div
              style={{
                fontSize: "0.75rem",
                color: "var(--gray-less)",
                marginBottom: "0.25rem",
              }}
            >
              FSM
            </div>
            <div
              style={{
                fontSize: "2rem",
                fontWeight: "bold",
                color: "#22c55e",
              }}
            >
              {event.teamfsm}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
