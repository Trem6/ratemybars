"use client";

import Link from "next/link";
import { Star, ThumbsUp, ThumbsDown, MapPin, Beer, Music, Users, PartyPopper, HelpCircle } from "lucide-react";

interface VenueCardProps {
  venue: {
    id: string;
    name: string;
    category: string;
    description?: string;
    address?: string;
    avg_rating: number;
    rating_count: number;
    thumbs_up?: number;
    thumbs_down?: number;
    verified: boolean;
  };
  compact?: boolean;
}

const categoryIcons: Record<string, React.ReactNode> = {
  bar: <Beer size={14} />,
  nightclub: <Music size={14} />,
  frat: <Users size={14} />,
  party_host: <PartyPopper size={14} />,
  other: <HelpCircle size={14} />,
};

const categoryLabels: Record<string, string> = {
  bar: "Bar",
  nightclub: "Nightclub",
  frat: "Frat",
  party_host: "Party Host",
  other: "Other",
};

const categoryColors: Record<string, string> = {
  bar: "text-amber-400 bg-amber-500/10",
  nightclub: "text-fuchsia-400 bg-fuchsia-500/10",
  frat: "text-blue-400 bg-blue-500/10",
  party_host: "text-emerald-400 bg-emerald-500/10",
  other: "text-zinc-400 bg-zinc-500/10",
};

function VenueRating({ rating, thumbsUp, thumbsDown }: { rating: number; thumbsUp?: number; thumbsDown?: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-0.5">
        <Star size={12} className={rating > 0 ? "text-amber-400 fill-amber-400" : "text-zinc-600"} />
        <span className="text-xs text-zinc-400">{rating > 0 ? rating.toFixed(1) : "N/A"}</span>
      </div>
      <div className="flex items-center gap-1.5 text-[10px]">
        <span className="flex items-center gap-0.5 text-emerald-400">
          <ThumbsUp size={10} fill="currentColor" />
          {thumbsUp || 0}
        </span>
        <span className="flex items-center gap-0.5 text-red-400">
          <ThumbsDown size={10} fill="currentColor" />
          {thumbsDown || 0}
        </span>
      </div>
    </div>
  );
}

export default function VenueCard({ venue, compact = false }: VenueCardProps) {
  if (compact) {
    return (
      <Link
        href={`/venue/${venue.id}`}
        className="block p-3 bg-zinc-900/60 backdrop-blur-xl hover:bg-zinc-800/60 border border-zinc-700/30 hover:border-violet-500/20 hover:shadow-lg hover:shadow-violet-500/5 rounded-xl transition-all group"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs ${categoryColors[venue.category] || categoryColors.other}`}>
                {categoryIcons[venue.category] || categoryIcons.other}
                {categoryLabels[venue.category] || "Other"}
              </span>
              {venue.verified && (
                <span className="text-emerald-400 text-xs">Verified</span>
              )}
            </div>
            <h4 className="text-sm font-medium text-white mt-1 truncate group-hover:text-violet-300 transition-colors">
              {venue.name}
            </h4>
          </div>
          <VenueRating rating={venue.avg_rating} thumbsUp={venue.thumbs_up} thumbsDown={venue.thumbs_down} />
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/venue/${venue.id}`}
      className="block p-4 bg-zinc-900/60 backdrop-blur-xl hover:bg-zinc-800/60 border border-zinc-700/30 hover:border-violet-500/20 hover:shadow-lg hover:shadow-violet-500/5 rounded-xl transition-all group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${categoryColors[venue.category] || categoryColors.other}`}>
              {categoryIcons[venue.category] || categoryIcons.other}
              {categoryLabels[venue.category] || "Other"}
            </span>
            {venue.verified && (
              <span className="text-emerald-400 text-xs">Verified</span>
            )}
          </div>
          <h3 className="text-base font-semibold text-white group-hover:text-violet-300 transition-colors">
            {venue.name}
          </h3>
          {venue.description && (
            <p className="text-sm text-zinc-400 mt-1 line-clamp-2">{venue.description}</p>
          )}
          {venue.address && (
            <div className="flex items-center gap-1 mt-2 text-xs text-zinc-500">
              <MapPin size={12} />
              {venue.address}
            </div>
          )}
        </div>
        <div className="shrink-0">
          <VenueRating rating={venue.avg_rating} thumbsUp={venue.thumbs_up} thumbsDown={venue.thumbs_down} />
        </div>
      </div>
    </Link>
  );
}
