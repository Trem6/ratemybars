"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  MapPin,
  Globe,
  Plus,
  Building2,
  Map as MapIcon,
  Star,
  Users,
  Clock,
  MessageSquare,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  getSchool,
  getSchoolVenues,
  getSchoolFraternities,
  getSchoolRatings,
  type School,
  type Venue,
  type FratWithRating,
  type Rating,
} from "@/lib/api";
import VenueCard from "@/components/VenueCard";
import FratCard from "@/components/FratCard";
import TierBadge from "@/components/TierBadge";
import PartyGauge from "@/components/PartyGauge";
import AnimatedStats from "@/components/AnimatedStats";

function MiniMap({ latitude, longitude }: { latitude: number; longitude: number }) {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let map: unknown;

    async function init() {
      const maplibregl = (await import("maplibre-gl")).default;

      if (!mapRef.current) return;

      const m = new maplibregl.Map({
        container: mapRef.current,
        style: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
        center: [longitude, latitude],
        zoom: 13,
        interactive: false,
        attributionControl: false,
      });

      m.on("load", () => {
        m.addSource("school-point", {
          type: "geojson",
          data: {
            type: "Feature",
            geometry: { type: "Point", coordinates: [longitude, latitude] },
            properties: {},
          },
        });

        m.addLayer({
          id: "school-glow",
          type: "circle",
          source: "school-point",
          paint: {
            "circle-radius": 16,
            "circle-color": "#bf5fff",
            "circle-opacity": 0.15,
            "circle-blur": 1,
          },
        });

        m.addLayer({
          id: "school-dot",
          type: "circle",
          source: "school-point",
          paint: {
            "circle-radius": 6,
            "circle-color": "#bf5fff",
            "circle-stroke-width": 2,
            "circle-stroke-color": "#ffffff",
          },
        });
      });

      map = m;
    }

    init();

    return () => {
      if (map && typeof (map as { remove: () => void }).remove === "function") {
        (map as { remove: () => void }).remove();
      }
    };
  }, [latitude, longitude]);

  return (
    <div
      ref={mapRef}
      className="w-full h-full rounded-xl overflow-hidden"
    />
  );
}

function useFadeIn() {
  const refs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
          }
        });
      },
      { threshold: 0.1 }
    );

    refs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const setRef = (index: number) => (el: HTMLElement | null) => {
    refs.current[index] = el;
  };

  return setRef;
}

