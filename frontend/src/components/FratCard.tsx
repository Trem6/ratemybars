"use client";

import { useState, useCallback, useId } from "react";
import { type FratWithRating, createFratRating } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";

function getHeatColor(score: number): string {
  if (score >= 4.2) return "#ef4444"; // red-500
  if (score >= 3.4) return "#f97316"; // orange-500
  if (score >= 2.6) return "#a855f7"; // purple-500
  if (score >= 1.8) return "#6366f1"; // indigo-500
  return "#3b82f6"; // blue-500
}

function getHeatGradientPercent(score: number): number {
  return ((score - 1) / 4) * 100;
}

interface HeatBarProps {
  score: number;
}

function HeatBar({ score }: HeatBarProps) {
  const pct = getHeatGradientPercent(score);
  return (
    <div className="relative h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
      <div
        className="absolute inset-y-0 left-0 rounded-full"
        style={{
          width: `${pct}%`,
          background: "linear-gradient(to right, #3b82f6, #6366f1, #a855f7, #f97316, #ef4444)",
        }}
      />
    </div>
  );
}

interface FratCardProps {
  frat: FratWithRating;
  schoolId: string;
  compact?: boolean;
  onRated?: () => void;
}

export default function FratCard({ frat, schoolId, compact = false, onRated }: FratCardProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [sliderValue, setSliderValue] = useState(3);
  const [submitting, setSubmitting] = useState(false);

  const handleRate = useCallback(async () => {
    if (!user) {
      showToast("Log in to rate fraternities", "info");
      return;
    }
    setSubmitting(true);
    try {
      await createFratRating({
        frat_name: frat.name,
        school_id: schoolId,
        score: sliderValue,
      });
      showToast("Rating submitted!", "success");
      setExpanded(false);
      onRated?.();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to submit rating", "error");
    } finally {
      setSubmitting(false);
    }
  }, [user, frat.name, schoolId, sliderValue, showToast, onRated]);

  if (compact) {
    return (
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left"
      >
        <div className="flex items-center gap-2.5 py-1.5 px-2 rounded-lg hover:bg-zinc-800/50 transition-colors group">
          <span className="text-xs font-medium text-zinc-300 truncate flex-1 min-w-0 group-hover:text-white transition-colors">
            {frat.name}
          </span>
          {frat.rating_count > 0 ? (
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="w-12">
                <HeatBar score={frat.avg_rating} />
              </div>
              <span
                className="text-[10px] font-bold tabular-nums w-6 text-right"
                style={{ color: getHeatColor(frat.avg_rating) }}
              >
                {frat.avg_rating.toFixed(1)}
              </span>
              <span className="text-[10px] text-zinc-600">({frat.rating_count})</span>
            </div>
          ) : (
            <span className="text-[10px] text-zinc-600 shrink-0">no ratings</span>
          )}
        </div>

        {expanded && (
          <div
            className="px-2 pb-2 pt-1"
            onClick={(e) => e.stopPropagation()}
          >
            <SliderInput
              value={sliderValue}
              onChange={setSliderValue}
              onSubmit={handleRate}
              submitting={submitting}
              loggedIn={!!user}
            />
          </div>
        )}
      </button>
    );
  }

  return (
    <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-700/30 rounded-xl p-4 hover:border-blue-500/20 transition-all">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h4 className="text-sm font-semibold text-white truncate">{frat.name}</h4>
        {frat.rating_count > 0 ? (
          <div className="flex items-center gap-1.5 shrink-0">
            <span
              className="text-sm font-bold tabular-nums"
              style={{ color: getHeatColor(frat.avg_rating) }}
            >
              {frat.avg_rating.toFixed(1)}
            </span>
            <span className="text-xs text-zinc-500">({frat.rating_count})</span>
          </div>
        ) : (
          <span className="text-xs text-zinc-600">no ratings</span>
        )}
      </div>
      <div className="mb-3">
        <HeatBar score={frat.rating_count > 0 ? frat.avg_rating : 3} />
      </div>
      <SliderInput
        value={sliderValue}
        onChange={setSliderValue}
        onSubmit={handleRate}
        submitting={submitting}
        loggedIn={!!user}
      />
    </div>
  );
}

interface SliderInputProps {
  value: number;
  onChange: (v: number) => void;
  onSubmit: () => void;
  submitting: boolean;
  loggedIn: boolean;
}

function SliderInput({ value, onChange, onSubmit, submitting, loggedIn }: SliderInputProps) {
  const sliderId = useId();
  const color = getHeatColor(value);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-sm select-none" title="Cold">&#x2744;&#xFE0F;</span>
        <div className="relative flex-1">
          <div
            className="absolute inset-0 h-2 top-1/2 -translate-y-1/2 rounded-full pointer-events-none"
            style={{
              background: "linear-gradient(to right, #3b82f6, #6366f1, #a855f7, #f97316, #ef4444)",
              opacity: 0.3,
            }}
          />
          <input
            id={sliderId}
            type="range"
            min={1}
            max={5}
            step={0.5}
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className="relative w-full h-2 appearance-none bg-transparent cursor-pointer z-10
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white
              [&::-webkit-slider-thumb]:cursor-pointer
              [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full
              [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:cursor-pointer
              [&::-webkit-slider-runnable-track]:bg-transparent [&::-moz-range-track]:bg-transparent"
          />
          <style>{`
            #${CSS.escape(sliderId)}::-webkit-slider-thumb {
              background: ${color};
              box-shadow: 0 0 8px ${color}80;
            }
            #${CSS.escape(sliderId)}::-moz-range-thumb {
              background: ${color};
              box-shadow: 0 0 8px ${color}80;
            }
          `}</style>
        </div>
        <span className="text-sm select-none" title="Hot">&#x1F525;</span>
      </div>
      <div className="flex items-center justify-between">
        <span
          className="text-xs font-bold tabular-nums"
          style={{ color }}
        >
          {value.toFixed(1)}
        </span>
        <button
          onClick={onSubmit}
          disabled={submitting || !loggedIn}
          className="px-3 py-1 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
        >
          {!loggedIn ? "Log in to rate" : submitting ? "..." : "Rate"}
        </button>
      </div>
    </div>
  );
}
