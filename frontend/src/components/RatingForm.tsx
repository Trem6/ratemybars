"use client";

import { useState } from "react";
import { ThumbsUp, ThumbsDown, Send } from "lucide-react";
import { createRating } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";

interface RatingFormProps {
  venueId: string;
  onRatingSubmitted?: () => void;
}

export default function RatingForm({ venueId, onRatingSubmitted }: RatingFormProps) {
  const { user } = useAuth();
  const [vote, setVote] = useState<"up" | "down" | null>(null);
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
        <p className="text-emerald-400 text-sm font-medium">Vote submitted!</p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vote) {
      setError("Please vote thumbs up or thumbs down");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await createRating({ score: vote === "up" ? 5 : 1, review, venue_id: venueId });
      setSuccess(true);
      onRatingSubmitted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit vote");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-zinc-900/50 border border-zinc-800/50 rounded-xl space-y-3">
      <h4 className="text-sm font-semibold text-white">What do you think?</h4>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setVote("up")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all border ${
            vote === "up"
              ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-lg shadow-emerald-500/10"
              : "bg-zinc-800/50 border-zinc-700/50 text-zinc-400 hover:bg-zinc-800 hover:text-emerald-400"
          }`}
        >
          <ThumbsUp size={18} className={vote === "up" ? "fill-emerald-400" : ""} />
          <span>Upvote</span>
        </button>
        <button
          type="button"
          onClick={() => setVote("down")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all border ${
            vote === "down"
              ? "bg-red-500/20 border-red-500/50 text-red-400 shadow-lg shadow-red-500/10"
              : "bg-zinc-800/50 border-zinc-700/50 text-zinc-400 hover:bg-zinc-800 hover:text-red-400"
          }`}
        >
          <ThumbsDown size={18} className={vote === "down" ? "fill-red-400" : ""} />
          <span>Downvote</span>
        </button>
      </div>

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
        disabled={submitting || !vote}
        className="flex items-center justify-center gap-2 w-full py-2 bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm font-medium rounded-lg transition-colors"
      >
        <Send size={14} />
        {submitting ? "Submitting..." : "Submit"}
      </button>
    </form>
  );
}
