import type { Metadata } from "next";
import { redirect } from "next/navigation";
import styles from "../page.module.css";
import {
  getAnalyticsSummary,
  isAnalyticsAuthorized,
} from "../lib/analytics/store";
import VisitorTrendChart from "./VisitorTrendChart";

export const metadata: Metadata = {
  title: "Analytics",
  robots: { index: false, follow: false },
};

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ key?: string }>;
}) {
  const { key } = await searchParams;
  if (!isAnalyticsAuthorized(key)) {
    redirect("/");
  }

  const summary = await getAnalyticsSummary();

  return (
    <div className={styles.page}>
      <main className={styles.main} style={{ maxWidth: 960, margin: "0 auto" }}>
        <h1 className={styles.pageTitle}>Analytics</h1>
        <p
          style={{
            textAlign: "center",
            color: "var(--gray-less)",
            marginBottom: "1.5rem",
          }}
        >
          Internal traffic summary
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "1rem",
            marginBottom: "1.5rem",
          }}
        >
          <div className={styles.panel} style={{ padding: "1.25rem", textAlign: "center" }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--gray-less)" }}>
              UNIQUE VISITORS
            </div>
            <div
              style={{
                fontSize: "2rem",
                fontWeight: 800,
                color: "var(--yellow-color)",
                marginTop: "0.35rem",
              }}
            >
              {summary.uniqueVisitors.toLocaleString()}
            </div>
          </div>
          <div className={styles.panel} style={{ padding: "1.25rem", textAlign: "center" }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--gray-less)" }}>
              TOTAL VISITS
            </div>
            <div
              style={{
                fontSize: "2rem",
                fontWeight: 800,
                color: "var(--yellow-color)",
                marginTop: "0.35rem",
              }}
            >
              {summary.totalVisits.toLocaleString()}
            </div>
          </div>
        </div>

        <div className={styles.panel} style={{ padding: "1rem", marginBottom: "1.5rem" }}>
          <h2 className={styles.sectionTitle}>Unique visitors (30 days)</h2>
          <VisitorTrendChart data={summary.visitorTrend} />
        </div>

        <div className={styles.panel} style={{ padding: "1rem" }}>
          <h2 className={styles.sectionTitle}>Pages</h2>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th} style={{ textAlign: "left" }}>
                    Path
                  </th>
                  <th className={styles.th}>Visits</th>
                  <th className={styles.th}>Avg load</th>
                </tr>
              </thead>
              <tbody>
                {summary.pages.length === 0 ? (
                  <tr>
                    <td className={styles.td} colSpan={3}>
                      No data yet
                    </td>
                  </tr>
                ) : (
                  summary.pages.map((page) => (
                    <tr key={page.path}>
                      <td
                        className={styles.td}
                        style={{ textAlign: "left", fontFamily: "monospace" }}
                      >
                        {page.path}
                      </td>
                      <td className={styles.td}>{page.visits.toLocaleString()}</td>
                      <td className={styles.td}>
                        {page.avgLoadMs != null ? `${page.avgLoadMs} ms` : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
