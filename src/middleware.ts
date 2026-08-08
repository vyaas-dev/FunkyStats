import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const VISITOR_COOKIE = "fsm_vid";

function shouldTrack(pathname: string): boolean {
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/analytics") ||
    pathname === "/favicon.ico"
  ) {
    return false;
  }
  if (pathname.includes(".")) return false;
  return true;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!shouldTrack(pathname)) {
    return NextResponse.next();
  }

  let visitorId = request.cookies.get(VISITOR_COOKIE)?.value;
  const response = NextResponse.next();

  if (!visitorId) {
    visitorId = crypto.randomUUID();
    response.cookies.set(VISITOR_COOKIE, visitorId, {
      maxAge: 60 * 60 * 24 * 365,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
  }

  const collectUrl = new URL("/api/analytics/collect", request.url);
  void fetch(collectUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "visit",
      path: pathname,
      visitorId,
    }),
  }).catch(() => {});

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
