/* eslint-disable */
import { getEventTeams, TeamData } from "../lib/fsm";
import { getTeamRevalidationTime } from "../lib/eventUtils";

async function getTeamEvents(teamKey: string, year: number = 2025) {
  const revalidateTime = await getTeamRevalidationTime(teamKey, year);

  const res = await fetch(
    `https://www.thebluealliance.com/api/v3/team/${teamKey}/events/${year}`,
    {
      headers: {
        "X-TBA-Auth-Key": process.env.TBA_API_KEY!,
      },
      next: { revalidate: revalidateTime },
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch events for team: ${teamKey}`);
  }

  const events = await res.json();

  events.sort(
    (a: { start_date: string }, b: { start_date: string }) =>
      new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
  );

  return events;
}

export type EventDataType = {
  event: string;
  teamfsm: string;
  teamrank: number;
  pending?: boolean;
};

export async function getTeamStats(teamKey: string, year: number = 2025) {
  const events = await getTeamEvents(teamKey, year);
  if (events.length === 0) {
    throw new Error(`No events found for team: ${teamKey}`);
  }

  const fetchEventTeams = (eventKey: string) => getEventTeams(eventKey);

  const eventResults = await Promise.allSettled(
    events.map((event: { key: string }) => fetchEventTeams(event.key))
  );

  const teamData: EventDataType[] = [];
  let bestComponents = { auto: 0, fuel: 0, climb: 0, coral: 0, algae: 0, foul: 0 };
  let bestEventFsm = 0;

  eventResults.forEach((result, idx) => {
    if (result.status === "fulfilled") {
      const teams = result.value;
      const team = teams.find((t: TeamData) => t.key === teamKey);
      if (team) {
        const teamRank = Number(team.rank) || 0;
        const teamFsm = String(team.fsm ?? "0");
        const fsmNum = Number(teamFsm) || 0;
        const pending = teamRank === 0 || fsmNum <= 0;
        teamData.push({
          event: events[idx].key,
          teamfsm: teamFsm,
          teamrank: teamRank,
          pending,
        });
        if (!pending && fsmNum > bestEventFsm) {
          bestEventFsm = fsmNum;
          bestComponents = {
            auto: Number(team.auto ?? 0),
            fuel: Number(team.fuel ?? 0),
            climb: Number(team.climb ?? 0),
            coral: Number(team.coral ?? 0),
            algae: Number(team.algae ?? 0),
            foul: Number(team.foul ?? 0),
          };
        }
      }
    }
  });

  const playedFsms = teamData
    .filter((event) => !event.pending)
    .map((event) => Number(event.teamfsm))
    .filter((v) => Number.isFinite(v) && v > 0)
    .sort((a, b) => b - a);

  let bestFSM = 0.0;
  if (playedFsms.length === 1) bestFSM = playedFsms[0];
  else if (playedFsms.length >= 2)
    bestFSM = Math.sqrt((playedFsms[0] ** 2 + playedFsms[1] ** 2) / 2);

  return { teamData, bestFSM, bestComponents };
}

export async function getTeamInfo(teamKey: string) {
  const res = await fetch(
    `https://www.thebluealliance.com/api/v3/team/${teamKey}`,
    {
      headers: {
        "X-TBA-Auth-Key": process.env.TBA_API_KEY!,
      },
      next: { revalidate: 86400 },
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch info for team: ${teamKey}`);
  }

  const teamInfo = await res.json();
  return teamInfo;
}

export async function getTeamAwards(teamKey: string, year: number) {
  try {
    const res = await fetch(
      `https://www.thebluealliance.com/api/v3/team/${teamKey}/awards/${year}`,
      {
        headers: {
          "X-TBA-Auth-Key": process.env.TBA_API_KEY!,
        },
        next: { revalidate: 3600 },
      }
    );
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export type TeamMediaType = {
  type: string;
  foreign_key?: string;
  direct_url?: string;
  view_url?: string;
  details?: any;
  preferred?: boolean;
};

export type ProcessedMediaType = {
  url: string;
  type: string;
  mediaType: "image" | "video";
  preferred: boolean;
  foreignKey?: string;
};

export async function getTeamMedia(teamKey: string, year: number) {
  const revalidateTime = await getTeamRevalidationTime(teamKey, year);

  const res = await fetch(
    `https://www.thebluealliance.com/api/v3/team/${teamKey}/media/${year}`,
    {
      headers: {
        "X-TBA-Auth-Key": process.env.TBA_API_KEY!,
      },
      next: { revalidate: revalidateTime },
    }
  );

  if (!res.ok) {
    return [];
  }

  const media: TeamMediaType[] = await res.json();

  const processedMedia = media.map((m) => {
    let url = "";
    let mediaType: "image" | "video" = "image";

    if (m.type === "youtube" && m.foreign_key) {
      url = `https://www.youtube-nocookie.com/embed/${m.foreign_key}`;
      mediaType = "video";
    } else if (m.type === "grabcad" && m.foreign_key) {
      url = `https://grabcad.com/library/${m.foreign_key}`;
      mediaType = "video";
    } else if (m.direct_url) {
      url = m.direct_url;
      mediaType = "image";
    } else if ((m as any).details?.image_url) {
      url = String((m as any).details.image_url);
      mediaType = "image";
    } else if (m.type === "avatar" && (m as any).details?.base64Image) {
      url = `data:image/png;base64,${(m as any).details.base64Image}`;
      mediaType = "image";
    } else if (m.type === "imgur" && m.foreign_key) {
      url = `https://i.imgur.com/${m.foreign_key}`;
      mediaType = "image";
    } else if ((m as any).details?.thumbnail_url) {
      url = String((m as any).details.thumbnail_url);
      mediaType = "image";
    } else if (m.type === "instagram-image" && m.foreign_key) {
      url = `https://www.instagram.com/p/${m.foreign_key}/`;
      mediaType = "image";
    }

    return {
      url,
      type: m.type,
      mediaType,
      preferred: m.preferred || false,
      foreignKey: m.foreign_key,
    };
  });

  const withUrls = processedMedia.filter((m) => m.url);

  // Prefer robot photos over TBA avatar logos
  const nonAvatarImages = withUrls.filter(
    (m) => m.mediaType === "image" && m.type !== "avatar"
  );
  const avatarImages = withUrls.filter(
    (m) => m.mediaType === "image" && m.type === "avatar"
  );
  const videos = withUrls.filter((m) => m.mediaType === "video");

  const orderedImages =
    nonAvatarImages.length > 0
      ? nonAvatarImages
      : avatarImages.length > 0
      ? avatarImages
      : [];

  orderedImages.sort((a, b) => Number(b.preferred) - Number(a.preferred));

  return [...orderedImages, ...videos];
}
