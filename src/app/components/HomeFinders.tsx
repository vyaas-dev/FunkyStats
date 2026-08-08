"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "../page.module.css";

const POPULAR_EVENTS = [
  { key: "2026casj", label: "2026casj" },
  { key: "2026caoc", label: "2026caoc" },
  { key: "2026isde1", label: "2026isde1" },
  { key: "2026onto2", label: "2026onto2" },
];

const TRENDING_TEAMS = ["846", "1678", "1690", "4414", "9470"];

export default function HomeFinders() {
  const router = useRouter();
  const [eventQuery, setEventQuery] = useState("");
  const [teamQuery, setTeamQuery] = useState("");

  const submitEvent = (e: FormEvent) => {
    e.preventDefault();
    const code = eventQuery.trim().toLowerCase().replace(/\s+/g, "");
    if (!code) {
      router.push("/events/all");
      return;
    }
    router.push(`/events/${code}`);
  };

  const submitTeam = (e: FormEvent) => {
    e.preventDefault();
    const raw = teamQuery.trim().toLowerCase().replace(/^frc/, "");
    const num = raw.replace(/\D/g, "");
    if (!num) {
      router.push("/global/2026");
      return;
    }
    router.push(`/team/frc${num}-2026`);
  };

  return (
    <section className={styles.landingFinders} aria-label="Search tools">
      <article className={styles.landingFinderCard}>
        <header className={styles.landingFinderHeader}>
          <span className={styles.landingFinderIcon} aria-hidden>
            <svg viewBox="0 0 24 24" width="22" height="22">
              <rect
                x="4"
                y="5"
                width="16"
                height="15"
                rx="2"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                d="M8 3v4M16 3v4M4 10h16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <div>
            <h2 className={styles.landingFinderTitle}>Event Finder</h2>
            <p className={styles.landingFinderSub}>
              Jump to an event by name or TBA code.
            </p>
          </div>
        </header>

        <form className={styles.landingFinderForm} onSubmit={submitEvent}>
          <input
            className={styles.landingFinderInput}
            type="text"
            value={eventQuery}
            onChange={(e) => setEventQuery(e.target.value)}
            placeholder="Search or enter event code..."
            aria-label="Event code or name"
          />
          <button type="submit" className={styles.landingFinderSubmit}>
            Find Event
          </button>
        </form>

        <div className={styles.landingFinderChips}>
          <span className={styles.landingFinderChipsLabel}>Popular</span>
          <div className={styles.landingFinderChipRow}>
            {POPULAR_EVENTS.map((ev) => (
              <Link
                key={ev.key}
                href={`/events/${ev.key}`}
                className={styles.landingFinderChip}
              >
                {ev.label}
              </Link>
            ))}
          </div>
        </div>

        <Link href="/events/all" className={styles.landingFinderLink}>
          View all events →
        </Link>
      </article>

      <article className={styles.landingFinderCard}>
        <header className={styles.landingFinderHeader}>
          <span className={styles.landingFinderIcon} aria-hidden>
            <svg viewBox="0 0 24 24" width="22" height="22">
              <path
                d="M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3.5 19c.6-2.4 2.7-4 4.5-4s3.9 1.6 4.5 4M12 19c.6-2.4 2.7-4 4.5-4s3.9 1.6 4.5 4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <div>
            <h2 className={styles.landingFinderTitle}>Team Finder</h2>
            <p className={styles.landingFinderSub}>
              Open a team page by number for 2026.
            </p>
          </div>
        </header>

        <form className={styles.landingFinderForm} onSubmit={submitTeam}>
          <input
            className={styles.landingFinderInput}
            type="text"
            inputMode="numeric"
            value={teamQuery}
            onChange={(e) => setTeamQuery(e.target.value)}
            placeholder="Enter team number..."
            aria-label="Team number"
          />
          <button type="submit" className={styles.landingFinderSubmit}>
            Find Team
          </button>
        </form>

        <div className={styles.landingFinderChips}>
          <span className={styles.landingFinderChipsLabel}>Trending</span>
          <div className={styles.landingFinderChipRow}>
            {TRENDING_TEAMS.map((n) => (
              <Link
                key={n}
                href={`/team/frc${n}-2026`}
                className={styles.landingFinderChip}
              >
                {n}
              </Link>
            ))}
          </div>
        </div>

        <Link href="/global/2026" className={styles.landingFinderLink}>
          View all teams →
        </Link>
      </article>
    </section>
  );
}
