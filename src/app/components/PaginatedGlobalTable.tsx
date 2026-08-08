"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import TeamLink from "./TeamLink";
import styles from "../page.module.css";
import { normalizeStateProv } from "../lib/stateAbbreviations";

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

interface PaginatedGlobalTableProps {
  stats: GlobalStat[];
  year: string;
}

type SortField = "rank" | "teamKey" | "bestFSM" | "auto" | "fuel" | "climb" | "coral" | "algae";
type MetricKey = "bestFSM" | "auto" | "fuel" | "climb" | "coral" | "algae";

function safeMax(arr: number[], fallback = 0): number {
  if (arr.length === 0) return fallback;
  let max = arr[0];
  for (let i = 1; i < arr.length; i++) { if (arr[i] > max) max = arr[i]; }
  return max;
}

function safeMin(arr: number[], fallback = 0): number {
  if (arr.length === 0) return fallback;
  let min = arr[0];
  for (let i = 1; i < arr.length; i++) { if (arr[i] < min) min = arr[i]; }
  return min;
}

function getMetricOptions(year: string): { key: MetricKey; label: string }[] {
  const yearNum = parseInt(year);
  if (yearNum <= 2024) {
    return [{ key: "bestFSM", label: "FSM Score" }];
  }
  if (yearNum >= 2026) {
    return [
      { key: "bestFSM", label: "FSM Score" },
      { key: "auto", label: "Auto" },
      { key: "fuel", label: "Fuel" },
      { key: "climb", label: "Climb" },
    ];
  }
  return [
    { key: "bestFSM", label: "FSM Score" },
    { key: "auto", label: "Auto" },
    { key: "coral", label: "Coral" },
    { key: "algae", label: "Algae" },
    { key: "climb", label: "Climb" },
  ];
}

