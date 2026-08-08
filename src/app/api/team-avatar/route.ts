import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const revalidate = 3600;

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

    const res = await fetch(
      `https://www.thebluealliance.com/api/v3/team/${team}/media/${year}`,
      {
        headers: { "X-TBA-Auth-Key": process.env.TBA_API_KEY! },
        next: { revalidate },
      }
    );

    if (!res.ok) {
      return NextResponse.json({ avatarUrl: null });
    }

    const media = (await res.json()) as any[];
    const avatar = media.find(
      (m) => m?.type === "avatar" && m?.details?.base64Image
    );
    const avatarUrl = avatar?.details?.base64Image
      ? `data:image/png;base64,${avatar.details.base64Image}`
      : null;

    return NextResponse.json(
      { avatarUrl },
      {
        headers: {
          "Cache-Control": "private, max-age=300",
          "CDN-Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching team avatar:", error);
    return NextResponse.json({ avatarUrl: null }, { status: 200 });
  }
}

