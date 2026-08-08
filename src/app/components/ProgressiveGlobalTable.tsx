"use client";

import { useState, useEffect } from "react";
import PaginatedGlobalTable from "./PaginatedGlobalTable";

interface GlobalStat {
  teamKey: string;
  bestFSM: string;
  auto: string;
  fuel: string;
  climb: string;
  coral: string;
  algae: string;
  country: string;
  state_prov: string;
  district: string;
}

interface ProgressiveGlobalTableProps {
  initialStats: Array<{
    teamKey: string;
    bestFSM: string;
    auto: string;
    fuel: string;
    climb: string;
    coral: string;
    algae: string;
  }>;
  year: string;
}

export default function ProgressiveGlobalTable({
  initialStats,
  year,
}: ProgressiveGlobalTableProps) {
  const [stats, setStats] = useState<GlobalStat[]>(() =>
    initialStats.map((stat) => ({
      ...stat,
      country: "",
      state_prov: "",
      district: "",
    }))
  );
  const [isLoadingLocations, setIsLoadingLocations] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadLocations() {
      try {
        const cacheKey = `team-locations-${year}`;
        let locationMap: Record<
          string,
          { country: string; state_prov: string }
        > = {};
        let districtMap: Record<string, string> = {};

        try {
          const cached = sessionStorage.getItem(cacheKey);
          if (cached) {
            locationMap = JSON.parse(cached);
          }
        } catch {
          /* ignore */
        }

        const districtResponse = await fetch(`/api/districts?year=${year}`);
        if (districtResponse.ok) {
          const { districts } = await districtResponse.json();
          districtMap = districts || {};
        }

        const missingKeys = initialStats
          .filter((s) => !locationMap[s.teamKey]?.country)
          .map((s) => s.teamKey);

        if (missingKeys.length > 0) {
          const locationsResponse = await fetch("/api/team-locations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ teamKeys: missingKeys }),
          });

          if (locationsResponse.ok) {
            const { locations } = await locationsResponse.json();
            for (const key of missingKeys) {
              if (locations[key]?.country) {
                locationMap[key] = locations[key];
              }
            }
            try {
              sessionStorage.setItem(cacheKey, JSON.stringify(locationMap));
            } catch {
              /* ignore */
            }
          }
        }

        if (mounted) {
          setStats(
            initialStats.map((stat) => ({
              ...stat,
              country: locationMap[stat.teamKey]?.country || "",
              state_prov: locationMap[stat.teamKey]?.state_prov || "",
              district: districtMap[stat.teamKey] || "",
            }))
          );
          setIsLoadingLocations(false);
        }
      } catch (error) {
        console.error("Error loading locations:", error);
        if (mounted) {
          setIsLoadingLocations(false);
        }
      }
    }

    loadLocations();

    return () => {
      mounted = false;
    };
  }, [initialStats, year]);

  return (
    <div>
      {isLoadingLocations && (
        <div
          style={{
            background: "var(--background-pred)",
            border: "2px solid var(--yellow-color)",
            borderRadius: 8,
            padding: "0.75rem 1rem",
            marginBottom: "1rem",
            textAlign: "center",
            fontSize: "0.9rem",
            fontWeight: "600",
            color: "var(--foreground)",
          }}
        >
          Loading team locations & districts...
        </div>
      )}
      <PaginatedGlobalTable stats={stats} year={year} />
    </div>
  );
}
