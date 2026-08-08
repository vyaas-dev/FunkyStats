import { NextRequest, NextResponse } from "next/server";
import { getTeams } from "@/app/lib/global";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const year = parseInt(searchParams.get("year") || "2026");
    const teams = await getTeams(year);

    return NextResponse.json(teams, {
      headers: {
        "Cache-Control":
          "public, max-age=3600, s-maxage=7200, stale-while-revalidate=86400",
        Vary: "Accept, Accept-Encoding",
      },
    });
  } catch (error) {
    console.error("Error fetching teams:", error);
    return NextResponse.json(
      { error: "Failed to fetch teams" },
      { status: 500 }
    );
  }
}
