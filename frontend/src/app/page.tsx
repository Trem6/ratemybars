"use client";

import { useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import SearchBar from "@/components/SearchBar";
import SchoolPanel from "@/components/SchoolPanel";
import StatsBar from "@/components/StatsBar";
import ExplorePanel from "@/components/ExplorePanel";
import SplashScreen from "@/components/SplashScreen";
import { getSchoolsByFrat, DEFAULT_FILTERS, type School, type MapSchool, type FilterState } from "@/lib/api";

const Map = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 gap-4">
      <div className="w-16 h-16 rounded-2xl skeleton-shimmer" />
      <div className="w-24 h-3 rounded-lg skeleton-shimmer" />
    </div>
  ),
});

export default function Home() {
  const [selectedSchool, setSelectedSchool] = useState<string | null>(null);
  const [flyTo, setFlyTo] = useState<{ lng: number; lat: number; zoom?: number } | null>(null);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [selectedFrat, setSelectedFrat] = useState("");
  const [fratSchoolIds, setFratSchoolIds] = useState<string[] | undefined>(undefined);

  useEffect(() => {
    if (!selectedFrat) {
      setFratSchoolIds(undefined);
      return;
    }
    getSchoolsByFrat(selectedFrat)
      .then((ids) => setFratSchoolIds(ids || []))
      .catch(() => setFratSchoolIds(undefined));
  }, [selectedFrat]);

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

  const showPrivateNP = filters.controlTypes.includes("private_nonprofit");
  const showFP = filters.controlTypes.includes("private_forprofit");

  return (
    <div className="relative h-[calc(100vh-3.5rem)] overflow-hidden">
      <SplashScreen />

      <Map
        onSchoolClick={handleMapSchoolClick}
        flyTo={flyTo}
        filters={filters}
        fratSchoolIds={fratSchoolIds}
        highlightSchoolId={selectedSchool}
      />

      <div
        className={`absolute top-4 left-4 z-30 flex justify-center transition-all duration-300 ${
          selectedSchool
            ? "right-[500px] sm:left-[5%]"
            : "right-4 sm:left-[10%] sm:right-[10%]"
        }`}
      >
        <SearchBar
          onSchoolSelect={handleSchoolSelect}
          filters={filters}
          onFiltersChange={setFilters}
          selectedFrat={selectedFrat}
          onFratFilterChange={setSelectedFrat}
        />
      </div>

      <div className="absolute top-[4.5rem] left-4 z-30 hidden sm:block">
        <ExplorePanel onSchoolSelect={handleSchoolSelect} />
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 hidden sm:block">
        <StatsBar />
      </div>

      {/* Legend */}
      <div className="absolute bottom-6 left-4 z-30 bg-zinc-900/70 backdrop-blur-xl border border-zinc-700/30 rounded-xl px-3.5 py-2.5 hidden sm:block shadow-2xl">
        <div className="flex items-center gap-4 text-xs">
          {filters.controlTypes.includes("public") && (
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#00ffaa", boxShadow: "0 0 6px #00ffaa" }} />
              <span className="text-zinc-400">Public</span>
            </div>
          )}
          {showPrivateNP && (
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#bf5fff", boxShadow: "0 0 6px #bf5fff" }} />
              <span className="text-zinc-400">Private NP</span>
            </div>
          )}
          {showFP && (
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#ff6b6b", boxShadow: "0 0 6px #ff6b6b" }} />
              <span className="text-zinc-400">For-Profit</span>
            </div>
          )}
        </div>
      </div>

      {selectedSchool && (
        <SchoolPanel
          schoolId={selectedSchool}
          onClose={() => setSelectedSchool(null)}
        />
      )}
    </div>
  );
}
