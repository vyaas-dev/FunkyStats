"use client";

import { useRouter } from "next/navigation";

export default function OffseasonSwitch({
  year,
  checked,
}: {
  year: string;
  checked: boolean;
}) {
  const router = useRouter();

  const toggle = () => {
    router.push(`/global/${checked ? `${year}-no` : year}`);
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.65rem",
      }}
    >
      <span
        style={{
          fontWeight: "600",
          color: "var(--foreground)",
          fontSize: "1rem",
        }}
      >
        Include Offseason
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label="Include offseason events"
        onClick={toggle}
        style={{
          position: "relative",
          width: "3rem",
          height: "1.65rem",
          borderRadius: 999,
          border: "2px solid var(--border-color)",
          background: checked ? "var(--yellow-color)" : "var(--gray-more)",
          cursor: "pointer",
          padding: 0,
          transition: "background 0.2s ease, border-color 0.2s ease",
          flexShrink: 0,
        }}
      >
        <span
          aria-hidden
          style={{
            position: "absolute",
            top: "50%",
            left: checked ? "calc(100% - 1.2rem)" : "0.2rem",
            transform: "translateY(-50%)",
            width: "1rem",
            height: "1rem",
            borderRadius: "50%",
            background: checked ? "#000" : "var(--foreground)",
            transition: "left 0.2s ease, background 0.2s ease",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.2)",
          }}
        />
      </button>
    </div>
  );
}
