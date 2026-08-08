import styles from "../../page.module.css";
import { getGlobalStatsWithoutLocation } from "../../lib/global";
import OffseasonSwitch from "./offseason";
import ProgressiveGlobalTable from "@/app/components/ProgressiveGlobalTable";
import YearDropdown from "@/app/components/YearDropdown";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function GlobalPage({
  params,
}: {
  params: Promise<{ year: string }>;
}) {
  let { year } = await params;

  let includeOffseason = true;
  if (year.split("-").length > 1 && year.split("-")[1] === "no") {
    includeOffseason = false;
  }

  year = year.split("-")[0];
  if (
    Number(year) < 2018 ||
    Number(year) === 2021 ||
    Number(year) === 2020 ||
    Number(year) > 2026
  ) {
    year = "2026";
  }

  const yearNum = Number(year);

  const globalStats = await getGlobalStatsWithoutLocation(
    yearNum,
    includeOffseason
  );

  return (
    <div
      className={styles.page}
      style={{ position: "relative", minHeight: "100vh" }}
    >
      <main className={styles.main}>
        <h1 className={styles.globalPageTitle}>
          {year} Global FSM Rankings
        </h1>
        <div className={styles.globalPageControls}>
          <YearDropdown
            currentYear={year}
            includeOffseason={includeOffseason}
          />
          <OffseasonSwitch year={year} checked={includeOffseason} />
        </div>
        <ProgressiveGlobalTable
          key={`${yearNum}-${includeOffseason ? 1 : 0}`}
          initialStats={globalStats}
          year={year}
        />
      </main>
    </div>
  );
}
