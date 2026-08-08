import styles from "../../page.module.css";
import {
  getEventTeams,
  getEventQualMatches,
  getEventAlliances,
} from "../../lib/event";
import { calculateEventUnluckiness } from "../../lib/unlucky";
import EventTeamsTable from "../../components/EventTeamsTable";

export default async function EventPage({
  params,
}: {
  params: Promise<{ event: string }>;
}) {
  const { event: eventCode } = await params;
  const teams = await getEventTeams(eventCode);
  const year = eventCode.slice(0, 4);
  const [matches, alliances] = await Promise.all([
    getEventQualMatches(eventCode, true),
    getEventAlliances(eventCode),
  ]);
  const eventMetrics = await calculateEventUnluckiness(
    teams,
    matches,
    alliances
  );

  return (
    <div
      className={styles.page}
      style={{ position: "relative", minHeight: "100vh" }}
    >
      <main className={styles.main}>
        <h1 className={styles.title}>Event FSM</h1>
        <h2 className={styles.table}>{eventCode}</h2>
        <EventTeamsTable
          teams={teams}
          year={year}
          sosZScoreMetrics={eventMetrics.sosZScore}
          unluckyMetrics={eventMetrics.unlucky}
        />
      </main>
    </div>
  );
}
