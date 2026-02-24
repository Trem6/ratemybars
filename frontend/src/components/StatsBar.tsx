"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { School, MapPin, Star } from "lucide-react";
import { getStats, type SiteStats } from "@/lib/api";

function useCountUp(target: number) {
  const [value, setValue] = useState(0);
  const frameRef = useRef<number>(0);
  const prevTarget = useRef(0);
  const isFirst = useRef(true);

  useEffect(() => {
    const from = prevTarget.current;
    prevTarget.current = target;

    if (target < 0) {
      setValue(target);
      return;
    }

    // Longer initial animation, short transition for filter changes
    const duration = isFirst.current ? 1500 : 350;
    isFirst.current = false;
    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(from + (target - from) * eased));

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      }
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target]);

  return value;
}

function StatItem({
  icon,
  value,
  label,
  color,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  color: string;
}) {
  const display = useCountUp(value);

  return (
    <div className="flex items-center gap-2">
      <span className={color}>{icon}</span>
      <span className="text-white font-semibold tabular-nums">
        {display.toLocaleString()}
      </span>
      <span className="text-zinc-400 text-sm hidden sm:inline">{label}</span>
    </div>
  );
}

export default function StatsBar({ visibleSchools }: { visibleSchools?: number }) {
  const [stats, setStats] = useState<SiteStats>({ schools: 0, venues: 0, ratings: 0 });

  const fetchStats = useCallback(async () => {
    try {
      const data = await getStats();
      setStats(data);
    } catch {
      // Keep fallback values
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const schoolCount = visibleSchools ?? stats.schools;

  return (
    <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-700/30 rounded-xl px-5 py-2.5 flex items-center gap-6 text-sm shadow-2xl">
      <StatItem
        icon={<School size={16} />}
        value={schoolCount}
        label="Schools"
        color="text-emerald-400"
      />
      <div className="w-px h-4 bg-zinc-700/50" />
      <StatItem
        icon={<MapPin size={16} />}
        value={stats.venues}
        label="Venues"
        color="text-violet-400"
      />
      <div className="w-px h-4 bg-zinc-700/50" />
      <StatItem
        icon={<Star size={16} />}
        value={stats.ratings}
        label="Ratings"
        color="text-amber-400"
      />
    </div>
  );
}
