import React, { useState, useEffect, useRef } from "react";
import { api } from "../config/api";
import { Activity } from "lucide-react";

export default function PulseLine({ onSelectDay, selectedDay, refreshTrigger }) {
  const [daysCount, setDaysCount] = useState(45);
  const [pulseData, setPulseData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const containerRef = useRef(null);

  useEffect(() => {
    loadPulse();
  }, [daysCount, refreshTrigger]);

  const loadPulse = async () => {
    setLoading(true);
    try {
      const data = await api.getPulse(daysCount);
      setPulseData(data || []);
    } catch (err) {
      console.error("Failed to load pulse:", err);
    } finally {
      setLoading(false);
    }
  };

  const width = 800;
  const height = 140;
  const paddingX = 20;
  const paddingY = 24;

  const maxMinutes = Math.max(10, ...pulseData.map((d) => d.minutes || 0));
  const totalMinutes = pulseData.reduce((acc, d) => acc + (d.minutes || 0), 0);
  const totalTracks = pulseData.reduce((acc, d) => acc + (d.tracks || 0), 0);
  const activeDays = pulseData.filter((d) => (d.tracks || 0) > 0).length;

  const points = pulseData.map((d, i) => {
    const x =
      paddingX +
      (i / Math.max(1, pulseData.length - 1)) * (width - paddingX * 2);
    const y =
      height -
      paddingY -
      ((d.minutes || 0) / maxMinutes) * (height - paddingY * 2);
    return { ...d, x, y };
  });

  const pathD = points.reduce((acc, pt, i, arr) => {
    if (i === 0) return `M ${pt.x} ${pt.y}`;
    const prev = arr[i - 1];
    const cpX = (prev.x + pt.x) / 2;
    return `${acc} C ${cpX} ${prev.y}, ${cpX} ${pt.y}, ${pt.x} ${pt.y}`;
  }, "");

  const areaD =
    points.length > 0
      ? `${pathD} L ${points[points.length - 1].x} ${height - paddingY} L ${
          points[0].x
        } ${height - paddingY} Z`
      : "";

  return (
    <div className="surface-card p-3.5 sm:p-5 space-y-2.5 sm:space-y-3">
      {/* Pulse Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Activity className="w-4 h-4 text-[var(--primary)]" />
          <h3 className="font-fraunces text-sm sm:text-base font-bold text-[var(--ink)]">
            Listening Pulse
          </h3>
        </div>

        {/* Range Selector Pills */}
        <div className="flex items-center gap-1">
          {[14, 30, 45, 90].map((count) => (
            <button
              key={count}
              type="button"
              onClick={() => setDaysCount(count)}
              className={`px-2 sm:px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold transition ${
                daysCount === count
                  ? "bg-[var(--primary)] text-white"
                  : "bg-[var(--card-alt)] text-[var(--ink-soft)] hover:text-[var(--ink)]"
              }`}
            >
              {count}d
            </button>
          ))}
        </div>
      </div>

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2 text-center text-xs">
        <div className="p-1.5 sm:p-2 rounded-xl bg-[var(--card-alt)]/60">
          <span className="text-[9px] sm:text-[10px] text-[var(--ink-soft)] block">Active Days</span>
          <span className="font-fraunces text-xs sm:text-base font-bold text-[var(--ink)]">
            {activeDays} <span className="text-[10px] sm:text-xs font-normal text-[var(--ink-faint)]">/ {daysCount}</span>
          </span>
        </div>

        <div className="p-1.5 sm:p-2 rounded-xl bg-[var(--card-alt)]/60">
          <span className="text-[9px] sm:text-[10px] text-[var(--ink-soft)] block">Total Time</span>
          <span className="font-fraunces text-xs sm:text-base font-bold text-[var(--primary)]">
            {Math.round(totalMinutes)} <span className="text-[10px] sm:text-xs font-normal">min</span>
          </span>
        </div>

        <div className="p-1.5 sm:p-2 rounded-xl bg-[var(--card-alt)]/60">
          <span className="text-[9px] sm:text-[10px] text-[var(--ink-soft)] block">Tracks</span>
          <span className="font-fraunces text-xs sm:text-base font-bold text-[var(--coriander)]">
            {totalTracks}
          </span>
        </div>
      </div>

      {/* Pulse SVG Chart */}
      <div className="relative pt-1" ref={containerRef}>
        {loading ? (
          <div className="h-32 flex items-center justify-center text-xs text-[var(--ink-faint)]">
            Loading pulse...
          </div>
        ) : (
          <div className="relative overflow-visible">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="w-full h-32 overflow-visible"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="pulseGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#16845B" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#16845B" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              <line
                x1={paddingX}
                y1={height - paddingY}
                x2={width - paddingX}
                y2={height - paddingY}
                stroke="var(--border)"
                strokeDasharray="4 4"
                strokeWidth="1"
              />

              {areaD && <path d={areaD} fill="url(#pulseGradient)" />}

              {pathD && (
                <path
                  d={pathD}
                  fill="none"
                  stroke="var(--primary)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {points.map((pt) => {
                const isSelected = selectedDay === pt.day;
                const hasListens = (pt.tracks || 0) > 0;

                return (
                  <g
                    key={pt.day}
                    onClick={() => onSelectDay?.(pt.day)}
                    onMouseEnter={() => setHoveredPoint(pt)}
                    onMouseLeave={() => setHoveredPoint(null)}
                    className="cursor-pointer"
                  >
                    <circle cx={pt.x} cy={pt.y} r="10" fill="transparent" />
                    {(hasListens || isSelected) && (
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={isSelected ? "5" : "3"}
                        fill={isSelected ? "#FFFFFF" : "var(--primary)"}
                        stroke="var(--primary)"
                        strokeWidth={isSelected ? "2.5" : "1"}
                      />
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Hover Tooltip */}
            {hoveredPoint && (
              <div
                className="absolute z-30 pointer-events-none transform -translate-x-1/2 -top-12 p-2 rounded-xl bg-[var(--card)] border border-[var(--border)] shadow-lg text-left text-xs min-w-[110px] max-w-[180px]"
                style={{ left: `${Math.max(12, Math.min(88, (hoveredPoint.x / width) * 100))}%` }}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="font-bold text-[var(--ink)]">{hoveredPoint.day}</span>
                  {hoveredPoint.mood && (
                    <span className="text-[9px] font-bold px-1.5 rounded-full bg-[var(--aubergine-soft)] text-[var(--primary)]">
                      {hoveredPoint.mood}
                    </span>
                  )}
                </div>
                {hoveredPoint.title && (
                  <p className="text-[11px] font-semibold text-[var(--primary)] truncate">
                    "{hoveredPoint.title}"
                  </p>
                )}
                <div className="text-[10px] text-[var(--ink-soft)] mt-0.5">
                  {hoveredPoint.tracks} tracks • {hoveredPoint.minutes} min
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
