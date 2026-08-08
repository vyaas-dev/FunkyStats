"use client";

interface LoadingIndicatorProps {
  message?: string;
}

/** Blue spinning loader + optional message. */
export function LoadingIndicator({
  message = "Loading...",
}: LoadingIndicatorProps) {
  return (
    <>
      <div
        className="fsm-loader"
        style={{
          width: "50px",
          height: "50px",
          border: "5px solid #f3f3f3",
          borderTop: "5px solid #0070f3",
          borderRadius: "50%",
        }}
        aria-hidden
      />
      <style jsx>{`
        .fsm-loader {
          animation: fsm-spin 1s linear infinite;
        }
        @keyframes fsm-spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
      <p style={{ fontSize: "1.2rem", color: "var(--foreground)", margin: 0 }}>
        {message}
      </p>
    </>
  );
}

interface LoadingSpinnerProps {
  message?: string;
}

export default function LoadingSpinner({
  message = "Loading...",
}: LoadingSpinnerProps) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "calc(100svh - 7rem)",
        flexDirection: "column",
        gap: "1.25rem",
        padding: "1.5rem",
        boxSizing: "border-box",
      }}
      role="status"
      aria-busy="true"
      aria-label={message}
    >
      <LoadingIndicator message={message} />
    </div>
  );
}
