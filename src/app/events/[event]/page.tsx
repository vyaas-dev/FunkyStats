import {
  getEventQualMatches,
  getEventTeams,
  getMatchPredictions,
  getAttendingTeams,
  getEventAlliances,
} from "@/app/lib/fsm";
import ClientPage from "./clientpage";
import FuturePage from "./futurepage";
import { redirect } from "next/navigation";

const DEFAULT_FSM_MEAN = 45;

type EventDetail = {
  key: string;
  name?: string;
  short_name?: string;
  city?: string;
  state_prov?: string;
  country?: string;
  start_date?: string | null;
  end_date?: string | null;
  week?: number | null;
  event_type?: number | null;
  event_type_string?: string | null;
  website?: string | null;
  webcasts?: Array<{
    type?: string;
    channel?: string;
    file?: string;
  }> | null;
  district?: { display_name?: string } | null;
};

function formatEventLocation(detail: EventDetail): string {
  return [detail.city, detail.state_prov, detail.country]
    .filter(Boolean)
    .join(", ");
}

function formatEventDateRange(
  start?: string | null,
  end?: string | null
): string {
  if (!start && !end) return "";
  const fmt = (iso: string) => {
    const d = new Date(`${iso}T12:00:00`);
    return d.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };
  if (start && end && start !== end) return `${fmt(start)} - ${fmt(end)}`;
  if (start) return fmt(start);
  return fmt(end!);
}

function resolveWebcastUrl(
  webcasts?: EventDetail["webcasts"]
): { url: string; kind: "youtube" | "other" } | null {
  if (!webcasts?.length) return null;
  const youtube = webcasts.find((w) => w.type === "youtube" && w.channel);
  if (youtube?.channel) {
    return {
      url: `https://www.youtube.com/watch?v=${youtube.channel}`,
      kind: "youtube",
    };
  }
  const twitch = webcasts.find((w) => w.type === "twitch" && w.channel);
  if (twitch?.channel) {
    return {
      url: `https://www.twitch.tv/${twitch.channel}`,
      kind: "other",
    };
  }
  const any = webcasts.find((w) => w.channel);
  if (!any?.channel) return null;
  if (any.type === "ustream") {
    return {
      url: `https://www.ustream.tv/channel/${any.channel}`,
      kind: "other",
    };
  }
  return {
    url: any.channel.startsWith("http")
      ? any.channel
      : `https://${any.channel}`,
    kind: "other",
  };
}

export type EventHeaderInfo = {
  key: string;
  name: string;
  location: string;
  dateRange: string;
  isOffseason: boolean;
  eventTypeLabel: string | null;
  website: string | null;
  watch: { url: string; kind: "youtube" | "other" } | null;
};

function parseEventParam(raw: string): {
  fullEventCode: string;
  year: number;
  shortCode: string;
} {
  if (/^\d{4}/.test(raw)) {
    const year = Number(raw.slice(0, 4));
    return { fullEventCode: raw, year, shortCode: raw.slice(4) };
  }
  return { fullEventCode: `2026${raw}`, year: 2026, shortCode: raw };
}

function isRecentFromDetail(detail: EventDetail | null): boolean {
  if (!detail?.start_date || !detail?.end_date) return false;
  const startDate = new Date(detail.start_date);
  const endDate = new Date(detail.end_date);
  const now = new Date();
  const isHappening = now >= startDate && now <= endDate;
  const justEnded =
    now > endDate && now.getTime() - endDate.getTime() < 24 * 60 * 60 * 1000;
  return isHappening || justEnded;
}

async function fetchEventDetail(eventCode: string): Promise<EventDetail | null> {
  const res = await fetch(
    `https://www.thebluealliance.com/api/v3/event/${eventCode}`,
    {
      headers: { "X-TBA-Auth-Key": process.env.TBA_API_KEY! },
      next: { revalidate: 300 },
    }
  );
  if (!res.ok) return null;
  return res.json();
}

