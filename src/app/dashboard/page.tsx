/* eslint-disable */

import { getEvents } from "@/app/lib/global";
import ClientPage from "./ClientPage";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DashboardPage() {
  try {
    const events = await getEvents(2026);

    return <ClientPage events={events} />;
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          color: "var(--foreground)",
        }}
      >
        <div>
          <h1>Error loading dashboard</h1>
          <p>Please try again later.</p>
        </div>
      </div>
    );
  }
}
