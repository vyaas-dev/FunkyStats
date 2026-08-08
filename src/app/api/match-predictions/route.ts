import { NextRequest, NextResponse } from "next/server";
import {
  getMatchPredictions,
  getEventTeams,
  getEventQualMatches,
} from "@/app/lib/fsm";
import { getGlobalStats } from "@/app/lib/global";
import { isEventRecent } from "@/app/lib/eventUtils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const event = searchParams.get("event");

    if (!event) {
      return NextResponse.json(
        { error: "Event code is required" },
        { status: 400 }
      );
    }

    const fullEventCode = /^\d{4}/.test(event) ? event : `2026${event}`;
    const forceRecalc = await isEventRecent(fullEventCode);

    const [teams, matches] = await Promise.all([
      getEventTeams(fullEventCode, forceRecalc),
      getEventQualMatches(fullEventCode, true),
    ]);

    const FSMs: { [key: string]: number } = {};
    teams.forEach((team) => {
      FSMs[team.key] = Number(team.fsm);
    });

    const playedMatchCount = matches.filter((m) => m.score_breakdown).length;
    if (playedMatchCount < 15) {
      const globalStats = await getGlobalStats();
      globalStats.forEach(({ teamKey, bestFSM }) => {
        FSMs[teamKey] = Number(bestFSM);
      });
    }

    const matchPredictions = await getMatchPredictions(
      fullEventCode,
      FSMs,
      matches
    );

    return NextResponse.json(matchPredictions, {
      headers: {
        "Cache-Control":
          "no-store, no-cache, must-revalidate, proxy-revalidate",
        Vary: "Accept, Accept-Encoding",
      },
    });
  } catch (error) {
    console.error("Error fetching match predictions:", error);
    return NextResponse.json(
      { error: "Failed to fetch match predictions" },
      { status: 500 }
    );
  }
}
