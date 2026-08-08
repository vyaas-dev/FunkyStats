import type { Metadata } from "next";
import Link from "next/link";
import styles from "../page.module.css";

export const metadata: Metadata = {
  title: "Blog — FunkyStats",
  description:
    "About FunkyStats and the FSM (Funky Scoring Metric) algorithm for FRC performance prediction.",
};

export default function BlogPage() {
  return (
    <div className={styles.blogPage}>
      <main className={styles.blogMain}>
        <article className={styles.blogArticle}>
          <Link href="/" className={styles.blogBackLink}>
            ← Home
          </Link>

          <header className={styles.blogHeader}>
            <p className={styles.blogEyebrow}>Blog</p>
            <h1 className={styles.blogTitle}>FunkyStats</h1>
          </header>

          <section className={styles.blogSection}>
            <h2 className={styles.blogSectionTitle}>1. About</h2>
            <p className={styles.blogParagraph}>
              FunkyStats is an FRC data analytics tool that uses FSM, the Funky
              Scoring Metric, to make highly accurate predictions of teams&apos;
              in-match performance. Although FSM was created primarily for
              internal usage (hence, the yellowness), we chose to keep it
              accessible to other teams as well.
            </p>
            <p className={styles.blogParagraph}>
              The core FSM algorithm, detailed below, was developed purely
              through HI (Human &quot;Intelligence&quot;). However, supporting
              elements, including this website, were &quot;vibecoded.&quot;
            </p>
          </section>

          <section className={styles.blogSection}>
            <h2 className={styles.blogSectionTitle}>2. The FSM Algorithm</h2>
            <div className={styles.blogCallout}>
              <p className={styles.blogParagraph}>
                For context on related methods and the purpose of this
                calculation, check out{" "}
                <a
                  href="https://blog.thebluealliance.com/2017/10/05/the-math-behind-opr-an-introduction/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  The Math Behind OPR: An Introduction
                </a>{" "}
                and{" "}
                <a
                  href="https://www.statbotics.io/blog/epa"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Statbotics on EPA
                </a>
                .
              </p>
            </div>
            <p className={styles.blogParagraph}>
              Here, we will delve into the differences between FSM and other
              algorithms.
            </p>

            <div className={styles.blogSubsection}>
              <h3 className={styles.blogSubsectionTitle}>
                A. Assumption 1: Team Performance may vary significantly between
                events
              </h3>
              <p className={styles.blogParagraph}>
                Team Performance may vary significantly between events. As a
                result, we use prior event performance solely to seed an initial
                per-event estimate. The calculation is otherwise entirely
                event-specific. This allows FSM to be highly responsive to teams
                improving their robots drastically between events.
              </p>
            </div>

            <div className={styles.blogSubsection}>
              <h3 className={styles.blogSubsectionTitle}>
                B. Assumption 2: Team Performance may vary significantly{" "}
                <em>within</em> an event
              </h3>
              <p className={styles.blogParagraph}>
                Team Performance may vary significantly <em>within</em> an event.
                Whether due to a robot disaster or consistent improvement, teams
                don&apos;t score the same every match. For this reason, we took
                two steps to account for this.
              </p>
              <ol className={styles.blogList} type="i">
                <li>
                  Matches closer together tend to &quot;explain&quot; the results
                  of each other more. For example, qm7 is a better predictor of
                  qm8 than qm1 is. FSM takes into account the ordering of the
                  matches.
                </li>
                <li>
                  Strategically, a team&apos;s better and later matches usually
                  matter more (to 846 at least). These matches are weighted more
                  highly by FSM.
                </li>
              </ol>
            </div>

            <p className={styles.blogParagraph}>
              FSM and match predictions can be viewed through{" "}
              <Link href="/global/2026" className={styles.blogInlineLink}>
                this website
              </Link>
              .
            </p>
          </section>

          <p className={styles.blogSignoff}>
            Remember: A banana a day keeps your alliance in play!
          </p>
        </article>
      </main>
    </div>
  );
}
