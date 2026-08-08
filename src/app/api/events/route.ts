import { NextRequest, NextResponse } from "next/server";
import { getEvents } from "@/app/lib/global";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const year = parseInt(searchParams.get("year") || "2025");

    const events = await getEvents(year);

    return NextResponse.json(events, {
      headers: {
        "Cache-Control":
          "public, max-age=60, s-maxage=600, stale-while-revalidate=3600",
        Vary: "Accept, Accept-Encoding",
      },
    });
  } catch (error) {
    console.error("Error fetching events:", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}