export default async function EventPage({
  params,
}: {
  params: Promise<{ event: string }>;
}) {
  const { event: rawEvent } = await params;
  const { fullEventCode, year, shortCode } = parseEventParam(rawEvent);

  if (year < 2025) {
    redirect(`/event/${fullEventCode}`);
  }

  try {
    // Fetch event detail first so we can decide forceRecalc without a second TBA trip.
    const eventDetailResult = await fetchEventDetail(fullEventCode);
    const forceRecalc = isRecentFromDetail(eventDetailResult);

    const [teamsFromEvent, matches, attendingTeams, alliances] =
      await Promise.all([
        getEventTeams(fullEventCode, forceRecalc),
        getEventQualMatches(fullEventCode, true),
        getAttendingTeams(fullEventCode),
        getEventAlliances(fullEventCode).catch(() => null),
      ]);

    const eventDetail: EventDetail = eventDetailResult ?? {
      key: fullEventCode,
      name: fullEventCode,
      city: "",
      state_prov: "",
      country: "",
      start_date: null,
      end_date: null,
      week: null,
      event_type: null,
      event_type_string: null,
      website: null,
      webcasts: null,
      district: null,
    };

    const eventInfo: EventHeaderInfo = {
      key: eventDetail.key || fullEventCode,
      name: eventDetail.name || eventDetail.short_name || fullEventCode,
      location: formatEventLocation(eventDetail),
      dateRange: formatEventDateRange(
        eventDetail.start_date,
        eventDetail.end_date
      ),
      isOffseason: eventDetail.event_type === 99,
      eventTypeLabel: eventDetail.event_type_string ?? null,
      website: eventDetail.website || null,
      watch: resolveWebcastUrl(eventDetail.webcasts),
    };

    const playedMatches = matches.filter((m) => m.score_breakdown).length;

    const teamsByKey = new Map(
      teamsFromEvent.map((team) => [team.key, { ...team }])
    );
    for (const team of attendingTeams) {
      const existing = teamsByKey.get(team.key);
      if (!existing) {
        teamsByKey.set(team.key, {
          key: team.key,
          rank: 0,
          fsm: "0.00",
          nickname: team.nickname,
        });
      } else if (team.nickname && !existing.nickname) {
        existing.nickname = team.nickname;
      }
    }
    const teams = Array.from(teamsByKey.values());

    // Event-local FSM only — never pull season / prior-year globals here.
    const positiveFsms = teams
      .map((t) => Number(t.fsm))
      .filter((v) => Number.isFinite(v) && v > 0);
    const fallbackFsm =
      positiveFsms.length > 0
        ? positiveFsms.reduce((a, b) => a + b, 0) / positiveFsms.length
        : DEFAULT_FSM_MEAN;

    const FSMs: { [key: string]: number } = {};
    for (const team of teams) {
      const actualFSM = Number(team.fsm);
      if (Number.isFinite(actualFSM) && actualFSM > 0) {
        FSMs[team.key] = actualFSM;
        (team as any).predicted = false;
      } else {
        FSMs[team.key] = fallbackFsm;
        team.fsm = fallbackFsm.toFixed(2);
        (team as any).predicted = true;
      }
    }

    if (playedMatches === 0) {
      const ranked = [...teams].sort(
        (a, b) => (Number(FSMs[b.key]) || 0) - (Number(FSMs[a.key]) || 0)
      );
      ranked.forEach((team, idx) => {
        team.rank = idx + 1;
      });
    }

    let matchPredictions: Record<
      string,
      { preds: string[]; red: string[]; blue: string[]; result: number[] }
    > = {};
    if (matches.length > 0) {
      matchPredictions = await getMatchPredictions(
        fullEventCode,
        FSMs,
        matches
      );
    }

    const havePreds =
      matchPredictions && Object.keys(matchPredictions).length > 0;

    return (
      <ClientPage
        havePreds={havePreds}
        year={year}
        eventCode={shortCode}
        fullEventCode={fullEventCode}
        eventType={eventDetail.event_type ?? null}
        eventInfo={eventInfo}
        teams={teams}
        matchPredictions={matchPredictions}
        matches={matches}
        playedMatches={playedMatches}
        predictedFsms={FSMs}
        alliances={alliances ?? []}
      />
    );
  } catch {
    const attendingKeys = (await getAttendingTeams(fullEventCode)).map(
      (t) => t.key
    );
    const FSMs: { [key: string]: number } = {};
    const predictedFlags: { [key: string]: boolean } = {};

    for (const teamKey of attendingKeys) {
      FSMs[teamKey] = DEFAULT_FSM_MEAN;
      predictedFlags[teamKey] = true;
    }

    return (
      <FuturePage
        year={year}
        code={shortCode}
        fsms={FSMs}
        predictedFlags={predictedFlags}
      />
    );
  }
}
