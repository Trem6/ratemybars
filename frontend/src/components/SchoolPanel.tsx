"use client";

import { useEffect, useState, useCallback } from "react";
import { X, MapPin, Globe, Star, ChevronRight, ExternalLink, Users } from "lucide-react";
import Link from "next/link";
import { getSchool, getSchoolVenues, getSchoolFraternities, type School, type Venue } from "@/lib/api";
import { useToast } from "@/lib/toast-context";
import { SchoolPanelSkeleton } from "./Skeleton";
import VenueCard from "./VenueCard";
import { TierTag } from "./TierBadge";
import PartyGauge from "./PartyGauge";

interface SchoolPanelProps {
  schoolId: string;
  onClose: () => void;
}

export default function SchoolPanel({ schoolId, onClose }: SchoolPanelProps) {
  const [school, setSchool] = useState<School | null>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [fraternities, setFraternities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const fetchData = useCallback(async (id: string) => {
    try {
      const [s, v, f] = await Promise.all([
        getSchool(id),
        getSchoolVenues(id),
        getSchoolFraternities(id),
      ]);
      setSchool(s);
      setVenues(v.data || []);
      setFraternities(f || []);
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

  const displayVenues = venues.slice(0, 3);
  const hasMoreVenues = venues.length > 3;

  return (
    <div className="fixed right-0 top-14 bottom-0 w-full sm:w-[480px] bg-zinc-950/90 backdrop-blur-2xl border-l border-zinc-700/30 z-40 overflow-y-auto animate-slide-in">
      {/* Header */}
      <div className="sticky top-0 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-700/30 px-5 py-4 z-10">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <Link href={`/school/${schoolId}`} className="text-lg font-bold text-white hover:text-violet-300 transition-colors line-clamp-2 leading-tight">
              {school.name}
            </Link>
            <div className="flex items-center gap-2 mt-2">
              <span
                className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                  school.control === "public"
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                }`}
              >
                {school.control === "public" ? "Public" : "Private"}
              </span>
              <TierTag venueCount={school.venue_count} avgRating={school.avg_rating || 0} />
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors shrink-0 -mr-1 -mt-1"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Compact Details */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <MapPin size={12} className="shrink-0 text-zinc-500" />
            <span className="truncate">{school.city}, {school.state} {school.zip}</span>
          </div>
          {school.website && (
            <div className="flex items-center gap-2 text-xs">
              <Globe size={12} className="text-zinc-500 shrink-0" />
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
        </div>

        {/* Compact Party Score */}
        <div className="flex items-center justify-center py-3 bg-zinc-900/40 rounded-xl border border-zinc-800/40">
          <PartyGauge venueCount={school.venue_count} avgRating={school.avg_rating || 0} size="sm" />
        </div>

        {/* Greek Life Section */}
        {fraternities.length > 0 && (
          <>
            <div className="h-px bg-zinc-800/60" />
            <div>
              <div className="flex items-center gap-2 mb-2.5">
                <Users size={14} className="text-blue-400" />
                <h3 className="text-sm font-semibold text-white">
                  Greek Life
                  <span className="text-zinc-500 font-normal ml-1.5">({fraternities.length})</span>
                </h3>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {fraternities.map((name) => (
                  <span
                    key={name}
                    className="inline-flex px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-500/8 text-blue-300 border border-blue-500/15 hover:bg-blue-500/15 transition-colors"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Divider */}
        <div className="h-px bg-zinc-800/60" />

        {/* Venues Section — show top 3 */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white">
              Venues & Parties
              {venues.length > 0 && (
                <span className="text-zinc-500 font-normal ml-1.5">({venues.length})</span>
              )}
            </h3>
            <Link
              href={`/submit?school=${schoolId}`}
              onClick={() => showToast("Taking you to add a venue!", "info")}
              className="text-xs font-medium text-violet-400 hover:text-violet-300 flex items-center gap-0.5 transition-colors"
            >
              Add <ChevronRight size={12} />
            </Link>
          </div>

          {venues.length === 0 ? (
            <div className="text-center py-8 bg-zinc-900/40 rounded-xl border border-zinc-800/40">
              <Star size={24} className="mx-auto text-zinc-700 mb-2" />
              <p className="text-zinc-400 text-sm">No venues yet</p>
              <Link
                href={`/submit?school=${schoolId}`}
                onClick={() => showToast("Be a trailblazer! Add the first venue.", "success")}
                className="inline-flex mt-1.5 text-xs text-violet-400 hover:text-violet-300 transition-colors"
              >
                Be the first to add one
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {displayVenues.map((venue) => (
                <VenueCard key={venue.id} venue={venue} compact />
              ))}
              {hasMoreVenues && (
                <Link
                  href={`/school/${schoolId}`}
                  className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl text-xs font-medium text-zinc-400 hover:text-white border border-zinc-800/40 hover:border-zinc-700/60 hover:bg-zinc-900/40 transition-all"
                >
                  See All {venues.length} Venues
                  <ChevronRight size={12} />
                </Link>
              )}
            </div>
          )}
        </div>

        {/* View Full Page */}
        <Link
          href={`/school/${schoolId}`}
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold text-violet-400 hover:text-white border border-zinc-700/30 hover:border-violet-500/40 hover:bg-violet-500/10 transition-all"
        >
          <ExternalLink size={14} />
          View Full Page
        </Link>
      </div>
    </div>
  );
}
