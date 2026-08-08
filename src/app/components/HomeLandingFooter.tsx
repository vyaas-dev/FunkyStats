"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "../page.module.css";

function TbaLampIcon() {
  return (
    <svg
      className={styles.landingFooterTbaIcon}
      viewBox="0 0 72 112"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <line
        x1="11"
        y1="20"
        x2="11"
        y2="84"
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeMiterlimit="10"
      />
      <line
        x1="61"
        y1="20"
        x2="61"
        y2="84"
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeMiterlimit="10"
      />
      <path
        d="M39,92a25,25,0,0,0,25,25"
        transform="translate(-28 -8)"
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeMiterlimit="10"
      />
      <path
        d="M89,92a25,25,0,0,1-25,25"
        transform="translate(-28 -8)"
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeMiterlimit="10"
      />
      <line
        x1="36"
        y1="20"
        x2="36"
        y2="109"
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeMiterlimit="10"
      />
      <line
        x1="11"
        y1="81"
        x2="61"
        y2="81"
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeMiterlimit="10"
      />
      <line
        x1="11"
        y1="53"
        x2="61"
        y2="53"
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeMiterlimit="10"
      />
      <rect width="72" height="28" rx="4" fill="currentColor" />
    </svg>
  );
}

export default function HomeLandingFooter() {
  const pathname = usePathname();
  if (pathname?.startsWith("/analytics")) {
    return null;
  }

  return (
    <footer className={styles.landingFooter}>
      <div className={styles.landingFooterInner}>
        <div className={styles.landingFooterBrand}>
          <div className={styles.landingFooterLogoRow}>
            <Image
              src="/logo846.png"
              alt=""
              width={40}
              height={44}
              className={styles.landingFooterLogo}
            />
            <span className={styles.landingFooterBrandName}>FunkyStats</span>
          </div>
          <p className={styles.landingFooterAbout}>
            Developed by The Funky Monkeys (FIRST Team 846). Check our team out
            at{" "}
            <a
              href="https://lynbrookrobotics.com"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.landingFooterTeamLink}
            >
              lynbrookrobotics.com
            </a>
            .
          </p>
        </div>

        <div className={styles.landingFooterPowered}>
          <span className={styles.landingFooterPoweredLabel}>Powered by</span>
          <a
            href="https://www.thebluealliance.com/"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.landingFooterTba}
          >
            <TbaLampIcon />
            <span>The Blue Alliance</span>
          </a>
        </div>

        <blockquote className={styles.landingFooterQuote}>
          <span className={styles.landingFooterQuoteMark} aria-hidden>
            “
          </span>
          <p>A banana a day keeps your alliance in play</p>
        </blockquote>
      </div>

      <div className={styles.landingFooterBottom}>
        <span>© {new Date().getFullYear()} FunkyStats · All rights reserved</span>
        <nav className={styles.landingFooterNav} aria-label="Footer">
          <Link href="/events/all">Events</Link>
          <Link href="/global/2026">Teams</Link>
        </nav>
      </div>
    </footer>
  );
}
