"use client";

import { useState } from "react";

type EventSearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  maxWidth?: number | string;
};

export default function EventSearchInput({
  value,
  onChange,
  placeholder,
  maxWidth = 520,
}: EventSearchInputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        maxWidth,
        margin: "0 auto",
      }}
    >
      <svg
        aria-hidden
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          position: "absolute",
          left: 14,
          top: "50%",
          transform: "translateY(-50%)",
          color: focused ? "var(--yellow-color)" : "var(--gray-less)",
          pointerEvents: "none",
          transition: "color 0.15s ease",
        }}
      >
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.3-4.3" />
      </svg>

      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: "0.85rem 2.75rem 0.85rem 2.75rem",
          borderRadius: 12,
          border: focused
            ? "2px solid rgba(156, 163, 175, 0.9)"
            : "2px solid rgba(156, 163, 175, 0.5)",
          background: "transparent",
          color: "var(--foreground)",
          fontSize: "0.95rem",
          fontWeight: 500,
          outline: "none",
          transition: "border-color 0.15s ease, background 0.15s ease",
        }}
      />

      {value ? (
        <button
          type="button"
          aria-label="Clear search"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onChange("")}
          style={{
            position: "absolute",
            right: 10,
            top: "50%",
            transform: "translateY(-50%)",
            width: 28,
            height: 28,
            borderRadius: 8,
            border: "none",
            background: "transparent",
            color: "var(--gray-less)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            lineHeight: 1,
          }}
        >
          ×
        </button>
      ) : null}
    </div>
  );
}
