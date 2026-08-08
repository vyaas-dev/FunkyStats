"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

function getNavigationLoadMs(): number | null {
  if (typeof performance === "undefined") return null;

  const nav = performance.getEntriesByType("navigation")[0] as
    | PerformanceNavigationTiming
    | undefined;
  if (!nav) return null;

  const loadMs = nav.loadEventEnd - nav.startTime;
  return loadMs > 0 && Number.isFinite(loadMs) ? loadMs : null;
}

export default function AnalyticsBeacon() {
  const pathname = usePathname();
  const lastReported = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || pathname.startsWith("/analytics")) return;
    if (lastReported.current === pathname) return;

    const report = () => {
      const loadMs = getNavigationLoadMs();
      if (loadMs == null) return;

      lastReported.current = pathname;
      void fetch("/api/analytics/collect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "load", path: pathname, loadMs }),
        keepalive: true,
      }).catch(() => {});
    };

    if (document.readyState === "complete") {
      report();
      return;
    }

    window.addEventListener("load", report, { once: true });
    return () => window.removeEventListener("load", report);
  }, [pathname]);

  return null;
}
