"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin, Globe, Plus, GraduationCap } from "lucide-react";
import { getSchool, getSchoolVenues, type School, type Venue } from "@/lib/api";
import VenueCard from "@/components/VenueCard";

export default function SchoolPage() {
  const params = useParams();
  const id = params.id as string;
  const [school, setSchool] = useState<School | null>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async (schoolId: string) => {
    try {
      const [s, v] = await Promise.all([getSchool(schoolId), getSchoolVenues(schoolId)]);
      setSchool(s);
      setVenues(v.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(id);
  }, [id, fetchData]);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!school) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-400">School not found</p>
          <Link href="/" className="text-violet-400 hover:text-violet-300 mt-2 inline-block">
            Back to map
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-zinc-400 hover:text-white text-sm mb-6 transition-colors"
      >
        <ArrowLeft size={16} />
        Back to map
      </Link>

      {/* School Header */}
      <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-6 mb-8">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shrink-0">
            <GraduationCap size={28} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-white">{school.name}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span
                className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  school.control === "public"
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "bg-blue-500/10 text-blue-400"
                }`}
              >
                {school.control === "public" ? "Public" : "Private Non-Profit"}
              </span>
              <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-800 text-zinc-300">
                4-Year
              </span>
            </div>

            <div className="mt-4 space-y-2">
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
            </div>
          </div>
        </div>
      </div>

      {/* Venues */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">
          Venues & Party Spots
          {venues.length > 0 && (
            <span className="text-zinc-500 font-normal ml-1">({venues.length})</span>
          )}
        </h2>
        <Link
          href={`/submit?school=${id}`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors"
        >
          <Plus size={14} />
          Add Venue
        </Link>
      </div>

      {venues.length === 0 ? (
        <div className="text-center py-12 bg-zinc-900/50 border border-zinc-800/50 rounded-xl">
          <GraduationCap size={32} className="mx-auto text-zinc-600 mb-3" />
          <p className="text-zinc-400">No venues listed yet</p>
          <p className="text-zinc-500 text-sm mt-1">Be the first to add a party spot!</p>
          <Link
            href={`/submit?school=${id}`}
            className="inline-flex items-center gap-1 mt-4 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus size={14} />
            Add a Venue
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {venues.map((venue) => (
            <VenueCard key={venue.id} venue={venue} />
          ))}
        </div>
      )}
    </div>
  );
}
