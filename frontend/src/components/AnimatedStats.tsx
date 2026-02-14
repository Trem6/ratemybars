"use client";

import { useEffect, useRef, useState } from "react";
import type { Venue } from "@/lib/api";

interface AnimatedStatsProps {
  venues: Venue[];
}

interface CategoryStat {
  name: string;
  count: number;
  color: string;
  gradient: string;
}

function getCategoryStats(venues: Venue[]): CategoryStat[] {
  const counts: Record<string, number> = {};
  for (const v of venues) {
    const cat = v.category || "other";
    counts[cat] = (counts[cat] || 0) + 1;
  }

  const configs: Record<string, { label: string; color: string; gradient: string }> = {
    bar: { label: "Bars", color: "#4ade80", gradient: "from-green-500 to-emerald-400" },
    nightclub: { label: "Nightclubs", color: "#a78bfa", gradient: "from-violet-500 to-purple-400" },
    frat: { label: "Frats", color: "#fbbf24", gradient: "from-amber-500 to-yellow-400" },
    party_host: { label: "Party Spots", color: "#fb923c", gradient: "from-orange-500 to-amber-400" },
    other: { label: "Other", color: "#71717a", gradient: "from-zinc-500 to-zinc-400" },
  };

  return Object.entries(counts)
    .map(([cat, count]) => ({
      name: configs[cat]?.label || cat,
      count,
      color: configs[cat]?.color || "#71717a",
      gradient: configs[cat]?.gradient || "from-zinc-500 to-zinc-400",
    }))
    .sort((a, b) => b.count - a.count);
}

function getRatingDistribution(venues: Venue[]) {
  const buckets = [
    { label: "4.5-5.0", min: 4.5, color: "#22d3ee", gradient: "from-cyan-500 to-teal-400" },
    { label: "3.5-4.4", min: 3.5, color: "#4ade80", gradient: "from-green-500 to-emerald-400" },
    { label: "2.5-3.4", min: 2.5, color: "#facc15", gradient: "from-yellow-500 to-amber-400" },
    { label: "1.5-2.4", min: 1.5, color: "#fb923c", gradient: "from-orange-500 to-amber-400" },
    { label: "0-1.4", min: 0, color: "#ef4444", gradient: "from-red-500 to-rose-400" },
  ];

  const ratedVenues = venues.filter((v) => v.avg_rating > 0);
  if (ratedVenues.length === 0) return [];

  return buckets
    .map((bucket) => {
      const count = ratedVenues.filter(
        (v) =>
          v.avg_rating >= bucket.min &&
          (bucket.min === 4.5 ? v.avg_rating <= 5 : v.avg_rating < bucket.min + 1)
      ).length;
      return { ...bucket, count };
    })
    .filter((b) => b.count > 0);
}

function AnimatedBar({
  label,
  count,
  max,
  gradient,
  color,
  delay,
  visible,
}: {
  label: string;
  count: number;
  max: number;
  gradient: string;
  color: string;
  delay: number;
  visible: boolean;
}) {
  const width = max > 0 ? (count / max) * 100 : 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-zinc-400 font-medium">{label}</span>
        <span
          className="font-bold tabular-nums transition-opacity duration-500"
          style={{
            color,
            opacity: visible ? 1 : 0,
            transitionDelay: `${delay + 400}ms`,
          }}
        >
          {count}
        </span>
      </div>
      <div className="h-2.5 rounded-full bg-zinc-800/50 overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${gradient}`}
          style={{
            width: visible ? `${width}%` : "0%",
            transition: `width 800ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
            boxShadow: visible ? `0 0 8px ${color}40` : "none",
          }}
        />
      </div>
    </div>
  );
}

export default function AnimatedStats({ venues }: AnimatedStatsProps) {
  const [visible, setVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const categories = getCategoryStats(venues);
  const ratings = getRatingDistribution(venues);
  const maxCat = Math.max(...categories.map((c) => c.count), 1);
  const maxRating = Math.max(...ratings.map((r) => r.count), 1);

  if (venues.length === 0) return null;

  return (
    <div ref={containerRef} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Category Breakdown */}
      <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-700/30 rounded-xl p-5 hover:border-violet-500/20 transition-all">
        <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">
          Venue Types
        </h3>
        <div className="space-y-3">
          {categories.map((cat, i) => (
            <AnimatedBar
              key={cat.name}
              label={cat.name}
              count={cat.count}
              max={maxCat}
              gradient={cat.gradient}
              color={cat.color}
              delay={i * 120}
              visible={visible}
            />
          ))}
        </div>
      </div>

      {/* Rating Distribution */}
      {ratings.length > 0 && (
        <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-700/30 rounded-xl p-5 hover:border-violet-500/20 transition-all">
          <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">
            Rating Distribution
          </h3>
          <div className="space-y-3">
            {ratings.map((bucket, i) => (
              <AnimatedBar
                key={bucket.label}
                label={bucket.label}
                count={bucket.count}
                max={maxRating}
                gradient={bucket.gradient}
                color={bucket.color}
                delay={i * 120}
                visible={visible}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
