"use client";

import { useState } from "react";
import { Star, Send } from "lucide-react";
import { createRating } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";

interface RatingFormProps {
  venueId: string;
  onRatingSubmitted?: () => void;
}

export default function RatingForm({ venueId, onRatingSubmitted }: RatingFormProps) {
  const { user } = useAuth();
  const [score, setScore] = useState(0);
  const [hoverScore, setHoverScore] = useState(0);
  const [review, setReview] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  if (!user) {
    return (
      <div className="p-4 bg-zinc-900/50 border border-zinc-800/50 rounded-xl text-center">
        <p className="text-zinc-400 text-sm mb-2">Log in to leave a rating</p>
        <Link
          href="/auth/login"
          className="inline-flex px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Login
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
        <p className="text-emerald-400 text-sm font-medium">Rating submitted!</p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (score === 0) {
      setError("Please select a rating");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await createRating({ score, review, venue_id: venueId });
      setSuccess(true);
      onRatingSubmitted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit rating");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-zinc-900/50 border border-zinc-800/50 rounded-xl space-y-3">
      <h4 className="text-sm font-semibold text-white">Leave a Rating</h4>

      {/* Star selector */}
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            onClick={() => setScore(i)}
            onMouseEnter={() => setHoverScore(i)}
            onMouseLeave={() => setHoverScore(0)}
            className="p-0.5 transition-transform hover:scale-110"
          >
            <Star
              size={28}
              className={`transition-colors ${
                i <= (hoverScore || score)
                  ? "text-amber-400 fill-amber-400"
                  : "text-zinc-600 hover:text-zinc-500"
              }`}
            />
          </button>
        ))}
        {score > 0 && (
          <span className="text-sm text-zinc-400 ml-2">{score}/5</span>
        )}
      </div>

      {/* Review text */}
      <textarea
        value={review}
        onChange={(e) => setReview(e.target.value)}
        placeholder="Write a review (optional)..."
        maxLength={2000}
        rows={3}
        className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-violet-500 resize-none"
      />

      {error && (
        <p className="text-red-400 text-xs">{error}</p>
      )}

      <button
        type="submit"
        disabled={submitting || score === 0}
        className="flex items-center justify-center gap-2 w-full py-2 bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm font-medium rounded-lg transition-colors"
      >
        <Send size={14} />
        {submitting ? "Submitting..." : "Submit Rating"}
      </button>
    </form>
  );
}
