import { NextRequest, NextResponse } from "next/server";
import { getEventTeams } from "@/app/lib/fsm";

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

    const teams = await getEventTeams(event);

    return NextResponse.json(teams, {
      headers: {
        "Cache-Control":
          "no-store, no-cache, must-revalidate, proxy-revalidate",
        Vary: "Accept, Accept-Encoding",
      },
    });
  } catch (error) {
    console.error("Error fetching event teams:", error);
    return NextResponse.json(
      { error: "Failed to fetch event teams" },
      { status: 500 }
    );
  }
}
