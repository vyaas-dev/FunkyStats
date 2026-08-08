"use client";

import React from "react";
import Link from "next/link";

export default function TeamLink({
  teamKey,
  year,
}: {
  teamKey: string;
  year?: string | number;
}) {
  const teamNumber = teamKey.replace(/^frc/, "");
  if (!teamNumber) return <span>{teamKey}</span>;

  if (year !== undefined) {
    const y = String(year).replace(/[^0-9]/g, "");
    const ihref = `/team/frc${teamNumber}-${y}`;
    return (
      <Link
        href={ihref}
        style={{
          textDecoration: "underline",
          textDecorationThickness: "1px",
          textUnderlineOffset: "4px",
        }}
      >
        {teamNumber}
      </Link>
    );
  }

  return <span>{teamNumber}</span>;
}
