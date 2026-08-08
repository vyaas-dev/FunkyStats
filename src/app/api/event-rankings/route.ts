import { NextRequest, NextResponse } from "next/server";

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

    const res = await fetch(
      `https://www.thebluealliance.com/api/v3/event/${fullEventCode}/rankings`,
      {
        headers: {
          "X-TBA-Auth-Key": process.env.TBA_API_KEY!,
        },
      }
    );

    if (!res.ok) {
      return NextResponse.json({ rankings: [] });
    }

    const data = await res.json();

    return NextResponse.json(data, {
      headers: {
        "Cache-Control":
          "no-store, no-cache, must-revalidate, proxy-revalidate",
        Vary: "Accept, Accept-Encoding",
      },
    });
  } catch (error) {
    console.error("Error fetching event rankings:", error);
    return NextResponse.json({ rankings: [] });
  }
}
