"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { School, MapPin, Star } from "lucide-react";
import { getStats, type SiteStats } from "@/lib/api";

function useCountUp(target: number, duration = 1500) {
  const [value, setValue] = useState(0);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    if (target <= 0) {
      setValue(target);
      return;
    }
    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      }
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration]);

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

export default function StatsBar() {
  const [stats, setStats] = useState<SiteStats>({ schools: 2466, venues: 0, ratings: 0 });

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

  return (
    <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-700/30 rounded-xl px-5 py-2.5 flex items-center gap-6 text-sm shadow-2xl">
      <StatItem
        icon={<School size={16} />}
        value={stats.schools}
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
