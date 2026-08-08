import { NextRequest, NextResponse } from "next/server";
import { normalizeStateProv } from "@/app/lib/stateAbbreviations";

async function getTeamLocation(teamKey: string) {
  try {
    const res = await fetch(
      `https://www.thebluealliance.com/api/v3/team/${teamKey}`,
      {
        headers: {
          "X-TBA-Auth-Key": process.env.TBA_API_KEY!,
        },
        next: { revalidate: 604800 },
      }
    );

    if (!res.ok) {
      return { country: "", state_prov: "" };
    }

    const teamInfo = await res.json();
    return {
      country: teamInfo.country || "",
      state_prov: normalizeStateProv(teamInfo.state_prov || ""),
    };
  } catch {
    return { country: "", state_prov: "" };
  }
}

export async function POST(request: NextRequest) {
  try {
    const { teamKeys } = await request.json();

    if (!teamKeys || !Array.isArray(teamKeys)) {
      return NextResponse.json(
        { error: "teamKeys array is required" },
        { status: 400 }
      );
    }

    const locations: Record<string, { country: string; state_prov: string }> =
      {};

    const batchSize = 100;
    for (let i = 0; i < teamKeys.length; i += batchSize) {
      const batch = teamKeys.slice(i, i + batchSize);
      const batchResults = await Promise.allSettled(
        batch.map((teamKey) => getTeamLocation(teamKey))
      );

      batch.forEach((teamKey, idx) => {
        const result = batchResults[idx];
        locations[teamKey] =
          result.status === "fulfilled"
            ? result.value
            : { country: "", state_prov: "" };
      });
    }

    return NextResponse.json({ locations });
  } catch (error) {
    console.error("Error fetching team locations:", error);
    return NextResponse.json(
      { error: "Failed to fetch locations" },
      { status: 500 }
    );
  }
}
