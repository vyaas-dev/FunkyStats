import { NextRequest, NextResponse } from "next/server";

const DISTRICT_DISPLAY_NAMES: Record<string, string> = {
  fim: "FIRST in Michigan",
  fit: "FIRST in Texas",
  fma: "FIRST Mid-Atlantic",
  fnc: "FIRST North Carolina",
  ne: "New England",
  ont: "Ontario",
  pnw: "Pacific Northwest",
  pch: "Peach State",
  chs: "Chesapeake",
  isr: "Israel",
  in: "Indiana",
  fsc: "FIRST South Carolina",
};

export async function GET(request: NextRequest) {
  const year = request.nextUrl.searchParams.get("year") || "2026";

  try {
    const districtRes = await fetch(
      `https://www.thebluealliance.com/api/v3/districts/${year}`,
      {
        headers: { "X-TBA-Auth-Key": process.env.TBA_API_KEY! },
        next: { revalidate: 86400 },
      }
    );

    if (!districtRes.ok) {
      return NextResponse.json({ districts: {} });
    }

    const districtList: { key: string; display_name: string; abbreviation: string }[] =
      await districtRes.json();

    const teamDistrictMap: Record<string, string> = {};

    const teamFetches = districtList.map(async (d) => {
      const teamsRes = await fetch(
        `https://www.thebluealliance.com/api/v3/district/${d.key}/teams/keys`,
        {
          headers: { "X-TBA-Auth-Key": process.env.TBA_API_KEY! },
          next: { revalidate: 86400 },
        }
      );

      if (!teamsRes.ok) return;

      const teamKeys: string[] = await teamsRes.json();
      const displayName =
        DISTRICT_DISPLAY_NAMES[d.abbreviation] || d.display_name || d.abbreviation.toUpperCase();

      for (const tk of teamKeys) {
        teamDistrictMap[tk] = displayName;
      }
    });

    await Promise.all(teamFetches);

    return NextResponse.json({ districts: teamDistrictMap });
  } catch (error) {
    console.error("Error fetching districts:", error);
    return NextResponse.json({ districts: {} });
  }
}
