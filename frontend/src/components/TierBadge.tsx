"use client";

import { useEffect, useState } from "react";

export type Tier = "S" | "A" | "B" | "C" | "D" | "F";

interface TierConfig {
  label: string;
  color: string;
  glow: string;
  bg: string;
  border: string;
  text: string;
}

const TIER_CONFIG: Record<Tier, TierConfig> = {
  S: {
    label: "S-Tier",
    color: "#fbbf24",
    glow: "0 0 20px rgba(251,191,36,0.5), 0 0 40px rgba(251,191,36,0.2)",
    bg: "bg-amber-500/15",
    border: "border-amber-500/30",
    text: "text-amber-400",
  },
  A: {
    label: "A-Tier",
    color: "#a78bfa",
    glow: "0 0 20px rgba(167,139,250,0.5), 0 0 40px rgba(167,139,250,0.2)",
    bg: "bg-violet-500/15",
    border: "border-violet-500/30",
    text: "text-violet-400",
  },
  B: {
    label: "B-Tier",
    color: "#22d3ee",
    glow: "0 0 20px rgba(34,211,238,0.5), 0 0 40px rgba(34,211,238,0.2)",
    bg: "bg-cyan-500/15",
    border: "border-cyan-500/30",
    text: "text-cyan-400",
  },
  C: {
    label: "C-Tier",
    color: "#a1a1aa",
    glow: "0 0 12px rgba(161,161,170,0.3)",
    bg: "bg-zinc-500/15",
    border: "border-zinc-500/30",
    text: "text-zinc-400",
  },
  D: {
    label: "D-Tier",
    color: "#71717a",
    glow: "none",
    bg: "bg-zinc-700/15",
    border: "border-zinc-700/30",
    text: "text-zinc-500",
  },
  F: {
    label: "No Scene",
    color: "#3f3f46",
    glow: "none",
    bg: "bg-zinc-800/15",
    border: "border-zinc-800/30",
    text: "text-zinc-600",
  },
};

export function computeTier(venueCount: number, avgRating: number): Tier {
  if (venueCount >= 5 && avgRating >= 4.0) return "S";
  if (venueCount >= 4 && avgRating >= 3.5) return "A";
  if (venueCount >= 3 && avgRating >= 3.0) return "B";
  if (venueCount >= 2) return "C";
  if (venueCount >= 1) return "D";
  return "F";
}

export function getTierConfig(tier: Tier): TierConfig {
  return TIER_CONFIG[tier];
}

interface TierBadgeProps {
  venueCount: number;
  avgRating: number;
  size?: "sm" | "md" | "lg";
  animate?: boolean;
}

export default function TierBadge({
  venueCount,
  avgRating,
  size = "md",
  animate = true,
}: TierBadgeProps) {
  const [visible, setVisible] = useState(!animate);
  const tier = computeTier(venueCount, avgRating);
  const config = TIER_CONFIG[tier];

  useEffect(() => {
    if (animate) {
      const timer = setTimeout(() => setVisible(true), 100);
      return () => clearTimeout(timer);
    }
  }, [animate]);

  const sizeClasses = {
    sm: "w-8 h-8 text-xs font-bold",
    md: "w-12 h-12 text-lg font-black",
    lg: "w-20 h-20 text-3xl font-black",
  };

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-xl border ${config.bg} ${config.border} ${config.text} ${sizeClasses[size]} transition-all duration-500`}
      style={{
        boxShadow: visible ? config.glow : "none",
        transform: visible ? "scale(1)" : "scale(0.5)",
        opacity: visible ? 1 : 0,
      }}
    >
      {tier}
      {/* Pulse ring for S and A tiers */}
      {(tier === "S" || tier === "A") && visible && (
        <span
          className="absolute inset-0 rounded-xl animate-ping opacity-20"
          style={{
            borderWidth: 2,
            borderColor: config.color,
            animationDuration: "2s",
          }}
        />
      )}
    </div>
  );
}

/** Compact inline tier tag for search results, panels, popups */
export function TierTag({
  venueCount,
  avgRating,
}: {
  venueCount: number;
  avgRating: number;
}) {
  const tier = computeTier(venueCount, avgRating);
  const config = TIER_CONFIG[tier];

  return (
    <span
      className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-bold leading-none border ${config.bg} ${config.border} ${config.text}`}
    >
      {tier}
    </span>
  );
}
