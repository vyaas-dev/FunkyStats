"use client";

import { useState, useEffect, memo, useMemo, useCallback } from "react";

type DataPoint = {
  year: number;
  normFSM: number;
  isPrediction?: boolean;
};

type InteractiveChartProps = {
  allStats: DataPoint[];
  minPossibleFSM: number;
  maxPossibleFSM: number;
};

type PlotPoint = DataPoint & { x: number; y: number };

const ACTUAL_COLOR = "#3b82f6";
const PREDICTED_COLOR = "#f59e0b";
const GRID_COLOR = "rgba(148, 163, 184, 0.2)";
const AXIS_COLOR = "rgba(148, 163, 184, 0.85)";
const AVG_COLOR = "#fde047";
const BASELINE_COLOR = "#f87171";

/** Smooth curve through every point; lower tension = gentler bends at joints. */
function buildSmoothPath(points: PlotPoint[], tension = 0.08): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x},${points[0].y}`;
  if (points.length === 2) {
    return `M ${points[0].x},${points[0].y} L ${points[1].x},${points[1].y}`;
  }

  let d = `M ${points[0].x},${points[0].y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(i - 1, 0)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(i + 2, points.length - 1)];

    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;

    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }

  return d;
}

function buildAreaPath(linePath: string, points: PlotPoint[], baselineY: number): string {
  if (points.length < 2 || !linePath) return "";
  const last = points[points.length - 1];
  const first = points[0];
  return `${linePath} L ${last.x},${baselineY} L ${first.x},${baselineY} Z`;
}

