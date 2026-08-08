"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { prefetchPageData } from "../lib/cachedApi";

export default function CachePreloader() {
  const pathname = usePathname();

  useEffect(() => {
    const segments = pathname.split("/").filter(Boolean);

    if (segments[0] === "team" && segments[1]) {
      const [teamKey, year] = segments[1].split("-");
      const yearNum = year === "general" ? 2025 : parseInt(year || "2025");
      prefetchPageData("team", { teamKey, year: yearNum });
    } else if (segments[0] === "event" && segments[1]) {
      prefetchPageData("event", { eventCode: segments[1] });
    } else if (segments[0] === "events" && segments[1] && segments[1] !== "all") {
      prefetchPageData("event", { eventCode: segments[1] });
    } else if (segments[0] === "global" && segments[1]) {
      const year = parseInt(segments[1]);
      prefetchPageData("global", { year });
    }
  }, [pathname]);

  return null;
}
