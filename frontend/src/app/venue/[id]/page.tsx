"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Star, ThumbsUp, ThumbsDown, MapPin, Beer, Music, Users, PartyPopper, HelpCircle, Clock } from "lucide-react";
import { getVenue, getVenueRatings, type Venue, type Rating } from "@/lib/api";
import RatingForm from "@/components/RatingForm";

const categoryConfig: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  bar: { icon: <Beer size={18} />, label: "Bar", color: "text-amber-400 bg-amber-500/10" },
  nightclub: { icon: <Music size={18} />, label: "Nightclub", color: "text-fuchsia-400 bg-fuchsia-500/10" },
  frat: { icon: <Users size={18} />, label: "Fraternity", color: "text-blue-400 bg-blue-500/10" },
  party_host: { icon: <PartyPopper size={18} />, label: "Party Host", color: "text-emerald-400 bg-emerald-500/10" },
  other: { icon: <HelpCircle size={18} />, label: "Other", color: "text-zinc-400 bg-zinc-500/10" },
};

export default function VenuePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [venue, setVenue] = useState<Venue | null>(null);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async (venueId: string) => {
    try {
      const [v, r] = await Promise.all([getVenue(venueId), getVenueRatings(venueId)]);
      setVenue(v);
      setRatings(r || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRatingSubmitted = useCallback(() => {
    fetchData(id);
  }, [id, fetchData]);

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

  if (!venue) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-400">Venue not found</p>
          <button onClick={() => router.back()} className="text-violet-400 hover:text-violet-300 mt-2 inline-block">
            Back to map
          </button>
        </div>
      </div>
    );
  }

  const cat = categoryConfig[venue.category] || categoryConfig.other;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Back link */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1 text-zinc-400 hover:text-white text-sm transition-colors"
        >
          <ArrowLeft size={16} />
          Back
        </button>
        {venue?.school_id && (
          <>
            <span className="text-zinc-600">/</span>
            <Link
              href={`/school/${venue.school_id}`}
              className="text-zinc-400 hover:text-white text-sm transition-colors"
            >
              {venue.school_name || "School"}
            </Link>
          </>
        )}
      </div>

      {/* Venue Header */}
      <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm ${cat.color}`}>
                {cat.icon}
                {cat.label}
              </span>
              {venue.verified && (
                <span className="text-emerald-400 text-xs font-medium">Verified</span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-white">{venue.name}</h1>
            {venue.school_name && (
              <p className="text-zinc-400 text-sm mt-1">
                at{" "}
                <Link href={`/school/${venue.school_id}`} className="text-violet-400 hover:text-violet-300 transition-colors">
                  {venue.school_name}
                </Link>
              </p>
            )}
          </div>
          <div className="text-right shrink-0 space-y-1.5">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={i}
                  size={16}
                  className={
                    i <= Math.round(venue.avg_rating)
                      ? "text-amber-400 fill-amber-400"
                      : "text-zinc-600"
                  }
                />
              ))}
              <span className="text-sm text-zinc-400 ml-1">
                {venue.avg_rating > 0 ? venue.avg_rating.toFixed(1) : "N/A"}
              </span>
            </div>
            <div className="flex items-center justify-end gap-3 text-xs">
              <span className="flex items-center gap-1 text-emerald-400">
                <ThumbsUp size={12} fill="currentColor" />
                {venue.thumbs_up || 0}
              </span>
              <span className="flex items-center gap-1 text-red-400">
                <ThumbsDown size={12} fill="currentColor" />
                {venue.thumbs_down || 0}
              </span>
              <span className="text-zinc-500">{venue.rating_count} votes</span>
            </div>
          </div>
        </div>

        {venue.description && (
          <p className="text-zinc-300 text-sm mt-4">{venue.description}</p>
        )}

        {venue.address && (
          <div className="flex items-center gap-2 mt-4 text-sm text-zinc-400">
            <MapPin size={16} />
            {venue.address}
          </div>
        )}
      </div>

      {/* Rating Form */}
      <div className="mb-6">
        <RatingForm venueId={id} onRatingSubmitted={handleRatingSubmitted} />
      </div>

      {/* Ratings List */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">
          Reviews
          {ratings.length > 0 && (
            <span className="text-zinc-500 font-normal ml-1">({ratings.length})</span>
          )}
        </h2>

        {ratings.length === 0 ? (
          <div className="text-center py-8 bg-zinc-900/50 border border-zinc-800/50 rounded-xl">
            <ThumbsUp size={24} className="mx-auto text-zinc-600 mb-2" />
            <p className="text-zinc-500 text-sm">No votes yet. Be the first!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {ratings.map((rating) => (
              <div
                key={rating.id}
                className="p-4 bg-zinc-900/50 border border-zinc-800/50 rounded-xl"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-xs font-bold text-white">
                      {(rating.author_name || "A")[0].toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-white">
                      {rating.author_name || "Anonymous"}
                    </span>
                  </div>
                  {rating.score >= 4 ? (
                    <span className="flex items-center gap-1 text-emerald-400 text-xs font-medium">
                      <ThumbsUp size={14} fill="currentColor" />
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-red-400 text-xs font-medium">
                      <ThumbsDown size={14} fill="currentColor" />
                    </span>
                  )}
                </div>
                {rating.review && (
                  <p className="text-zinc-300 text-sm">{rating.review}</p>
                )}
                <div className="flex items-center gap-1 mt-2 text-xs text-zinc-500">
                  <Clock size={12} />
                  {new Date(rating.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