function ScatterChart({
  stats,
  highlightedKeys,
  xAxis,
  yAxis,
  onXChange,
  onYChange,
  metricOptions,
}: {
  stats: GlobalStat[];
  highlightedKeys?: Set<string>;
  xAxis: MetricKey;
  yAxis: MetricKey;
  onXChange: (k: MetricKey) => void;
  onYChange: (k: MetricKey) => void;
  metricOptions: { key: MetricKey; label: string }[];
}) {
  const hasHighlight = highlightedKeys != null && highlightedKeys.size > 0;

  const { points, xMin, xMax, yMin, yMax } = useMemo(() => {
    const pts = stats
      .map((s) => ({
        teamKey: s.teamKey,
        x: parseFloat(s[xAxis]) || 0,
        y: parseFloat(s[yAxis]) || 0,
        fsm: parseFloat(s.bestFSM) || 0,
        highlighted: hasHighlight ? highlightedKeys!.has(s.teamKey) : false,
      }))
      .filter((p) => p.x > 0 || p.y > 0);

    if (pts.length === 0) return { points: [], xMin: 0, xMax: 1, yMin: 0, yMax: 1 };

    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    return {
      points: pts,
      xMin: safeMin(xs),
      xMax: safeMax(xs, 1),
      yMin: safeMin(ys),
      yMax: safeMax(ys, 1),
    };
  }, [stats, xAxis, yAxis, hasHighlight, highlightedKeys]);

  const maxFsm = useMemo(() => safeMax(stats.map((s) => parseFloat(s.bestFSM) || 0), 1), [stats]);

  const [hoveredTeam, setHoveredTeam] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

  const W = 700;
  const H = 400;
  const PAD = { top: 40, right: 30, bottom: 45, left: 55 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const xRange = xMax - xMin || 1;
  const yRange = yMax - yMin || 1;
  const toSvgX = (v: number) => PAD.left + ((v - xMin) / xRange) * plotW;
  const toSvgY = (v: number) => PAD.top + plotH - ((v - yMin) / yRange) * plotH;

  const xLabel = metricOptions.find((o) => o.key === xAxis)?.label ?? xAxis;
  const yLabel = metricOptions.find((o) => o.key === yAxis)?.label ?? yAxis;

  const xTicks = useMemo(() => {
    const count = 6;
    return Array.from({ length: count }, (_, i) => xMin + (xRange * i) / (count - 1));
  }, [xMin, xRange]);

  const yTicks = useMemo(() => {
    const count = 5;
    return Array.from({ length: count }, (_, i) => yMin + (yRange * i) / (count - 1));
  }, [yMin, yRange]);

  return (
    <div
      style={{
        background: "var(--background-pred)",
        border: "2px solid var(--border-color)",
        borderRadius: 12,
        padding: "1.25rem",
        marginBottom: "1.5rem",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "1rem",
          justifyContent: "center",
          alignItems: "center",
          marginBottom: "1rem",
        }}
      >
        <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
          <label style={{ fontWeight: "600", fontSize: "0.85rem", color: "var(--foreground)" }}>X:</label>
          <select
            value={xAxis}
            onChange={(e) => onXChange(e.target.value as MetricKey)}
            style={{
              padding: "0.35rem 0.6rem",
              borderRadius: 6,
              border: "2px solid var(--border-color)",
              background: "var(--input-bg)",
              color: "var(--input-text)",
              fontSize: "0.85rem",
              fontWeight: "600",
            }}
          >
            {metricOptions.map((o) => (
              <option key={o.key} value={o.key}>{o.label}</option>
            ))}
          </select>
        </div>
        <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
          <label style={{ fontWeight: "600", fontSize: "0.85rem", color: "var(--foreground)" }}>Y:</label>
          <select
            value={yAxis}
            onChange={(e) => onYChange(e.target.value as MetricKey)}
            style={{
              padding: "0.35rem 0.6rem",
              borderRadius: 6,
              border: "2px solid var(--border-color)",
              background: "var(--input-bg)",
              color: "var(--input-text)",
              fontSize: "0.85rem",
              fontWeight: "600",
            }}
          >
            {metricOptions.map((o) => (
              <option key={o.key} value={o.key}>{o.label}</option>
            ))}
          </select>
        </div>
        <span style={{ fontSize: "0.75rem", color: "var(--gray-less)" }}>
          Color = FSM percentile &middot; {points.length} teams
          {hasHighlight && ` · ${points.filter((p) => p.highlighted).length} highlighted`}
        </span>
      </div>

      <div style={{ overflowX: "auto" }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: "100%", maxWidth: W, display: "block", margin: "0 auto", overflow: "visible" }}
        >
          {yTicks.map((t) => (
            <line key={`yg${t}`} x1={PAD.left} x2={W - PAD.right} y1={toSvgY(t)} y2={toSvgY(t)} stroke="var(--border-color)" strokeWidth={0.5} />
          ))}
          {xTicks.map((t) => (
            <line key={`xg${t}`} y1={PAD.top} y2={H - PAD.bottom} x1={toSvgX(t)} x2={toSvgX(t)} stroke="var(--border-color)" strokeWidth={0.5} />
          ))}
          <line x1={PAD.left} x2={W - PAD.right} y1={H - PAD.bottom} y2={H - PAD.bottom} stroke="var(--foreground)" strokeWidth={1} opacity={0.3} />
          <line x1={PAD.left} x2={PAD.left} y1={PAD.top} y2={H - PAD.bottom} stroke="var(--foreground)" strokeWidth={1} opacity={0.3} />
          {xTicks.map((t) => (
            <text key={`xl${t}`} x={toSvgX(t)} y={H - PAD.bottom + 16} textAnchor="middle" fontSize={10} fill="var(--gray-less)">{t.toFixed(0)}</text>
          ))}
          {yTicks.map((t) => (
            <text key={`yl${t}`} x={PAD.left - 8} y={toSvgY(t) + 4} textAnchor="end" fontSize={10} fill="var(--gray-less)">{t.toFixed(0)}</text>
          ))}
          <text x={PAD.left + plotW / 2} y={H - 4} textAnchor="middle" fontSize={12} fontWeight={600} fill="var(--foreground)">{xLabel}</text>
          <text x={14} y={PAD.top + plotH / 2} textAnchor="middle" fontSize={12} fontWeight={600} fill="var(--foreground)" transform={`rotate(-90, 14, ${PAD.top + plotH / 2})`}>{yLabel}</text>
          {points.filter((p) => !p.highlighted).map((p) => {
            const pctile = (p.fsm / maxFsm) * 100;
            const color = getPercentileColor(pctile);
            const isHovered = hoveredTeam === p.teamKey;
            return (
              <circle
                key={p.teamKey}
                cx={toSvgX(p.x)}
                cy={toSvgY(p.y)}
                r={isHovered ? 5 : 3}
                fill={color}
                opacity={hasHighlight ? (isHovered ? 0.8 : 0.15) : (isHovered ? 1 : 0.6)}
                stroke={isHovered ? "var(--foreground)" : "none"}
                strokeWidth={1.5}
                style={{ cursor: "pointer", transition: "r 0.15s, opacity 0.15s" }}
                onMouseEnter={(e) => {
                  setHoveredTeam(p.teamKey);
                  const rect = (e.target as SVGCircleElement).ownerSVGElement?.getBoundingClientRect();
                  if (rect) {
                    setTooltip({
                      x: e.clientX - rect.left,
                      y: e.clientY - rect.top - 10,
                      text: `${p.teamKey.replace("frc", "")} | ${xLabel}: ${p.x.toFixed(1)} | ${yLabel}: ${p.y.toFixed(1)} | FSM: ${p.fsm.toFixed(1)}`,
                    });
                  }
                }}
                onMouseLeave={() => { setHoveredTeam(null); setTooltip(null); }}
              />
            );
          })}
          {points.filter((p) => p.highlighted).map((p) => {
            const pctile = (p.fsm / maxFsm) * 100;
            const color = getPercentileColor(pctile);
            const isHovered = hoveredTeam === p.teamKey;
            const cx = toSvgX(p.x);
            const cy = toSvgY(p.y);
            return (
              <g key={p.teamKey}>
                <circle
                  cx={cx}
                  cy={cy}
                  r={isHovered ? 7 : 5}
                  fill={color}
                  opacity={1}
                  stroke="var(--yellow-color)"
                  strokeWidth={2}
                  style={{ cursor: "pointer", transition: "r 0.15s" }}
                  onMouseEnter={(e) => {
                    setHoveredTeam(p.teamKey);
                    const rect = (e.target as SVGCircleElement).ownerSVGElement?.getBoundingClientRect();
                    if (rect) {
                      setTooltip({
                        x: e.clientX - rect.left,
                        y: e.clientY - rect.top - 10,
                        text: `${p.teamKey.replace("frc", "")} | ${xLabel}: ${p.x.toFixed(1)} | ${yLabel}: ${p.y.toFixed(1)} | FSM: ${p.fsm.toFixed(1)}`,
                      });
                    }
                  }}
                  onMouseLeave={() => { setHoveredTeam(null); setTooltip(null); }}
                />
                <text
                  x={cx}
                  y={cy - 9}
                  textAnchor="middle"
                  fontSize={9}
                  fontWeight={700}
                  fill="var(--yellow-color)"
                  style={{ pointerEvents: "none" }}
                >
                  {p.teamKey.replace("frc", "")}
                </text>
              </g>
            );
          })}
          {tooltip && (
            <g>
              <rect x={tooltip.x - 120} y={tooltip.y - 22} width={240} height={20} rx={4} fill="var(--gray-more)" stroke="var(--border-color)" strokeWidth={1} opacity={0.95} />
              <text x={tooltip.x} y={tooltip.y - 8} textAnchor="middle" fontSize={10} fontWeight={600} fill="var(--foreground)">{tooltip.text}</text>
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}

function getPercentileColor(percentile: number): string {
  if (percentile >= 99) return "#10b981";
  if (percentile >= 90) return "#22c55e";
  if (percentile >= 75) return "#84cc16";
  if (percentile >= 50) return "#eab308";
  if (percentile >= 25) return "#f97316";
  return "#ef4444";
}

function getPercentileLabel(percentile: number): string {
  if (percentile >= 99) return "Elite";
  if (percentile >= 90) return "Top 10%";
  if (percentile >= 75) return "Top 25%";
  if (percentile >= 50) return "Above Avg";
  if (percentile >= 25) return "Below Avg";
  return "Bottom 25%";
}

function DistributionChart({ stats }: { stats: GlobalStat[] }) {
  const { buckets, maxCount, bucketLabels } = useMemo(() => {
    const fsmValues = stats.map((s) => parseFloat(s.bestFSM)).filter(Number.isFinite);
    if (fsmValues.length === 0) return { buckets: [], maxCount: 0, bucketLabels: [] };

    const min = Math.floor(safeMin(fsmValues));
    const max = Math.ceil(safeMax(fsmValues));
    const range = max - min;
    const numBuckets = Math.min(20, Math.max(8, Math.ceil(range / 5)));
    const bucketSize = range / numBuckets;

    const bkts = new Array(numBuckets).fill(0);
    const labels: string[] = [];

    for (let i = 0; i < numBuckets; i++) {
      const lo = min + i * bucketSize;
      const hi = lo + bucketSize;
      labels.push(`${lo.toFixed(0)}-${hi.toFixed(0)}`);
    }

    for (const v of fsmValues) {
      const idx = Math.min(Math.floor((v - min) / bucketSize), numBuckets - 1);
      bkts[idx]++;
    }

    return { buckets: bkts, maxCount: safeMax(bkts), bucketLabels: labels };
  }, [stats]);

  if (buckets.length === 0) return null;

  return (
    <div
      style={{
        background: "var(--background-pred)",
        border: "2px solid var(--border-color)",
        borderRadius: 12,
        padding: "1.25rem",
        marginBottom: "1.5rem",
      }}
    >
      <h3
        style={{
          color: "var(--yellow-color)",
          fontSize: "1rem",
          fontWeight: "700",
          marginBottom: "1rem",
          textAlign: "center",
          letterSpacing: "0.03em",
        }}
      >
        FSM Score Distribution
      </h3>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: "2px",
          height: "120px",
          padding: "0 0.25rem",
        }}
      >
        {buckets.map((count, i) => {
          const heightPct = maxCount > 0 ? (count / maxCount) * 100 : 0;
          return (
            <div
              key={i}
              title={`${bucketLabels[i]}: ${count} teams`}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "2px",
                height: "100%",
                justifyContent: "flex-end",
              }}
            >
              <span
                style={{
                  fontSize: "0.55rem",
                  color: "var(--gray-less)",
                  fontWeight: "600",
                }}
              >
                {count > 0 ? count : ""}
              </span>
              <div
                style={{
                  width: "100%",
                  height: `${heightPct}%`,
                  minHeight: count > 0 ? "3px" : "0",
                  background: `linear-gradient(to top, var(--yellow-color), #fbbf24)`,
                  borderRadius: "3px 3px 0 0",
                  transition: "height 0.3s ease",
                  opacity: 0.85,
                }}
              />
            </div>
          );
        })}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: "0.35rem",
          padding: "0 0.25rem",
        }}
      >
        <span style={{ fontSize: "0.65rem", color: "var(--gray-less)", fontWeight: "600" }}>
          {bucketLabels[0]?.split("-")[0]}
        </span>
        <span style={{ fontSize: "0.65rem", color: "var(--gray-less)", fontWeight: "600" }}>
          FSM Score
        </span>
        <span style={{ fontSize: "0.65rem", color: "var(--gray-less)", fontWeight: "600" }}>
          {bucketLabels[bucketLabels.length - 1]?.split("-")[1]}
        </span>
      </div>
    </div>
  );
}

