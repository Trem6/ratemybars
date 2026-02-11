"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import SearchBar from "@/components/SearchBar";
import SchoolPanel from "@/components/SchoolPanel";
import StatsBar from "@/components/StatsBar";
import ExplorePanel from "@/components/ExplorePanel";
import type { School, MapSchool } from "@/lib/api";

// Dynamic import for Map to avoid SSR issues with mapbox-gl
const Map = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center bg-zinc-950">
      <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

export default function Home() {
  const [selectedSchool, setSelectedSchool] = useState<string | null>(null);
  const [flyTo, setFlyTo] = useState<{ lng: number; lat: number; zoom?: number } | null>(null);

  const handleSchoolSelect = useCallback((school: School | MapSchool) => {
    setSelectedSchool(school.id);
    setFlyTo({
      lng: school.longitude,
      lat: school.latitude,
      zoom: 14,
    });
  }, []);

  const handleMapSchoolClick = useCallback((school: MapSchool) => {
    setSelectedSchool(school.id);
  }, []);

  return (
    <div className="relative h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* Map */}
      <Map onSchoolClick={handleMapSchoolClick} flyTo={flyTo} />

      {/* Search overlay */}
      <div className="absolute top-4 left-4 right-4 sm:left-1/2 sm:-translate-x-1/2 sm:right-auto z-30">
        <SearchBar
          onSchoolSelect={handleSchoolSelect}
        />
      </div>

      {/* Explore Panel */}
      <div className="absolute top-20 left-4 z-30 hidden sm:block">
        <ExplorePanel onSchoolSelect={handleSchoolSelect} />
      </div>

      {/* Stats Bar */}
      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-30 hidden sm:block">
        <StatsBar />
      </div>

      {/* Legend */}
      <div className="absolute bottom-6 left-4 z-30 bg-zinc-900/60 backdrop-blur-xl border border-zinc-700/30 rounded-xl p-3 hidden sm:block shadow-2xl">
        <div className="flex flex-col gap-1.5 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#00ffaa", boxShadow: "0 0 4px #00ffaa" }} />
            <span className="text-zinc-400">Public</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#bf5fff", boxShadow: "0 0 4px #bf5fff" }} />
            <span className="text-zinc-400">Private Non-Profit</span>
          </div>
        </div>
      </div>

      {/* School Panel */}
      {selectedSchool && (
        <SchoolPanel
          schoolId={selectedSchool}
          onClose={() => setSelectedSchool(null)}
        />
      )}
    </div>
  );
}
