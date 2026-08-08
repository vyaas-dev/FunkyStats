import { NextRequest, NextResponse } from "next/server";

type MatchDetailsResponse = Record<string, unknown>;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const matchKey = searchParams.get("matchKey")?.trim();
    const year = searchParams.get("year")?.trim();

    if (!matchKey) {
      return NextResponse.json(
        { error: "Match key is required" },
        { status: 400 }
      );
    }

    const candidateKeys = [matchKey];
    if (year && !/^\d{4}/.test(matchKey)) {
      candidateKeys.push(`${year}${matchKey}`);
    }

    let data: MatchDetailsResponse | null = null;
    let lastStatus = 404;
    for (const candidate of candidateKeys) {
      const res = await fetch(
        `https://www.thebluealliance.com/api/v3/match/${candidate}`,
        {
          headers: {
            "X-TBA-Auth-Key": process.env.TBA_API_KEY!,
          },
          cache: "no-store",
        }
      );
      if (!res.ok) {
        lastStatus = res.status;
        continue;
      }
      data = await res.json();
      break;
    }

    if (!data) {
      return NextResponse.json(
        { error: "Failed to fetch match details" },
        { status: lastStatus }
      );
    }

    return NextResponse.json(data, {
      headers: {
        "Cache-Control":
          "public, max-age=60, s-maxage=120, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    console.error("Error fetching match details:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
