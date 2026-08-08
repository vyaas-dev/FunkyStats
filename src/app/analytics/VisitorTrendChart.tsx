"use client";

import { useMemo, useState } from "react";
import type { DayVisitorStat } from "@/app/lib/analytics/store";

type VisitorTrendChartProps = {
  data: DayVisitorStat[];
};

const CHART_COLOR = "#eab308";
const GRID_COLOR = "rgba(148, 163, 184, 0.2)";
const AXIS_COLOR = "rgba(148, 163, 184, 0.85)";

export default function VisitorTrendChart({ data }: VisitorTrendChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const width = 900;
  const height = 260;
  const pad = { top: 16, right: 16, bottom: 36, left: 44 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const maxVisitors = useMemo(
    () => Math.max(1, ...data.map((d) => d.visitors)),
    [data]
  );

  const points = useMemo(() => {
    if (data.length === 0) return [];
    const step = data.length > 1 ? plotW / (data.length - 1) : 0;
    return data.map((d, i) => ({
      ...d,
      x: pad.left + i * step,
      y: pad.top + plotH - (d.visitors / maxVisitors) * plotH,
      barW: Math.max(4, plotW / data.length - 2),
    }));
  }, [data, maxVisitors, plotH, plotW, pad.left, pad.top]);

  const linePath = useMemo(() => {
    if (points.length === 0) return "";
    if (points.length === 1) {
      return `M ${points[0].x},${points[0].y}`;
    }
    return points
      .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x},${p.y}`)
      .join(" ");
  }, [points]);

  const areaPath = useMemo(() => {
    if (points.length < 2 || !linePath) return "";
    const baseline = pad.top + plotH;
    const last = points[points.length - 1];
    const first = points[0];
    return `${linePath} L ${last.x},${baseline} L ${first.x},${baseline} Z`;
  }, [linePath, pad.top, plotH, points]);

  const yTicks = useMemo(() => {
    const steps = 4;
    return Array.from({ length: steps + 1 }, (_, i) => {
      const value = Math.round((maxVisitors * (steps - i)) / steps);
      const y = pad.top + (plotH * i) / steps;
      return { value, y };
    });
  }, [maxVisitors, pad.top, plotH]);

  const xLabelIndices = useMemo(() => {
    if (data.length <= 7) return data.map((_, i) => i);
    const indices = [0];
    const mid = Math.floor(data.length / 2);
    indices.push(mid, data.length - 1);
    return indices;
  }, [data.length]);

  const hovered = hoveredIndex != null ? points[hoveredIndex] : null;

  if (data.length === 0) {
    return (
      <p style={{ textAlign: "center", color: "var(--gray-less)", margin: 0 }}>
        No visitor data yet
      </p>
    );
  }

  return (
    <div style={{ width: "100%", overflowX: "auto" }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        style={{ display: "block", minWidth: 320 }}
        role="img"
        aria-label="Unique visitors over the last 30 days"
      >
        {yTicks.map((tick) => (
          <g key={tick.y}>
            <line
              x1={pad.left}
              y1={tick.y}
              x2={width - pad.right}
              y2={tick.y}
              stroke={GRID_COLOR}
              strokeWidth={1}
            />
            <text
              x={pad.left - 8}
              y={tick.y + 4}
              textAnchor="end"
              fill={AXIS_COLOR}
              fontSize={11}
            >
              {tick.value}
            </text>
          </g>
        ))}

        {areaPath && (
          <path d={areaPath} fill={CHART_COLOR} fillOpacity={0.15} />
        )}
        {linePath && (
          <path
            d={linePath}
            fill="none"
            stroke={CHART_COLOR}
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {points.map((p, i) => (
          <g key={p.date}>
            <rect
              x={p.x - p.barW / 2}
              y={pad.top}
              width={p.barW}
              height={plotH}
              fill="transparent"
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            />
            <circle
              cx={p.x}
              cy={p.y}
              r={hoveredIndex === i ? 5 : 3.5}
              fill={CHART_COLOR}
              stroke="var(--background-pred)"
              strokeWidth={2}
              style={{ pointerEvents: "none" }}
            />
          </g>
        ))}

        {xLabelIndices.map((i) => {
          const p = points[i];
          if (!p) return null;
          return (
            <text
              key={p.date}
              x={p.x}
              y={height - 10}
              textAnchor="middle"
              fill={AXIS_COLOR}
              fontSize={11}
            >
              {p.label}
            </text>
          );
        })}

        {hovered && (
          <g pointerEvents="none">
            <line
              x1={hovered.x}
              y1={pad.top}
              x2={hovered.x}
              y2={pad.top + plotH}
              stroke={CHART_COLOR}
              strokeWidth={1}
              strokeDasharray="4 4"
              opacity={0.6}
            />
            <rect
              x={Math.min(hovered.x + 8, width - 120)}
              y={Math.max(hovered.y - 36, 8)}
              width={112}
              height={28}
              rx={6}
              fill="var(--background-pred)"
              stroke="var(--border-color)"
              strokeWidth={1}
            />
            <text
              x={Math.min(hovered.x + 16, width - 112)}
              y={Math.max(hovered.y - 18, 26)}
              fill="var(--foreground)"
              fontSize={11}
              fontWeight={600}
            >
              {hovered.label}: {hovered.visitors}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