function ReviewCard({ rating, venueName }: { rating: Rating; venueName?: string }) {
  return (
    <div className="p-4 bg-zinc-900/60 backdrop-blur-xl border border-zinc-700/30 rounded-xl hover:border-violet-500/20 transition-all">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-xs font-bold text-white">
            {(rating.author_name || "A")[0].toUpperCase()}
          </div>
          <div>
            <span className="text-sm font-medium text-white">
              {rating.author_name || "Anonymous"}
            </span>
            {venueName && (
              <p className="text-xs text-zinc-500">
                on <span className="text-violet-400">{venueName}</span>
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <Star
              key={i}
              size={12}
              className={
                i <= Math.round(rating.score)
                  ? "text-amber-400 fill-amber-400"
                  : "text-zinc-600"
              }
            />
          ))}
        </div>
      </div>
      {rating.review && (
        <p className="text-zinc-300 text-sm leading-relaxed">{rating.review}</p>
      )}
      <div className="flex items-center gap-1 mt-2 text-xs text-zinc-500">
        <Clock size={11} />
        {new Date(rating.created_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </div>
    </div>
  );
}

function QuickStat({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-zinc-900/60 backdrop-blur-xl border border-zinc-700/30 rounded-xl">
      <div className={`p-2 rounded-lg ${color}`}>{icon}</div>
      <div>
        <p className="text-lg font-bold text-white leading-tight">{value}</p>
        <p className="text-xs text-zinc-500">{label}</p>
      </div>
    </div>
  );
}

export default function SchoolPage() {
  const params = useParams();
  const id = params.id as string;
  const [school, setSchool] = useState<School | null>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [fraternities, setFraternities] = useState<FratWithRating[]>([]);
  const [reviews, setReviews] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const setRef = useFadeIn();

  const fetchData = useCallback(async (schoolId: string) => {
    try {
      const s = await getSchool(schoolId);
      setSchool(s);

      const [v, f, r] = await Promise.allSettled([
        getSchoolVenues(schoolId),
        getSchoolFraternities(schoolId),
        getSchoolRatings(schoolId),
      ]);
      setVenues(v.status === "fulfilled" ? v.value.data || [] : []);
      setFraternities(f.status === "fulfilled" ? f.value || [] : []);
      setReviews(r.status === "fulfilled" ? r.value || [] : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshFrats = useCallback(() => {
    getSchoolFraternities(id)
      .then((f) => setFraternities(f || []))
      .catch(console.error);
  }, [id]);

  const refreshAll = useCallback(() => {
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

  const isPublic = school.control === "public";
  const isForProfit = school.control === "private_forprofit";

  const totalReviews = venues.reduce((sum, v) => sum + v.rating_count, 0);
  const topVenue = venues.length > 0
    ? [...venues].sort((a, b) => b.avg_rating - a.avg_rating)[0]
    : null;

  const venuesByName: Record<string, string> = {};
  for (const v of venues) {
    venuesByName[v.id] = v.name;
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)]">
      {/* Gradient Hero */}
      <div
        className="relative overflow-hidden"
        style={{
          background: isPublic
            ? "linear-gradient(135deg, #064e3b 0%, #0a0a0a 50%, #0a0a0a 100%)"
            : isForProfit
            ? "linear-gradient(135deg, #7f1d1d 0%, #0a0a0a 50%, #0a0a0a 100%)"
            : "linear-gradient(135deg, #3b0764 0%, #0a0a0a 50%, #0a0a0a 100%)",
        }}
      >
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        <div className="relative max-w-4xl mx-auto px-4 pt-6 pb-10">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-zinc-400 hover:text-white text-sm mb-6 transition-colors"
          >
            <ArrowLeft size={16} />
            Back to map
          </Link>

          <div className="flex flex-col sm:flex-row gap-6 animate-fade-in-up">
            <div className="shrink-0">
              <TierBadge
                venueCount={school.venue_count}
                avgRating={school.avg_rating || 0}
                size="lg"
              />
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="text-3xl font-bold text-white leading-tight">
                {school.name}
              </h1>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <span
                  className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                    isPublic
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                      : isForProfit
                      ? "bg-red-500/15 text-red-400 border border-red-500/20"
                      : "bg-violet-500/15 text-violet-400 border border-violet-500/20"
                  }`}
                >
                  {isPublic ? "Public" : isForProfit ? "Private For-Profit" : "Private Non-Profit"}
                </span>
                <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-zinc-800/80 text-zinc-300 border border-zinc-700/30">
                  {school.iclevel === 2 ? "2-Year Institution" : "4-Year Institution"}
                </span>
              </div>
              {/* Address inline */}
              <div className="flex items-center gap-1.5 mt-3 text-sm text-zinc-400">
                <MapPin size={14} className="shrink-0" />
                <span>{school.city}, {school.state} {school.zip}</span>
              </div>
            </div>

            <div className="hidden sm:block shrink-0">
              <PartyGauge
                venueCount={school.venue_count}
                avgRating={school.avg_rating || 0}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Quick Stats Row */}
        <div
          ref={setRef(0)}
          className="fade-in-section grid grid-cols-2 sm:grid-cols-4 gap-3"
        >
          <QuickStat
            icon={<Building2 size={18} className="text-violet-400" />}
            label="Venues"
            value={venues.length}
            color="bg-violet-500/10"
          />
          <QuickStat
            icon={<MessageSquare size={18} className="text-amber-400" />}
            label="Reviews"
            value={totalReviews}
            color="bg-amber-500/10"
          />
          <QuickStat
            icon={<Users size={18} className="text-blue-400" />}
            label="Greek Life"
            value={fraternities.length}
            color="bg-blue-500/10"
          />
          <QuickStat
            icon={<TrendingUp size={18} className="text-emerald-400" />}
            label="Avg Rating"
            value={school.avg_rating ? school.avg_rating.toFixed(1) : "N/A"}
            color="bg-emerald-500/10"
          />
        </div>

        {/* Mobile Party Gauge */}
        <div className="sm:hidden flex justify-center">
          <PartyGauge
            venueCount={school.venue_count}
            avgRating={school.avg_rating || 0}
          />
        </div>

        {/* Info Grid */}
        <div
          ref={setRef(1)}
          className="fade-in-section grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-700/30 rounded-xl p-4 hover:border-violet-500/20 hover:shadow-lg hover:shadow-violet-500/5 transition-all">
            <div className="flex items-center gap-2 mb-2">
              <MapPin size={16} className="text-zinc-400" />
              <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Address
              </span>
            </div>
            {school.address && (
              <p className="text-sm text-white leading-relaxed">
                {school.address}
              </p>
            )}
            <p className="text-sm text-zinc-400">
              {school.city}, {school.state} {school.zip}
              {school.county && <span className="text-zinc-500"> &middot; {school.county}</span>}
            </p>
          </div>

          <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-700/30 rounded-xl p-4 hover:border-violet-500/20 hover:shadow-lg hover:shadow-violet-500/5 transition-all">
            <div className="flex items-center gap-2 mb-2">
              <Globe size={16} className="text-zinc-400" />
              <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Website
              </span>
            </div>
            {school.website ? (
              <a
                href={school.website.startsWith("http") ? school.website : `https://${school.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-violet-400 hover:text-violet-300 transition-colors break-all"
              >
                {school.website.replace(/^https?:\/\/(www\.)?/, "")}
              </a>
            ) : (
              <p className="text-sm text-zinc-500">Not available</p>
            )}
          </div>
        </div>

        {/* Mini Map */}
        <div
          ref={setRef(2)}
          className="fade-in-section bg-zinc-900/60 backdrop-blur-xl border border-zinc-700/30 rounded-xl overflow-hidden hover:border-violet-500/20 transition-all"
        >
          <div className="flex items-center gap-2 px-4 pt-4 pb-2">
            <MapIcon size={16} className="text-zinc-400" />
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Location
            </span>
          </div>
          <div className="h-48 sm:h-56 px-4 pb-4">
            <MiniMap latitude={school.latitude} longitude={school.longitude} />
          </div>
        </div>

        {/* Animated Stats */}
        {venues.length > 0 && (
          <div ref={setRef(3)} className="fade-in-section">
            <AnimatedStats venues={venues} />
          </div>
        )}

        {/* Top Venue Highlight */}
        {topVenue && topVenue.avg_rating > 0 && (
          <div ref={setRef(4)} className="fade-in-section">
            <Link
              href={`/venue/${topVenue.id}`}
              className="block p-5 bg-gradient-to-r from-amber-500/5 via-zinc-900/60 to-zinc-900/60 backdrop-blur-xl border border-amber-500/20 rounded-xl hover:border-amber-500/40 transition-all group"
            >
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={16} className="text-amber-400" />
                <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                  Top Rated Venue
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white group-hover:text-amber-300 transition-colors">
                    {topVenue.name}
                  </h3>
                  <p className="text-sm text-zinc-400 mt-0.5">{topVenue.rating_count} reviews</p>
                </div>
                <div className="flex items-center gap-1">
                  <Star size={20} className="text-amber-400 fill-amber-400" />
                  <span className="text-2xl font-bold text-amber-400">
                    {topVenue.avg_rating.toFixed(1)}
                  </span>
                </div>
              </div>
            </Link>
          </div>
        )}

        {/* Greek Life Section */}
        {fraternities.length > 0 && (
          <div ref={setRef(5)} className="fade-in-section">
            <div className="flex items-center gap-2.5 mb-4">
              <Users size={20} className="text-blue-400" />
              <h2 className="text-xl font-bold text-white">
                Greek Life
                <span className="text-zinc-500 font-normal ml-2 text-base">
                  ({fraternities.length})
                </span>
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {fraternities.map((frat) => (
                <FratCard
                  key={frat.name}
                  frat={frat}
                  schoolId={id}
                  onRated={refreshFrats}
                />
              ))}
            </div>
          </div>
        )}

        {/* Venues Section */}
        <div ref={setRef(6)} className="fade-in-section">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold text-white">
              Venues & Party Spots
              {venues.length > 0 && (
                <span className="text-zinc-500 font-normal ml-2 text-base">
                  ({venues.length})
                </span>
              )}
            </h2>
            <Link
              href={`/submit?school=${id}`}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white text-sm font-semibold transition-all shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30"
            >
              <Plus size={15} strokeWidth={2.5} />
              Add Venue
            </Link>
          </div>

          {venues.length === 0 ? (
            <div className="text-center py-16 bg-zinc-900/60 backdrop-blur-xl border border-zinc-700/30 rounded-2xl">
              <div
                className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4 ${
                  isPublic ? "bg-emerald-500/10" : isForProfit ? "bg-red-500/10" : "bg-violet-500/10"
                }`}
              >
                <Star
                  size={28}
                  className={isPublic ? "text-emerald-500/50" : isForProfit ? "text-red-500/50" : "text-violet-500/50"}
                />
              </div>
              <p className="text-zinc-300 font-medium text-lg">No venues yet</p>
              <p className="text-zinc-500 text-sm mt-1 max-w-xs mx-auto">
                Be the first to share a party spot at {school.name}
              </p>
              <Link
                href={`/submit?school=${id}`}
                className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-violet-500/20"
              >
                <Plus size={15} strokeWidth={2.5} />
                Add a Venue
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {venues.map((venue) => (
                <VenueCard key={venue.id} venue={venue} />
              ))}
            </div>
          )}
        </div>

        {/* Recent Reviews Section */}
        {reviews.length > 0 && (
          <div ref={setRef(7)} className="fade-in-section">
            <div className="flex items-center gap-2.5 mb-4">
              <MessageSquare size={20} className="text-amber-400" />
              <h2 className="text-xl font-bold text-white">
                Recent Reviews
                <span className="text-zinc-500 font-normal ml-2 text-base">
                  ({reviews.length})
                </span>
              </h2>
            </div>
            <div className="space-y-3">
              {reviews.map((review) => (
                <ReviewCard
                  key={review.id}
                  rating={review}
                  venueName={venuesByName[review.venue_id]}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
