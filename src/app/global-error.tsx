"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif" }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "100vh",
            padding: "2rem",
            color: "#333",
            background: "#fafafa",
            textAlign: "center",
          }}
        >
          <h1 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>
            Something went wrong
          </h1>
          <p style={{ opacity: 0.85, marginBottom: "1.5rem", maxWidth: "400px" }}>
            A critical error occurred. Try refreshing the page.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              padding: "0.6rem 1.2rem",
              fontSize: "1rem",
              fontWeight: 600,
              borderRadius: 8,
              background: "#d89000",
              color: "#000",
              border: "none",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
