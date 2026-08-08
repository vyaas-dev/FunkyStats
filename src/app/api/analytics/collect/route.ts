import { NextRequest, NextResponse } from "next/server";
import { recordLoadTime, recordVisit } from "@/app/lib/analytics/store";

export const runtime = "nodejs";

type CollectBody =
  | { type: "visit"; path: string; visitorId: string }
  | { type: "load"; path: string; loadMs: number };

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CollectBody;

    if (body.type === "visit") {
      if (!body.path || !body.visitorId) {
        return NextResponse.json({ error: "Invalid visit payload" }, { status: 400 });
      }
      await recordVisit(body.path, body.visitorId);
      return NextResponse.json({ ok: true });
    }

    if (body.type === "load") {
      if (!body.path || body.loadMs == null) {
        return NextResponse.json({ error: "Invalid load payload" }, { status: 400 });
      }
      await recordLoadTime(body.path, body.loadMs);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown event type" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Failed to record event" }, { status: 500 });
  }
}