function InteractiveChart({
  allStats,
  minPossibleFSM,
  maxPossibleFSM,
}: InteractiveChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<DataPoint | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [dimensions, setDimensions] = useState({ width: 920, height: 420 });

  useEffect(() => {
    let frame = 0;

    const updateDimensions = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const screenWidth = window.innerWidth;
        const isMobile = screenWidth < 768;
        setDimensions({
          width: isMobile ? Math.min(screenWidth - 48, 420) : Math.min(screenWidth * 0.9, 920),
          height: isMobile ? 280 : 420,
        });
      });
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", updateDimensions);
    };
  }, []);

  const chart = useMemo(() => {
    const { width, height } = dimensions;
    const isMobile = width < 500;
    const leftPadding = isMobile ? 44 : 56;
    const rightPadding = isMobile ? 16 : 28;
    const topPadding = 24;
    const bottomPadding = isMobile ? 36 : 32;
    const adjustedMinFSM = Math.min(minPossibleFSM, 1450);
    const adjustedMaxFSM = Math.max(maxPossibleFSM, 1550);
    const plotWidth = width - leftPadding - rightPadding;
    const plotHeight = height - topPadding - bottomPadding;
    const baselineY = height - bottomPadding;

    const sortedStats = [...allStats].sort((a, b) => a.year - b.year);

    const fsmToY = (fsm: number) =>
      baselineY -
      ((fsm - adjustedMinFSM) / (adjustedMaxFSM - adjustedMinFSM || 1)) * plotHeight;

    const plotPoints: PlotPoint[] = (() => {
      if (sortedStats.length === 0) return [];
      const minYear = sortedStats[0].year;
      const maxYear = sortedStats[sortedStats.length - 1].year;
      const yearToX = (year: number) => {
        if (maxYear === minYear) return leftPadding + plotWidth / 2;
        return leftPadding + ((year - minYear) / (maxYear - minYear)) * plotWidth;
      };
      return sortedStats.map((s) => ({
        ...s,
        x: yearToX(s.year),
        y: fsmToY(s.normFSM),
      }));
    })();

    const filteredStats =
      sortedStats.length > 1
        ? sortedStats.filter(
            (s) => s.normFSM !== Math.min(...sortedStats.map((d) => d.normFSM))
          )
        : sortedStats;

    const avgFSM =
      filteredStats.length > 0
        ? Math.sqrt(
            filteredStats.reduce((sum, s) => sum + s.normFSM * s.normFSM, 0) /
              filteredStats.length
          )
        : 0;

    const predictionStartIndex = sortedStats.findIndex((s) => s.isPrediction);
    const actualPoints =
      predictionStartIndex > 0
        ? plotPoints.slice(0, predictionStartIndex)
        : predictionStartIndex === 0
          ? []
          : plotPoints.filter((p) => !p.isPrediction);
    const predictedPoints =
      predictionStartIndex >= 0 ? plotPoints.slice(predictionStartIndex) : [];

    const actualLinePath = buildSmoothPath(actualPoints);
    const predictedLinePath = buildSmoothPath(predictedPoints);

    const gridLines: { v: number; y: number }[] = [];
    for (let v = adjustedMinFSM; v <= adjustedMaxFSM; v += 50) {
      gridLines.push({ v, y: fsmToY(v) });
    }

    return {
      width,
      height,
      isMobile,
      leftPadding,
      rightPadding,
      baselineY,
      plotPoints,
      actualPoints,
      predictedPoints,
      actualLinePath,
      predictedLinePath,
      actualAreaPath: buildAreaPath(actualLinePath, actualPoints, baselineY),
      avgY: avgFSM > 0 ? fsmToY(avgFSM) : null,
      baselineLineY:
        1500 >= adjustedMinFSM && 1500 <= adjustedMaxFSM ? fsmToY(1500) : null,
      gridLines,
      hasData: sortedStats.length > 0,
    };
  }, [allStats, dimensions, minPossibleFSM, maxPossibleFSM]);

  const handlePointInteraction = useCallback(
    (point: DataPoint, e: React.MouseEvent | React.TouchEvent) => {
      setHoveredPoint(point);
      const target = e.currentTarget as SVGCircleElement;
      const rect = target.ownerSVGElement?.getBoundingClientRect();
      if (!rect) return;

      if ("touches" in e && e.touches.length > 0) {
        setMousePos({
          x: e.touches[0].clientX - rect.left,
          y: e.touches[0].clientY - rect.top,
        });
      } else if ("clientX" in e) {
        setMousePos({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      }
    },
    []
  );

  const {
    width,
    height,
    isMobile,
    leftPadding,
    rightPadding,
    baselineY,
    plotPoints,
    actualPoints,
    predictedPoints,
    actualLinePath,
    predictedLinePath,
    actualAreaPath,
    avgY,
    baselineLineY,
    gridLines,
    hasData,
  } = chart;

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        maxWidth: "920px",
        margin: "0 auto",
      }}
    >
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{
          display: "block",
          maxWidth: "100%",
          height: "auto",
          touchAction: "manipulation",
        }}
        role="img"
        aria-label="Historical normalized FSM chart"
      >
        <defs>
          <linearGradient id="fsmAreaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ACTUAL_COLOR} stopOpacity="0.22" />
            <stop offset="100%" stopColor={ACTUAL_COLOR} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {gridLines.map(({ v, y }) => (
          <g key={v}>
            <line
              x1={leftPadding}
              y1={y}
              x2={width - rightPadding}
              y2={y}
              stroke={GRID_COLOR}
              strokeWidth="1"
            />
            <text
              x={leftPadding - 10}
              y={y + 4}
              fontSize={isMobile ? 10 : 12}
              textAnchor="end"
              fill={AXIS_COLOR}
            >
              {v}
            </text>
          </g>
        ))}

        <text
          x={isMobile ? 6 : 8}
          y={height / 2}
          fontSize={isMobile ? 10 : 13}
          textAnchor="middle"
          fill={AXIS_COLOR}
          transform={`rotate(-90, ${isMobile ? 6 : 8}, ${height / 2})`}
        >
          Normalized FSM
        </text>

        {hasData && avgY !== null && (
          <line
            x1={leftPadding}
            x2={width - rightPadding}
            y1={avgY}
            y2={avgY}
            stroke={AVG_COLOR}
            strokeDasharray="6,4"
            strokeWidth="1.5"
            opacity={0.9}
          />
        )}

        {baselineLineY !== null && (
          <>
            <line
              x1={leftPadding}
              x2={width - rightPadding}
              y1={baselineLineY}
              y2={baselineLineY}
              stroke={BASELINE_COLOR}
              strokeDasharray="6,4"
              strokeWidth="1.5"
              opacity={0.85}
            />
            <text
              x={width - rightPadding}
              y={baselineLineY - 6}
              textAnchor="end"
              fontSize={isMobile ? 10 : 11}
              fill={BASELINE_COLOR}
            >
              Baseline
            </text>
          </>
        )}

        {actualAreaPath && (
          <path d={actualAreaPath} fill="url(#fsmAreaFill)" stroke="none" />
        )}

        {actualLinePath && (
          <path
            d={actualLinePath}
            fill="none"
            stroke={ACTUAL_COLOR}
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {predictedLinePath && (
          <path
            d={predictedLinePath}
            fill="none"
            stroke={PREDICTED_COLOR}
            strokeWidth="2"
            strokeDasharray="7,5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {actualPoints.length > 0 &&
          predictedPoints.length > 0 &&
          (() => {
            const lastActual = actualPoints[actualPoints.length - 1];
            const firstPredicted = predictedPoints[0];
            if (lastActual.year === firstPredicted.year) return null;
            return (
              <line
                x1={lastActual.x}
                y1={lastActual.y}
                x2={firstPredicted.x}
                y2={firstPredicted.y}
                stroke={PREDICTED_COLOR}
                strokeWidth="2"
                strokeDasharray="7,5"
                opacity={0.7}
              />
            );
          })()}

        <line
          x1={leftPadding}
          y1={baselineY}
          x2={width - rightPadding}
          y2={baselineY}
          stroke={GRID_COLOR}
          strokeWidth="1"
        />
        <line
          x1={leftPadding}
          y1={24}
          x2={leftPadding}
          y2={baselineY}
          stroke={GRID_COLOR}
          strokeWidth="1"
        />

        {plotPoints.map((point) => {
          const radius = isMobile ? 4.5 : 5.5;
          const hoverRadius = isMobile ? 6.5 : 7.5;
          const touchAreaRadius = isMobile ? 14 : 11;
          const pointColor = point.isPrediction ? PREDICTED_COLOR : ACTUAL_COLOR;
          const isHovered = hoveredPoint?.year === point.year;

          return (
            <g key={point.year}>
              <circle
                cx={point.x}
                cy={point.y}
                r={touchAreaRadius}
                fill="transparent"
                style={{ cursor: "pointer" }}
                onMouseEnter={(e) => handlePointInteraction(point, e)}
                onMouseLeave={() => setHoveredPoint(null)}
                onTouchStart={(e) => {
                  e.preventDefault();
                  handlePointInteraction(point, e);
                }}
                onTouchEnd={() => {
                  if (isMobile) setTimeout(() => setHoveredPoint(null), 2000);
                }}
                onClick={(e) => {
                  e.preventDefault();
                  handlePointInteraction(point, e);
                  if (isMobile) setTimeout(() => setHoveredPoint(null), 2000);
                }}
              />
              {isHovered && (
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={hoverRadius + 4}
                  fill={pointColor}
                  opacity={0.18}
                  style={{ pointerEvents: "none" }}
                />
              )}
              <circle
                cx={point.x}
                cy={point.y}
                r={isHovered ? hoverRadius : radius}
                fill={pointColor}
                stroke="var(--background, #111)"
                strokeWidth="2"
                style={{ pointerEvents: "none" }}
              />
            </g>
          );
        })}

        {plotPoints.map((point) => (
          <text
            key={`label-${point.year}`}
            x={point.x}
            y={baselineY + (isMobile ? 18 : 20)}
            fontSize={isMobile ? 10 : 12}
            textAnchor="middle"
            fill={point.isPrediction ? PREDICTED_COLOR : AXIS_COLOR}
            fontWeight={point.isPrediction ? 600 : 500}
          >
            {(point.year % 100).toString().padStart(2, "0")}
          </text>
        ))}
      </svg>

      {hoveredPoint && (
        <div
          style={{
            position: "absolute",
            left: mousePos.x + 10,
            top: mousePos.y - 10,
            background: hoveredPoint.isPrediction
              ? "rgba(245, 158, 11, 0.95)"
              : "rgba(15, 23, 42, 0.92)",
            color: hoveredPoint.isPrediction ? "#000" : "#fff",
            padding: "8px 12px",
            borderRadius: "8px",
            fontSize: "14px",
            pointerEvents: "none",
            zIndex: 1000,
            whiteSpace: "nowrap",
            border: hoveredPoint.isPrediction
              ? "2px solid #f59e0b"
              : "1px solid rgba(148, 163, 184, 0.35)",
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.25)",
          }}
        >
          <div>
            <strong>{hoveredPoint.year}</strong>
            {hoveredPoint.isPrediction && (
              <span style={{ marginLeft: "6px", fontSize: "12px" }}>
                (Predicted)
              </span>
            )}
          </div>
          <div>Normalized FSM: {hoveredPoint.normFSM.toFixed(0)}</div>
        </div>
      )}
    </div>
  );
}

export default memo(InteractiveChart);
