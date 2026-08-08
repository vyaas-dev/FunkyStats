import { NextRequest, NextResponse } from "next/server";
import { getTeamStats } from "@/app/lib/team";
import { isTeamAtRecentEvent } from "@/app/lib/eventUtils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const team = searchParams.get("team");
    const year = parseInt(searchParams.get("year") || "2025");

    if (!team) {
      return NextResponse.json(
        { error: "Team key is required" },
        { status: 400 }
      );
    }

    const stats = await getTeamStats(team, year);

    const isAtRecentEvent = await isTeamAtRecentEvent(team, year);
    const cacheMaxAge = isAtRecentEvent ? 60 : 600;

    return NextResponse.json(stats, {
      headers: {
        "Cache-Control": `public, max-age=${cacheMaxAge}, s-maxage=${
          cacheMaxAge * 2
        }, stale-while-revalidate=${cacheMaxAge * 5}`,
        Vary: "Accept, Accept-Encoding",
      },
    });
  } catch (error) {
    console.error("Error fetching team stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch team stats" },
      { status: 500 }
    );
  }
}
