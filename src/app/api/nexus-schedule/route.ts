import { NextRequest, NextResponse } from "next/server";
import { getNexusMatchSchedule } from "@/app/lib/event";

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

    const nexusSchedule = await getNexusMatchSchedule(fullEventCode);

    return NextResponse.json(nexusSchedule, {
      headers: {
        "Cache-Control":
          "no-store, no-cache, must-revalidate, proxy-revalidate",
        Vary: "Accept, Accept-Encoding",
      },
    });
  } catch (error) {
    console.error("Error fetching nexus schedule:", error);
    return NextResponse.json(
      {},
      {
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  }
}
