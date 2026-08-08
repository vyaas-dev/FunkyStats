import { NextRequest, NextResponse } from "next/server";
import { getGlobalStats } from "@/app/lib/global";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const year = parseInt(searchParams.get("year") || "2025");

    const stats = await getGlobalStats(year);

    return NextResponse.json(stats, {
      headers: {
        "Cache-Control":
          "public, max-age=300, s-maxage=600, stale-while-revalidate=3600",
        Vary: "Accept, Accept-Encoding",
      },
    });
  } catch (error) {
    console.error("Error fetching global stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch global stats" },
      { status: 500 }
    );
  }
}
