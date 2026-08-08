"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function EventError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Event page error:", error);
  }, [error]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        padding: "2rem",
        color: "var(--foreground)",
        fontFamily: "var(--font-geist-sans)",
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>
        Failed to load event
      </h1>
      <p style={{ opacity: 0.85, marginBottom: "1.5rem", maxWidth: "400px" }}>
        This event page couldn&apos;t be loaded. Event data can take 10–15 seconds on first load; if it timed out, try again.
      </p>
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", justifyContent: "center" }}>
        <button
          type="button"
          onClick={reset}
          style={{
            padding: "0.6rem 1.2rem",
            fontSize: "1rem",
            fontWeight: 600,
            borderRadius: 8,
            background: "var(--yellow-color)",
            color: "#000",
            border: "none",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
        <Link
          href="/dashboard"
          style={{
            padding: "0.6rem 1.2rem",
            fontSize: "1rem",
            fontWeight: 600,
            borderRadius: 8,
            background: "var(--gray-more)",
            color: "var(--foreground)",
            textDecoration: "none",
            border: "1px solid var(--border-color)",
          }}
        >
          Dashboard
        </Link>
      </div>
    </div>
  );
}
