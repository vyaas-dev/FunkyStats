import { NextRequest, NextResponse } from "next/server";
import { getTeamInfo } from "@/app/lib/team";

export const revalidate = 604800;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const team = searchParams.get("team");

    if (!team) {
      return NextResponse.json(
        { error: "Team key is required" },
        { status: 400 }
      );
    }

    const info = await getTeamInfo(team);

    return NextResponse.json(info, {
      headers: {
        "Cache-Control":
          "public, s-maxage=604800, stale-while-revalidate=2592000",
      },
    });
  } catch (error) {
    console.error("Error fetching team info:", error);
    return NextResponse.json(
      { error: "Failed to fetch team info" },
      { status: 500 }
    );
  }
}
