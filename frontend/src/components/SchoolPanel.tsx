"use client";

import { useEffect, useState, useCallback } from "react";
import { X, MapPin, Globe, Star, ChevronRight, ExternalLink } from "lucide-react";
import Link from "next/link";
import { getSchool, getSchoolVenues, type School, type Venue } from "@/lib/api";
import { useToast } from "@/lib/toast-context";
import { SchoolPanelSkeleton } from "./Skeleton";
import VenueCard from "./VenueCard";
import TierBadge, { TierTag } from "./TierBadge";
import PartyGauge from "./PartyGauge";

interface SchoolPanelProps {
  schoolId: string;
  onClose: () => void;
}

export default function SchoolPanel({ schoolId, onClose }: SchoolPanelProps) {
  const [school, setSchool] = useState<School | null>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const fetchData = useCallback(async (id: string) => {
    try {
      const [s, v] = await Promise.all([
        getSchool(id),
        getSchoolVenues(id),
      ]);
      setSchool(s);
      setVenues(v.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(schoolId);
  }, [schoolId, fetchData]);

  if (loading) {
    return <SchoolPanelSkeleton />;
  }

  if (!school) return null;

  return (
    <div className="fixed right-0 top-14 bottom-0 w-full sm:w-96 bg-zinc-950/80 backdrop-blur-2xl border-l border-zinc-700/30 z-40 overflow-y-auto animate-slide-in">
      {/* Header */}
      <div className="sticky top-0 bg-zinc-950/70 backdrop-blur-xl border-b border-zinc-700/30 p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <Link href={`/school/${schoolId}`} className="text-lg font-bold text-white truncate block hover:text-violet-300 transition-colors">
              {school.name}
            </Link>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                  school.control === "public"
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "bg-blue-500/10 text-blue-400"
                }`}
              >
                {school.control === "public" ? "Public" : "Private"}
              </span>
              <TierTag venueCount={school.venue_count} avgRating={school.avg_rating || 0} />
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors ml-2"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Details */}
      <div className="p-4 space-y-4">
        <div className="space-y-2">
          <div className="flex items-start gap-2 text-sm text-zinc-400">
            <MapPin size={16} className="mt-0.5 shrink-0" />
            <span>
              {school.address}, {school.city}, {school.state} {school.zip}
            </span>
          </div>
          {school.website && (
            <div className="flex items-center gap-2 text-sm">
              <Globe size={16} className="text-zinc-400 shrink-0" />
              <a
                href={school.website.startsWith("http") ? school.website : `https://${school.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-violet-400 hover:text-violet-300 truncate transition-colors"
              >
                {school.website.replace(/^https?:\/\/(www\.)?/, "")}
              </a>
            </div>
          )}
          {school.county && (
            <div className="text-sm text-zinc-500">
              {school.county}
            </div>
          )}
        </div>

        {/* Party Score + Tier */}
        <div className="flex items-center gap-4 py-3 px-2">
          <TierBadge venueCount={school.venue_count} avgRating={school.avg_rating || 0} size="md" />
          <PartyGauge venueCount={school.venue_count} avgRating={school.avg_rating || 0} />
        </div>

        {/* View Full Page Link */}
        <Link
          href={`/school/${schoolId}`}
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-medium text-violet-400 hover:text-white border border-zinc-700/30 hover:border-violet-500/30 hover:bg-violet-500/10 transition-all"
        >
          <ExternalLink size={14} />
          View Full Page
        </Link>

        {/* Venues Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white">
              Venues & Parties
              {venues.length > 0 && (
                <span className="text-zinc-500 font-normal ml-1">({venues.length})</span>
              )}
            </h3>
            <Link
              href={`/submit?school=${schoolId}`}
              onClick={() => showToast("Taking you to add a venue!", "info")}
              className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-0.5 transition-colors"
            >
              Add <ChevronRight size={12} />
            </Link>
          </div>

          {venues.length === 0 ? (
            <div className="text-center py-8 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
              <Star size={24} className="mx-auto text-zinc-600 mb-2" />
              <p className="text-zinc-500 text-sm">No venues yet</p>
              <Link
                href={`/submit?school=${schoolId}`}
                onClick={() => showToast("Be a trailblazer! Add the first venue.", "success")}
                className="inline-flex mt-2 text-xs text-violet-400 hover:text-violet-300"
              >
                Be the first to add one
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {venues.map((venue) => (
                <VenueCard key={venue.id} venue={venue} compact />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
