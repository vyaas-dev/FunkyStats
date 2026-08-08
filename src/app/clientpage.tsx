"use client";

import Link from "next/link";
import styles from "./page.module.css";
import HeroBanana from "./components/HeroBanana";
import HomeFinders from "./components/HomeFinders";
import HomeTagline from "./components/HomeTagline";

export default function ClientHome() {
  return (
    <div className={styles.homePage}>
      <section className={styles.landingHero}>
        <div className={styles.landingHeroCopy}>
          <HomeTagline />
          <p className={styles.landingLead}>
            FunkyStats is an FRC data analytics tool that uses FSM, the Funky
            Scoring Metric, to make highly accurate predictions of teams&apos;
            in-match performance.
          </p>
          <div className={styles.landingCtaGroup}>
            <Link href="/global/2026" className={styles.landingCta}>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden
              >
                <path
                  d="M4 19V5M8 19V10M12 19V7M16 19V12M20 19V9"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
              </svg>
              Explore Global Rankings
              <span aria-hidden>→</span>
            </Link>
            <Link href="/blog" className={styles.landingBlogLink}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden
              >
                <path
                  d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Blog
            </Link>
          </div>
        </div>
        <div className={styles.landingHeroVisual}>
          <HeroBanana />
        </div>
      </section>

      <div className={styles.landingBody}>
        <HomeFinders />
      </div>
    </div>
  );
}
