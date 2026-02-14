"use client";

import { useEffect, useState } from "react";

export type Tier = "S" | "A" | "B" | "C" | "D" | "F";

interface TierConfig {
  label: string;
  color: string;
  glow: string;
  bgColor: string;
  borderColor: string;
}

const TIER_CONFIG: Record<Tier, TierConfig> = {
  S: {
    label: "S-Tier",
    color: "#fbbf24",
    glow: "0 0 20px rgba(251,191,36,0.5), 0 0 40px rgba(251,191,36,0.25)",
    bgColor: "rgba(251,191,36,0.15)",
    borderColor: "rgba(251,191,36,0.4)",
  },
  A: {
    label: "A-Tier",
    color: "#a78bfa",
    glow: "0 0 20px rgba(167,139,250,0.5), 0 0 40px rgba(167,139,250,0.25)",
    bgColor: "rgba(167,139,250,0.15)",
    borderColor: "rgba(167,139,250,0.4)",
  },
  B: {
    label: "B-Tier",
    color: "#22d3ee",
    glow: "0 0 20px rgba(34,211,238,0.5), 0 0 40px rgba(34,211,238,0.25)",
    bgColor: "rgba(34,211,238,0.15)",
    borderColor: "rgba(34,211,238,0.4)",
  },
  C: {
    label: "C-Tier",
    color: "#fb923c",
    glow: "0 0 14px rgba(251,146,60,0.3)",
    bgColor: "rgba(251,146,60,0.12)",
    borderColor: "rgba(251,146,60,0.35)",
  },
  D: {
    label: "D-Tier",
    color: "#f87171",
    glow: "0 0 10px rgba(248,113,113,0.2)",
    bgColor: "rgba(248,113,113,0.1)",
    borderColor: "rgba(248,113,113,0.25)",
  },
  F: {
    label: "No Scene",
    color: "#71717a",
    glow: "none",
    bgColor: "rgba(113,113,122,0.08)",
    borderColor: "rgba(113,113,122,0.2)",
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

const SIZE_STYLES: Record<string, React.CSSProperties> = {
  sm: { width: 32, height: 32, fontSize: 12, fontWeight: 700 },
  md: { width: 48, height: 48, fontSize: 18, fontWeight: 900 },
  lg: { width: 80, height: 80, fontSize: 30, fontWeight: 900 },
};

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

  return (
    <div
      className="relative inline-flex items-center justify-center rounded-xl transition-all duration-500"
      style={{
        ...SIZE_STYLES[size],
        color: config.color,
        backgroundColor: config.bgColor,
        border: `1px solid ${config.borderColor}`,
        boxShadow: visible ? config.glow : "none",
        transform: visible ? "scale(1)" : "scale(0.5)",
        opacity: visible ? 1 : 0,
      }}
    >
      {tier}
      {/* Pulse ring for S and A tiers */}
      {(tier === "S" || tier === "A") && visible && (
        <span
          className="absolute inset-0 rounded-xl animate-ping"
          style={{
            border: `2px solid ${config.color}`,
            opacity: 0.2,
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
      className="inline-flex items-center justify-center rounded font-bold leading-none"
      style={{
        padding: "3px 6px",
        fontSize: 10,
        color: config.color,
        backgroundColor: config.bgColor,
        border: `1px solid ${config.borderColor}`,
        boxShadow: tier === "S" || tier === "A" || tier === "B" ? `0 0 8px ${config.color}40` : "none",
      }}
    >
      {tier}
    </span>
  );
}
