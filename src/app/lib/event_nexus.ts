import { getEventRevalidationTime } from "./eventUtils";

export type NexusScheduleData = {
  scheduledTime: string | null;
  actualTime: string | null;
  status: string;
  label: string;
};

export async function getNexusMatchSchedule(
  eventCode: string
): Promise<{ [key: string]: NexusScheduleData }> {
  try {
    const revalidateTime = await getEventRevalidationTime(eventCode);
    const nexusApiKey = "cfrUoyT-hh16Lx2BM-wZouwj07M";

    const response = await fetch(
      `https://frc.nexus/api/v1/event/${eventCode}`,
      {
        headers: {
          "Nexus-Api-Key": nexusApiKey,
        },
        next: { revalidate: revalidateTime },
      }
    );

    if (!response.ok) {
      return {};
    }

    const eventData = await response.json();
    const scheduleData: { [key: string]: NexusScheduleData } = {};

    if (eventData.matches && Array.isArray(eventData.matches)) {
      for (const match of eventData.matches) {
        const label = match.label || "";
        let matchKey = "";

        if (label.includes("Practice")) {
          const num = label.replace(/[^0-9]/g, "");
          matchKey = `${eventCode}_pm${num}`;
        } else if (label.includes("Qualification")) {
          const num = label.replace(/[^0-9]/g, "");
          matchKey = `${eventCode}_qm${num}`;
        } else if (label.includes("Playoff")) {
          const num = label.replace(/[^0-9]/g, "");
          matchKey = `${eventCode}_sf${num}m1`;
        } else if (label.includes("Final")) {
          const num = label.replace(/[^0-9]/g, "");
          matchKey = `${eventCode}_f1m${num}`;
        } else {
          matchKey = `${eventCode}_${label.replace(/\s+/g, "_").toLowerCase()}`;
        }

        scheduleData[matchKey] = {
          scheduledTime: match.times?.estimatedStartTime
            ? new Date(match.times.estimatedStartTime).toISOString()
            : null,
          actualTime: match.times?.startTime
            ? new Date(match.times.startTime).toISOString()
            : null,
          status: match.status,
          label: match.label,
        };
      }
    }

    return scheduleData;
  } catch (error) {
    console.error("Error fetching Nexus schedule:", error);
    return {};
  }
}
