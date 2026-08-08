import { NextRequest, NextResponse } from "next/server";
import { getTeamMedia } from "@/app/lib/team";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const team = searchParams.get("team");
    const year = Number(searchParams.get("year") || "2026");

    if (!team) {
      return NextResponse.json({ error: "Team key is required" }, { status: 400 });
    }

    if (!Number.isFinite(year) || year < 2000 || year > 2100) {
      return NextResponse.json({ error: "Invalid year" }, { status: 400 });
    }

    const media = await getTeamMedia(team, year);

    return NextResponse.json(media, {
      headers: {
        "Cache-Control": "private, max-age=300",
        "CDN-Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Error fetching team media:", error);
    return NextResponse.json(
      { error: "Failed to fetch team media" },
      { status: 500 }
    );
  }
}

