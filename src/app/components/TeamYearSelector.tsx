"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "../page.module.css";

const TEAM_YEARS = [
  ...Array.from({ length: 8 }, (_, i) => 2018 + i).filter(
    (y) => y !== 2020 && y !== 2021
  ),
  2026,
];

const DESKTOP_YEARS = ["general", ...TEAM_YEARS];

export default function TeamYearSelector({
  teamKey,
  currentYear,
}: {
  teamKey: string;
  currentYear: string;
}) {
  const router = useRouter();

  const mobileValue =
    currentYear === "general" ? String(TEAM_YEARS[TEAM_YEARS.length - 1]) : currentYear;

  return (
    <>
      <nav
        className={`${styles.tabBar} ${styles.teamYearTabs}`}
        aria-label="Team year"
      >
        {DESKTOP_YEARS.map((y) => {
          const yearLabel = y === "general" ? "General" : String(y);
          const isActive = y.toString() === currentYear;
          return (
            <Link
              key={y}
              href={`/team/${teamKey}-${y}`}
              className={`${styles.tabBarLink}${isActive ? ` ${styles.tabBarLinkActive}` : ""}`}
              aria-current={isActive ? "page" : undefined}
            >
              {yearLabel}
            </Link>
          );
        })}
      </nav>

      <div className={styles.teamYearMobile}>
        <label htmlFor="team-year-select" className={styles.teamYearMobileLabel}>
          Year
        </label>
        <select
          id="team-year-select"
          className={styles.teamYearMobileSelect}
          value={mobileValue}
          onChange={(e) => router.push(`/team/${teamKey}-${e.target.value}`)}
        >
          {[...TEAM_YEARS].reverse().map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}
