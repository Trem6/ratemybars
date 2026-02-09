"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Send, Search } from "lucide-react";
import { createVenue, searchSchools, type School } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

function SubmitForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [schoolId, setSchoolId] = useState(searchParams.get("school") || "");
  const [schoolQuery, setSchoolQuery] = useState("");
  const [schoolResults, setSchoolResults] = useState<School[]>([]);
  const [selectedSchoolName, setSelectedSchoolName] = useState("");
  const [showSchoolSearch, setShowSchoolSearch] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Search schools
  useEffect(() => {
    if (schoolQuery.length < 2) {
      setSchoolResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await searchSchools({ q: schoolQuery, limit: "5", page: "1" });
        setSchoolResults(res.data || []);
      } catch {
        setSchoolResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [schoolQuery]);

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-white mb-4">Login Required</h1>
        <p className="text-zinc-400 mb-6">You need to be logged in to submit a venue.</p>
        <Link
          href="/auth/login"
          className="inline-flex px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-xl transition-colors"
        >
          Login
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name || !category || !schoolId) {
      setError("Name, category, and school are required");
      return;
    }

    setSubmitting(true);
    try {
      const venue = await createVenue({
        name,
        category,
        description,
        address,
        school_id: schoolId,
      });
      router.push(`/venue/${venue.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit venue");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-zinc-400 hover:text-white text-sm mb-6 transition-colors"
      >
        <ArrowLeft size={16} />
        Back to map
      </Link>

      <h1 className="text-2xl font-bold text-white mb-2">Add a Venue</h1>
      <p className="text-zinc-400 text-sm mb-8">
        Submit a bar, nightclub, frat, or party venue near a college.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        {/* School Selector */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">
            School <span className="text-red-400">*</span>
          </label>
          {schoolId && selectedSchoolName ? (
            <div className="flex items-center justify-between p-3 bg-zinc-900 border border-zinc-800 rounded-xl">
              <span className="text-white text-sm">{selectedSchoolName}</span>
              <button
                type="button"
                onClick={() => {
                  setSchoolId("");
                  setSelectedSchoolName("");
                  setShowSchoolSearch(true);
                }}
                className="text-xs text-violet-400 hover:text-violet-300"
              >
                Change
              </button>
            </div>
          ) : (
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={schoolQuery}
                onChange={(e) => {
                  setSchoolQuery(e.target.value);
                  setShowSchoolSearch(true);
                }}
                placeholder="Search for a school..."
                className="w-full pl-9 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-violet-500 transition-colors"
              />
              {showSchoolSearch && schoolResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-zinc-700/50 rounded-xl overflow-hidden z-10 max-h-48 overflow-y-auto">
                  {schoolResults.map((school) => (
                    <button
                      key={school.id}
                      type="button"
                      onClick={() => {
                        setSchoolId(school.id);
                        setSelectedSchoolName(school.name);
                        setSchoolQuery("");
                        setShowSchoolSearch(false);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-zinc-800 text-sm text-white border-b border-zinc-800/50 last:border-0"
                    >
                      {school.name}
                      <span className="text-zinc-500 ml-1">
                        ({school.city}, {school.state})
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Venue Name */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">
            Venue Name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. The Rusty Nail, Sigma Chi, DJ Marcus"
            required
            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-violet-500 transition-colors"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">
            Category <span className="text-red-400">*</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { value: "bar", label: "Bar", emoji: "🍺" },
              { value: "nightclub", label: "Nightclub", emoji: "🎵" },
              { value: "frat", label: "Frat / Sorority", emoji: "🏛️" },
              { value: "party_host", label: "Party Host", emoji: "🎉" },
              { value: "other", label: "Other", emoji: "✨" },
            ].map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => setCategory(cat.value)}
                className={`px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                  category === cat.value
                    ? "bg-violet-600/20 border-violet-500 text-violet-300"
                    : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600"
                }`}
              >
                {cat.emoji} {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Tell people what to expect..."
            rows={3}
            maxLength={2000}
            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-violet-500 resize-none transition-colors"
          />
        </div>

        {/* Address */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">
            Address
          </label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Street address (optional)"
            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-violet-500 transition-colors"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="flex items-center justify-center gap-2 w-full py-3 bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-semibold rounded-xl transition-colors"
        >
          <Send size={16} />
          {submitting ? "Submitting..." : "Submit Venue"}
        </button>
      </form>
    </div>
  );
}

export default function SubmitPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <SubmitForm />
    </Suspense>
  );
}
