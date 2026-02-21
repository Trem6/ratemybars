"use client";

import { useEffect, useState, useRef } from "react";

/** Compute a 0–100 party score from venue count and average rating */
function computeScore(venueCount: number, avgRating: number): number {
  // Venue contribution: 0–5+ venues maps to 0–60 points (diminishing returns)
  const venueScore = Math.min(venueCount / 5, 1) * 60;
  // Rating contribution: 0–5 rating maps to 0–40 points
  const ratingScore = avgRating > 0 ? (avgRating / 5) * 40 : 0;
  return Math.round(venueScore + ratingScore);
}

/** Get color for score (red -> yellow -> green -> cyan) */
function getScoreColor(score: number): string {
  if (score >= 80) return "#22d3ee"; // cyan
  if (score >= 60) return "#4ade80"; // green
  if (score >= 40) return "#facc15"; // yellow
  if (score >= 20) return "#fb923c"; // orange
  return "#ef4444"; // red
}

function getScoreLabel(score: number): string {
  if (score >= 80) return "Legendary";
  if (score >= 60) return "Hot";
  if (score >= 40) return "Decent";
  if (score >= 20) return "Quiet";
  return "Dead";
}

interface PartyGaugeProps {
  venueCount: number;
  avgRating: number;
  size?: "sm" | "md";
}

export default function PartyGauge({ venueCount, avgRating, size = "md" }: PartyGaugeProps) {
  const score = computeScore(venueCount, avgRating);
  const [animatedScore, setAnimatedScore] = useState(0);
  const [dashOffset, setDashOffset] = useState(283); // full circle circumference
  const frameRef = useRef<number>(0);

  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  // Gauge is 270 degrees (3/4 of circle), starting from bottom-left
  const arcLength = circumference * 0.75;
  const targetOffset = arcLength - (score / 100) * arcLength;

  useEffect(() => {
    const startTime = performance.now();
    const duration = 1200;
    const startOffset = arcLength;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);

      const currentOffset = startOffset - (startOffset - targetOffset) * eased;
      setDashOffset(currentOffset);
      setAnimatedScore(Math.round(score * eased));

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    // Delay start slightly for visual impact
    const timer = setTimeout(() => {
      frameRef.current = requestAnimationFrame(animate);
    }, 300);

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(frameRef.current);
    };
  }, [score, arcLength, targetOffset]);

  const color = getScoreColor(score);
  const label = getScoreLabel(score);

  const isSmall = size === "sm";
  const containerSize = isSmall ? "w-24 h-24" : "w-32 h-32";
  const strokeW = isSmall ? 6 : 7;
  const scoreTextClass = isSmall ? "text-2xl" : "text-3xl";
  const labelTextClass = isSmall ? "text-[8px]" : "text-[9px]";
  const bottomLabelClass = isSmall ? "text-[10px] -mt-0.5" : "text-xs -mt-1";

  return (
    <div className="flex flex-col items-center">
      <div className={`relative ${containerSize}`}>
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full -rotate-[225deg]"
        >
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="rgba(63,63,70,0.25)"
            strokeWidth={strokeW}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeLinecap="round"
          />
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeW}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            style={{
              filter: `drop-shadow(0 0 6px ${color}80)`,
              transition: "stroke 0.3s",
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={`${scoreTextClass} font-black tabular-nums leading-none`}
            style={{ color }}
          >
            {animatedScore}
          </span>
          <span className={`${labelTextClass} font-semibold text-zinc-500 uppercase tracking-widest mt-1`}>
            Party Score
          </span>
        </div>
      </div>
      <span
        className={`${bottomLabelClass} font-bold uppercase tracking-wider`}
        style={{ color }}
      >
        {label}
      </span>
    </div>
  );
}
