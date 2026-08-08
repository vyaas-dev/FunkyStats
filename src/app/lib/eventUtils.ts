const eventCache = new Map<string, { isRecent: boolean; timestamp: number }>();

export async function isEventRecent(eventCode: string): Promise<boolean> {
  const cached = eventCache.get(eventCode);
  if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
    return cached.isRecent;
  }

  try {
    const res = await fetch(
      `https://www.thebluealliance.com/api/v3/event/${eventCode}`,
      {
        headers: {
          "X-TBA-Auth-Key": process.env.TBA_API_KEY!,
        },
        next: { revalidate: 300 },
      }
    );

    if (!res.ok) {
      console.warn(`Failed to fetch event info for ${eventCode}`);
      return false;
    }

    const eventData = await res.json();
    const startDate = new Date(eventData.start_date);
    const endDate = new Date(eventData.end_date);
    const now = new Date();

    const isHappening = now >= startDate && now <= endDate;
    const justEnded =
      now > endDate && now.getTime() - endDate.getTime() < 24 * 60 * 60 * 1000;

    const isRecent = isHappening || justEnded;
    eventCache.set(eventCode, { isRecent, timestamp: Date.now() });

    return isRecent;
  } catch (error) {
    console.error(`Error checking if event is recent: ${eventCode}`, error);
    return false;
  }
}

export async function getEventRevalidationTime(
  eventCode: string
): Promise<number> {
  const isRecent = await isEventRecent(eventCode);

  if (isRecent) {
    return 120;
  } else {
    return 3600;
  }
}

export function isEventLikelyRecent(eventCode: string): boolean {
  const currentYear = new Date().getFullYear();
  const eventYear = parseInt(eventCode.slice(0, 4));

  return eventYear >= currentYear;
}

const teamCache = new Map<
  string,
  { isAtRecentEvent: boolean; timestamp: number }
>();

export async function isTeamAtRecentEvent(
  teamKey: string,
  year: number = new Date().getFullYear()
): Promise<boolean> {
  const cacheKey = `${teamKey}_${year}`;
  const cached = teamCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
    return cached.isAtRecentEvent;
  }

  try {
    const res = await fetch(
      `https://www.thebluealliance.com/api/v3/team/${teamKey}/events/${year}`,
      {
        headers: {
          "X-TBA-Auth-Key": process.env.TBA_API_KEY!,
        },
        next: { revalidate: 300 },
      }
    );

    if (!res.ok) {
      console.warn(`Failed to fetch events for team ${teamKey}`);
      return false;
    }

    const events = await res.json();

    for (const event of events) {
      const startDate = new Date(event.start_date);
      const endDate = new Date(event.end_date);
      const now = new Date();

      const isHappening = now >= startDate && now <= endDate;
      const justEnded =
        now > endDate &&
        now.getTime() - endDate.getTime() < 24 * 60 * 60 * 1000;

      if (isHappening || justEnded) {
        teamCache.set(cacheKey, {
          isAtRecentEvent: true,
          timestamp: Date.now(),
        });
        return true;
      }
    }

    teamCache.set(cacheKey, { isAtRecentEvent: false, timestamp: Date.now() });
    return false;
  } catch (error) {
    console.error(
      `Error checking if team is at recent event: ${teamKey}`,
      error
    );
    return false;
  }
}

export async function getTeamRevalidationTime(
  teamKey: string,
  year: number = new Date().getFullYear()
): Promise<number> {
  const currentYear = new Date().getFullYear();
  const isAtRecentEvent = await isTeamAtRecentEvent(teamKey, year);

  if (isAtRecentEvent) {
    return 120;
  } else if (year === currentYear) {
    return 600;
  } else {
    return 3600;
  }
}