export default function PaginatedGlobalTable({
  stats,
  year,
}: PaginatedGlobalTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [sortField, setSortField] = useState<SortField>("rank");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [stateFilter, setStateFilter] = useState<string>("all");
  const [districtFilter, setDistrictFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [jumpToPage, setJumpToPage] = useState("");
  const [showDistribution, setShowDistribution] = useState(true);
  const [activeTab, setActiveTab] = useState<"table" | "chart" | "insights">("table");
  const yearNum = parseInt(year);
  const isLegacyYear = yearNum <= 2024;
  const is2026 = yearNum >= 2026;
  const metricOptions = useMemo(() => getMetricOptions(year), [year]);
  const [scatterX, setScatterX] = useState<MetricKey>("auto");
  const [scatterY, setScatterY] = useState<MetricKey>("bestFSM");

  useEffect(() => {
    if (isLegacyYear) {
      setScatterX("bestFSM");
      setScatterY("bestFSM");
    } else {
      setScatterX("auto");
      setScatterY("bestFSM");
    }
  }, [year, isLegacyYear]);

  const maxFsm = useMemo(() => {
    const values = stats
      .map((s) => parseFloat(s.bestFSM))
      .filter(Number.isFinite);
    return values.length > 0 ? Math.max(...values) : 0;
  }, [stats]);

  const percentileMap = useMemo(() => {
    const map = new Map<string, number>();
    const sorted = [...stats].sort(
      (a, b) => parseFloat(b.bestFSM) - parseFloat(a.bestFSM)
    );
    const total = sorted.length;
    sorted.forEach((s, i) => {
      map.set(s.teamKey, ((total - i) / total) * 100);
    });
    return map;
  }, [stats]);

  const countries = useMemo(() => {
    const uniqueCountries = new Set(
      stats.map((s) => s.country).filter((c) => c)
    );
    return ["all", ...Array.from(uniqueCountries).sort()];
  }, [stats]);

  const states = useMemo(() => {
    const uniqueStates = new Set(
      stats
        .filter((s) => s.state_prov)
        .map((s) => normalizeStateProv(s.state_prov))
    );
    return ["all", ...Array.from(uniqueStates).sort()];
  }, [stats]);

  const districts = useMemo(() => {
    const uniqueDistricts = new Set(
      stats.filter((s) => s.district).map((s) => s.district)
    );
    return ["all", "Regional", ...Array.from(uniqueDistricts).sort()];
  }, [stats]);

  const filteredStats = useMemo(() => {
    let filtered = [...stats];

    if (countryFilter !== "all") {
      filtered = filtered.filter((s) => s.country === countryFilter);
    }

    if (stateFilter !== "all") {
      filtered = filtered.filter(
        (s) => normalizeStateProv(s.state_prov) === stateFilter
      );
    }

    if (districtFilter !== "all") {
      if (districtFilter === "Regional") {
        filtered = filtered.filter((s) => !s.district);
      } else {
        filtered = filtered.filter((s) => s.district === districtFilter);
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((s) => {
        const teamNum = s.teamKey.replace("frc", "");
        return (
          teamNum.includes(q) ||
          s.teamKey.toLowerCase().includes(q) ||
          s.country.toLowerCase().includes(q) ||
          normalizeStateProv(s.state_prov).toLowerCase().includes(q) ||
          s.district.toLowerCase().includes(q)
        );
      });
    }

    return filtered;
  }, [stats, countryFilter, stateFilter, districtFilter, searchQuery]);

  const hasActiveScatterFilter = countryFilter !== "all" || stateFilter !== "all" || districtFilter !== "all" || searchQuery.trim() !== "";
  const highlightedKeys = useMemo(() => {
    if (!hasActiveScatterFilter) return undefined;
    return new Set(filteredStats.map((s) => s.teamKey));
  }, [filteredStats, hasActiveScatterFilter]);

  const sortedStats = useMemo(() => {
    const sorted = [...filteredStats];

    if (sortField === "rank") {
      return sorted;
    }

    sorted.sort((a, b) => {
      let aValue: number;
      let bValue: number;

      switch (sortField) {
        case "teamKey":
          aValue = parseInt(a.teamKey.replace("frc", "")) || 0;
          bValue = parseInt(b.teamKey.replace("frc", "")) || 0;
          break;
        case "bestFSM":
          aValue = parseFloat(a.bestFSM);
          bValue = parseFloat(b.bestFSM);
          break;
        case "auto":
          aValue = parseFloat(a.auto);
          bValue = parseFloat(b.auto);
          break;
        case "fuel":
          aValue = parseFloat(a.fuel);
          bValue = parseFloat(b.fuel);
          break;
        case "climb":
          aValue = parseFloat(a.climb);
          bValue = parseFloat(b.climb);
          break;
        case "coral":
          aValue = parseFloat(a.coral);
          bValue = parseFloat(b.coral);
          break;
        case "algae":
          aValue = parseFloat(a.algae);
          bValue = parseFloat(b.algae);
          break;
        default:
          return 0;
      }

      return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
    });

    return sorted;
  }, [filteredStats, sortField, sortDirection]);

  const totalPages = Math.ceil(sortedStats.length / pageSize);

  const paginatedStats = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return sortedStats.slice(startIndex, endIndex);
  }, [sortedStats, currentPage, pageSize]);

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection(field === "rank" ? "asc" : "desc");
    }
    setCurrentPage(1);
  };

  const handleCountryChange = (country: string) => {
    setCountryFilter(country);
    setCurrentPage(1);
  };

  const handleStateChange = (state: string) => {
    setStateFilter(state);
    setCurrentPage(1);
  };

  const handleDistrictChange = (district: string) => {
    setDistrictFilter(district);
    setCurrentPage(1);
  };

  const handleJumpToPage = useCallback(() => {
    const page = parseInt(jumpToPage);
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    setJumpToPage("");
  }, [jumpToPage, totalPages]);

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return " \u2195";
    return sortDirection === "asc" ? " \u2191" : " \u2193";
  };

  const startRank =
    sortField === "rank" ? (currentPage - 1) * pageSize + 1 : null;

  const getSortFieldLabel = () => {
    switch (sortField) {
      case "rank":
        return "FSM Rank";
      case "teamKey":
        return "Team Number";
      case "bestFSM":
        return "FSM Score";
      case "auto":
        return "Auto";
      case "fuel":
        return "Fuel";
      case "climb":
        return "Climb";
      case "coral":
        return "Coral";
      case "algae":
        return "Algae";
      default:
        return sortField;
    }
  };

  const hasActiveFilters =
    countryFilter !== "all" || stateFilter !== "all" || districtFilter !== "all" || searchQuery.trim() !== "";

  return (
    <div>

      <div className={styles.tabBar} role="tablist" aria-label="Global rankings view">
        {(
          [
            { key: "insights", label: "Insights" },
            { key: "chart", label: "Scatter Chart" },
            { key: "table", label: "Table" },
          ] as const
        ).map(({ key, label }) => {
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(key)}
              className={`${styles.tabBarLink}${isActive ? ` ${styles.tabBarLinkActive}` : ""}`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {activeTab === "insights" && (
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ marginBottom: "0.75rem", textAlign: "center" }}>
            <button
              onClick={() => setShowDistribution(!showDistribution)}
              style={{
                padding: "0.4rem 1rem",
                borderRadius: 8,
                border: "2px solid var(--border-color)",
                background: showDistribution ? "var(--yellow-color)" : "var(--background-pred)",
                color: showDistribution ? "#000" : "var(--foreground)",
                fontWeight: "600",
                fontSize: "0.85rem",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              {showDistribution ? "Hide Distribution" : "Show Distribution"}
            </button>
          </div>
          {showDistribution && <DistributionChart stats={filteredStats} />}
        </div>
      )}

      {activeTab === "chart" && (
        <ScatterChart
          stats={stats}
          highlightedKeys={highlightedKeys}
          xAxis={scatterX}
          yAxis={scatterY}
          onXChange={setScatterX}
          onYChange={setScatterY}
          metricOptions={metricOptions}
        />
      )}

      <div
        style={{
          background: "var(--background-pred)",
          border: "2px solid var(--border-color)",
          borderRadius: 8,
          padding: "1rem 1.5rem",
          marginBottom: "1.5rem",
          display: "flex",
          flexWrap: "wrap",
          gap: "1rem",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <input
            type="text"
            placeholder="Search team # or location..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              padding: "0.5rem 0.75rem",
              borderRadius: 8,
              border: "2px solid var(--border-color)",
              background: "var(--input-bg)",
              color: "var(--input-text)",
              fontSize: "0.9rem",
              fontWeight: "500",
              outline: "none",
              width: "200px",
              transition: "border-color 0.2s",
            }}
          />
        </div>

        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <label
            style={{
              fontWeight: "600",
              color: "var(--foreground)",
              fontSize: "0.9rem",
            }}
          >
            Country:
          </label>
          <select
            value={countryFilter}
            onChange={(e) => handleCountryChange(e.target.value)}
            style={{
              padding: "0.5rem 2rem 0.5rem 0.75rem",
              borderRadius: 8,
              border: "2px solid var(--border-color)",
              background: "var(--background-pred)",
              color: "var(--foreground)",
              fontSize: "0.9rem",
              fontWeight: "600",
              cursor: "pointer",
              outline: "none",
            }}
          >
            <option value="all">All Countries</option>
            {countries.slice(1).map((country) => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <label
            style={{
              fontWeight: "600",
              color: "var(--foreground)",
              fontSize: "0.9rem",
            }}
          >
            State/Prov:
          </label>
          <select
            value={stateFilter}
            onChange={(e) => handleStateChange(e.target.value)}
            style={{
              padding: "0.5rem 2rem 0.5rem 0.75rem",
              borderRadius: 8,
              border: "2px solid var(--border-color)",
              background: "var(--background-pred)",
              color: "var(--foreground)",
              fontSize: "0.9rem",
              fontWeight: "600",
              cursor: "pointer",
              outline: "none",
            }}
          >
            <option value="all">All States/Provinces</option>
            {states.slice(1).map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <label
            style={{
              fontWeight: "600",
              color: "var(--foreground)",
              fontSize: "0.9rem",
            }}
          >
            District:
          </label>
          <select
            value={districtFilter}
            onChange={(e) => handleDistrictChange(e.target.value)}
            style={{
              padding: "0.5rem 2rem 0.5rem 0.75rem",
              borderRadius: 8,
              border: "2px solid var(--border-color)",
              background: "var(--background-pred)",
              color: "var(--foreground)",
              fontSize: "0.9rem",
              fontWeight: "600",
              cursor: "pointer",
              outline: "none",
            }}
          >
            <option value="all">All Districts</option>
            {districts.slice(1).map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        {hasActiveFilters && (
          <button
            onClick={() => {
              setCountryFilter("all");
              setStateFilter("all");
              setDistrictFilter("all");
              setSearchQuery("");
              setCurrentPage(1);
            }}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: 8,
              border: "2px solid var(--border-color)",
              background: "var(--background-pred)",
              color: "var(--foreground)",
              fontSize: "0.85rem",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            Clear Filters
          </button>
        )}

        {hasActiveFilters && (
          <div
            style={{
              fontSize: "0.85rem",
              color: "var(--gray-less)",
              fontWeight: "600",
            }}
          >
            Showing {sortedStats.length} of {stats.length} teams
          </div>
        )}
      </div>

      {sortField !== "rank" && (
        <div
          style={{
            background: "var(--background-pred)",
            border: "2px solid var(--border-color)",
            borderRadius: 8,
            padding: "0.75rem 1rem",
            marginBottom: "1rem",
            textAlign: "center",
            fontSize: "0.9rem",
            fontWeight: "600",
            color: "var(--foreground)",
          }}
        >
          Sorted by{" "}
          <span style={{ color: "var(--yellow-color)" }}>
            {getSortFieldLabel()}
          </span>{" "}
          ({sortDirection === "asc" ? "Ascending" : "Descending"})
        </div>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
          flexWrap: "wrap",
          gap: "1rem",
          padding: "0 0.5rem",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontWeight: "600", color: "var(--foreground)" }}>
            Teams per page:
          </span>
          {[20, 50, 100].map((size) => (
            <button
              key={size}
              onClick={() => handlePageSizeChange(size)}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: 8,
                border:
                  pageSize === size
                    ? "2px solid var(--yellow-color)"
                    : "2px solid var(--border-color)",
                background:
                  pageSize === size
                    ? "var(--yellow-color)"
                    : "var(--background-pred)",
                color: pageSize === size ? "#000" : "var(--foreground)",
                cursor: "pointer",
                fontWeight: pageSize === size ? "bold" : "normal",
                transition: "all 0.2s",
                boxShadow:
                  pageSize === size
                    ? "0 4px 12px rgba(253, 224, 71, 0.3)"
                    : "0 2px 4px rgba(0, 0, 0, 0.1)",
              }}
            >
              {size}
            </button>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={handlePrevPage}
            disabled={currentPage === 1}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: 8,
              border: "2px solid var(--border-color)",
              background:
                currentPage === 1
                  ? "var(--gray-more)"
                  : "var(--background-pred)",
              color: "var(--foreground)",
              cursor: currentPage === 1 ? "not-allowed" : "pointer",
              opacity: currentPage === 1 ? 0.5 : 1,
              fontWeight: "600",
              transition: "all 0.2s",
            }}
          >
            ← Prev
          </button>
          <span
            style={{
              fontWeight: "600",
              color: "var(--foreground)",
              padding: "0 0.25rem",
            }}
          >
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: 8,
              border: "2px solid var(--border-color)",
              background:
                currentPage === totalPages
                  ? "var(--gray-more)"
                  : "var(--background-pred)",
              color: "var(--foreground)",
              cursor: currentPage === totalPages ? "not-allowed" : "pointer",
              opacity: currentPage === totalPages ? 0.5 : 1,
              fontWeight: "600",
              transition: "all 0.2s",
            }}
          >
            Next →
          </button>
          <div style={{ display: "flex", gap: "0.3rem", alignItems: "center" }}>
            <input
              type="number"
              min={1}
              max={totalPages}
              placeholder="#"
              value={jumpToPage}
              onChange={(e) => setJumpToPage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleJumpToPage()}
              style={{
                width: "55px",
                padding: "0.45rem 0.4rem",
                borderRadius: 6,
                border: "2px solid var(--border-color)",
                background: "var(--input-bg)",
                color: "var(--input-text)",
                fontSize: "0.85rem",
                fontWeight: "600",
                textAlign: "center",
                outline: "none",
              }}
            />
            <button
              onClick={handleJumpToPage}
              style={{
                padding: "0.45rem 0.6rem",
                borderRadius: 6,
                border: "2px solid var(--border-color)",
                background: "var(--background-pred)",
                color: "var(--foreground)",
                cursor: "pointer",
                fontWeight: "600",
                fontSize: "0.8rem",
                transition: "all 0.2s",
              }}
            >
              Go
            </button>
          </div>
        </div>
      </div>

      <div className={styles.tableWrapper}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            minWidth: "900px",
          }}
        >
          <thead>
            <tr style={{ background: "var(--gray-more)" }}>
              <th
                onClick={() => handleSort("rank")}
                style={{
                  textAlign: "left",
                  borderBottom: "2px solid var(--border-color)",
                  padding: "12px 8px",
                  cursor: "pointer",
                  fontWeight: "700",
                  color: "var(--yellow-color)",
                  userSelect: "none",
                }}
              >
                FSM Rank{getSortIcon("rank")}
              </th>
              <th
                onClick={() => handleSort("teamKey")}
                style={{
                  textAlign: "left",
                  borderBottom: "2px solid var(--border-color)",
                  padding: "12px 8px",
                  cursor: "pointer",
                  fontWeight: "700",
                  color: "var(--yellow-color)",
                  userSelect: "none",
                }}
              >
                Team{getSortIcon("teamKey")}
              </th>
              <th
                onClick={() => handleSort("bestFSM")}
                style={{
                  textAlign: "left",
                  borderBottom: "2px solid var(--border-color)",
                  padding: "12px 8px",
                  cursor: "pointer",
                  fontWeight: "700",
                  color: "var(--yellow-color)",
                  userSelect: "none",
                }}
              >
                FSM{getSortIcon("bestFSM")}
              </th>
              {metricOptions.filter(o => o.key !== "bestFSM").map(o => (
              <th
                key={o.key}
                onClick={() => handleSort(o.key)}
                style={{
                  textAlign: "right",
                  borderBottom: "2px solid var(--border-color)",
                  padding: "12px 8px",
                  cursor: "pointer",
                  fontWeight: "700",
                  color: "var(--yellow-color)",
                  userSelect: "none",
                }}
              >
                {o.label}{getSortIcon(o.key)}
              </th>
              ))}
              <th
                style={{
                  textAlign: "center",
                  borderBottom: "2px solid var(--border-color)",
                  padding: "12px 8px",
                  fontWeight: "700",
                  color: "var(--yellow-color)",
                }}
              >
                Percentile
              </th>
              <th
                style={{
                  textAlign: "left",
                  borderBottom: "2px solid var(--border-color)",
                  padding: "12px 8px",
                  fontWeight: "700",
                  color: "var(--yellow-color)",
                }}
              >
                Country
              </th>
              <th
                style={{
                  textAlign: "left",
                  borderBottom: "2px solid var(--border-color)",
                  padding: "12px 8px",
                  fontWeight: "700",
                  color: "var(--yellow-color)",
                }}
              >
                State/Prov
              </th>
              <th
                style={{
                  textAlign: "left",
                  borderBottom: "2px solid var(--border-color)",
                  padding: "12px 8px",
                  fontWeight: "700",
                  color: "var(--yellow-color)",
                }}
              >
                District
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedStats.map((stat, index) => {
              const originalIndex = stats.findIndex(
                (s) => s.teamKey === stat.teamKey
              );
              const rank =
                startRank !== null ? startRank + index : originalIndex + 1;
              const percentile = percentileMap.get(stat.teamKey) ?? 0;
              const pColor = getPercentileColor(percentile);
              const pLabel = getPercentileLabel(percentile);

              const fsmVal = parseFloat(stat.bestFSM);
              const barWidth =
                maxFsm > 0
                  ? Math.max(0, Math.min(100, (fsmVal / maxFsm) * 100))
                  : 0;

              return (
                <tr
                  key={stat.teamKey}
                  style={{
                    borderBottom: "1px solid var(--border-color)",
                    transition: "background 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--hover-bg)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <td style={{ padding: "12px 8px", fontWeight: "600" }}>{rank}</td>
                  <td style={{ padding: "12px 8px", fontWeight: "600" }}>
                    <TeamLink teamKey={stat.teamKey} year={year} />
                  </td>
                  <td style={{ padding: "12px 8px", position: "relative" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span
                        style={{
                          fontWeight: "bold",
                          color: "var(--yellow-color)",
                          minWidth: "50px",
                        }}
                      >
                        {stat.bestFSM}
                      </span>
                      <div
                        style={{
                          flex: 1,
                          height: "6px",
                          background: "var(--gray-more)",
                          borderRadius: 3,
                          overflow: "hidden",
                          minWidth: "60px",
                          maxWidth: "120px",
                        }}
                      >
                        <div
                          style={{
                            width: `${barWidth}%`,
                            height: "100%",
                            background: pColor,
                            borderRadius: 3,
                            transition: "width 0.3s ease",
                          }}
                        />
                      </div>
                    </div>
                  </td>
                  {metricOptions.filter(o => o.key !== "bestFSM").map(o => (
                  <td key={o.key} style={{ padding: "12px 8px", textAlign: "right", fontWeight: "600", color: "var(--foreground)" }}>
                    {parseFloat(stat[o.key]) > 0 ? stat[o.key] : "-"}
                  </td>
                  ))}
                  <td style={{ padding: "12px 8px", textAlign: "center" }}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "0.2rem 0.5rem",
                        borderRadius: 999,
                        fontSize: "0.7rem",
                        fontWeight: "700",
                        background: `${pColor}18`,
                        color: pColor,
                        border: `1px solid ${pColor}40`,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {pLabel}
                    </span>
                  </td>
                  <td style={{ padding: "12px 8px" }}>{stat.country || "-"}</td>
                  <td style={{ padding: "12px 8px" }}>
                    {normalizeStateProv(stat.state_prov) || "-"}
                  </td>
                  <td style={{ padding: "12px 8px" }}>
                    {stat.district || "Regional"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          marginTop: "1.5rem",
          gap: "0.5rem",
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={handlePrevPage}
          disabled={currentPage === 1}
          style={{
            padding: "0.5rem 1rem",
            borderRadius: 8,
            border: "2px solid var(--border-color)",
            background:
              currentPage === 1 ? "var(--gray-more)" : "var(--background-pred)",
            color: "var(--foreground)",
            cursor: currentPage === 1 ? "not-allowed" : "pointer",
            opacity: currentPage === 1 ? 0.5 : 1,
            fontWeight: "600",
            transition: "all 0.2s",
          }}
        >
          ← Previous
        </button>
        <span
          style={{
            fontWeight: "600",
            color: "var(--foreground)",
            padding: "0 0.5rem",
          }}
        >
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={handleNextPage}
          disabled={currentPage === totalPages}
          style={{
            padding: "0.5rem 1rem",
            borderRadius: 8,
            border: "2px solid var(--border-color)",
            background:
              currentPage === totalPages
                ? "var(--gray-more)"
                : "var(--background-pred)",
            color: "var(--foreground)",
            cursor: currentPage === totalPages ? "not-allowed" : "pointer",
            opacity: currentPage === totalPages ? 0.5 : 1,
            fontWeight: "600",
            transition: "all 0.2s",
          }}
        >
          Next →
        </button>
      </div>
    </div>
  );
}
