"use client";

import { useState, useEffect, useCallback } from "react";
import { Compass, TrendingUp, Clock, ChevronRight, ChevronDown, MapPin } from "lucide-react";
import { searchSchools, type School } from "@/lib/api";
import { ExplorePanelSkeleton } from "./Skeleton";

interface ExplorePanelProps {
  onSchoolSelect: (school: School) => void;
}

type Tab = "top" | "recent";

export default function ExplorePanel({ onSchoolSelect }: ExplorePanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("top");
  const [topSchools, setTopSchools] = useState<School[]>([]);
  const [recentSchools, setRecentSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTopSchools = useCallback(async () => {
    setLoading(true);
    try {
      const res = await searchSchools({
        limit: "5",
        page: "1",
        sort: "venue_count",
      });
      setTopSchools(res.data || []);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRecentSchools = useCallback(async () => {
    setLoading(true);
    try {
      const res = await searchSchools({
        limit: "5",
        page: "1",
        sort: "name",
      });
      setRecentSchools(res.data || []);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    if (tab === "top") {
      fetchTopSchools();
    } else {
      fetchRecentSchools();
    }
  }, [isOpen, tab, fetchTopSchools, fetchRecentSchools]);

  const schools = tab === "top" ? topSchools : recentSchools;

  // Collapsed state: icon button
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-700/30 rounded-xl p-2.5 shadow-2xl hover:border-violet-500/20 hover:shadow-violet-500/5 transition-all"
        title="Explore Schools"
      >
        <Compass size={20} className="text-violet-400" />
      </button>
    );
  }

  return (
    <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-700/30 rounded-xl shadow-2xl w-64 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-zinc-700/30">
        <div className="flex items-center gap-2">
          <Compass size={16} className="text-violet-400" />
          <span className="text-sm font-semibold text-white">Explore</span>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
        >
          <ChevronDown size={16} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-700/30">
        <button
          onClick={() => setTab("top")}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
            tab === "top"
              ? "text-violet-400 border-b-2 border-violet-400 bg-violet-500/5"
              : "text-zinc-400 hover:text-zinc-300"
          }`}
        >
          <TrendingUp size={12} />
          Top Schools
        </button>
        <button
          onClick={() => setTab("recent")}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
            tab === "recent"
              ? "text-violet-400 border-b-2 border-violet-400 bg-violet-500/5"
              : "text-zinc-400 hover:text-zinc-300"
          }`}
        >
          <Clock size={12} />
          Recent
        </button>
      </div>

      {/* Content */}
      <div className="max-h-64 overflow-y-auto">
        {loading ? (
          <ExplorePanelSkeleton />
        ) : schools.length === 0 ? (
          <div className="py-6 text-center text-zinc-500 text-xs">
            No schools found
          </div>
        ) : (
          schools.map((school) => (
            <button
              key={school.id}
              onClick={() => onSchoolSelect(school)}
              className="w-full px-3 py-2.5 text-left hover:bg-zinc-800/60 transition-colors border-b border-zinc-800/30 last:border-0 group"
            >
              <div className="text-sm font-medium text-white group-hover:text-violet-300 transition-colors truncate">
                {school.name}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-zinc-500 text-xs flex items-center gap-0.5">
                  <MapPin size={10} />
                  {school.city}, {school.state}
                </span>
                {tab === "top" && school.venue_count > 0 && (
                  <span className="text-violet-400/70 text-xs">
                    {school.venue_count} venue{school.venue_count !== 1 ? "s" : ""}
                  </span>
                )}
                <ChevronRight size={12} className="text-zinc-600 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
