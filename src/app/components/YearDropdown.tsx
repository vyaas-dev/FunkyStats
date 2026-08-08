"use client";

import { useRouter } from "next/navigation";

interface YearDropdownProps {
  currentYear: string;
  includeOffseason: boolean;
}

const availableYears = [
  "2026",
  "2025",
  "2024",
  "2023",
  "2022",
  "2019",
  "2018",
];

export default function YearDropdown({
  currentYear,
  includeOffseason,
}: YearDropdownProps) {
  const router = useRouter();

  const handleYearChange = (newYear: string) => {
    const suffix = includeOffseason ? "" : "-no";
    router.push(`/global/${newYear}${suffix}`);
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
      <label
        htmlFor="year-select"
        style={{
          fontWeight: "600",
          color: "var(--foreground)",
          fontSize: "1rem",
        }}
      >
        Year:
      </label>
      <select
        id="year-select"
        value={currentYear}
        onChange={(e) => handleYearChange(e.target.value)}
        style={{
          padding: "0.5rem 2rem 0.5rem 0.75rem",
          borderRadius: 8,
          border: "2px solid var(--border-color)",
          background: "var(--background-pred)",
          color: "var(--foreground)",
          fontSize: "1rem",
          fontWeight: "600",
          cursor: "pointer",
          outline: "none",
          transition: "all 0.2s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "var(--yellow-color)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "var(--border-color)";
        }}
      >
        {availableYears.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>
    </div>
  );
}
