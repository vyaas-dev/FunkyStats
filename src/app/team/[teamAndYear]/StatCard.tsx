"use client";

export default function StatCard({
  label,
  value,
  subtitle,
  color,
  compact = false,
  grow = true,
}: {
  label: string;
  value: string;
  subtitle?: string;
  color?: string;
  compact?: boolean;
  grow?: boolean;
}) {
  return (
    <div
      style={{
        background: "var(--background-pred)",
        border: "2px solid var(--border-color)",
        borderRadius: 12,
        padding: compact ? "1rem 0.65rem" : "1.5rem",
        textAlign: "center",
        boxShadow:
          "0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)",
        transition: "transform 0.2s, box-shadow 0.2s",
        flex: compact ? "1 1 0" : grow ? "1 1 200px" : "0 0 auto",
        minWidth: compact ? 0 : grow ? "200px" : undefined,
        width: !compact && !grow ? "14rem" : undefined,
        maxWidth: !compact && !grow ? "16rem" : undefined,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.boxShadow =
          "0 12px 24px rgba(0, 0, 0, 0.15), 0 6px 12px rgba(0, 0, 0, 0.1)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow =
          "0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)";
      }}
    >
      <div
        style={{
          fontSize: compact ? "0.65rem" : "0.75rem",
          fontWeight: "700",
          color: "var(--gray-less)",
          letterSpacing: "0.05em",
          marginBottom: compact ? "0.35rem" : "0.5rem",
          lineHeight: 1.2,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: compact ? "1.75rem" : "2.5rem",
          fontWeight: "bold",
          color: color || "var(--yellow-color)",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      {subtitle && (
        <div
          style={{
            fontSize: compact ? "0.75rem" : "0.875rem",
            color: "var(--gray-less)",
            marginTop: compact ? "0.25rem" : "0.5rem",
          }}
        >
          {subtitle}
        </div>
      )}
    </div>
  );
}
