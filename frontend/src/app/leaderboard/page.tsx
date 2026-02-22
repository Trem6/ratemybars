"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Trophy,
  Crown,
  Medal,
  Star,
  ArrowLeft,
  Building2,
  MessageSquare,
  User,
  Flame,
} from "lucide-react";
import {
  getLeaderboardSchools,
  getLeaderboardUsers,
  type LeaderboardSchool,
  type LeaderboardUser,
} from "@/lib/api";

type Tab = "schools" | "users";

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
        <Crown size={18} className="text-white" />
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-zinc-300 to-zinc-500 flex items-center justify-center shadow-lg shadow-zinc-400/20">
        <Medal size={18} className="text-white" />
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center shadow-lg shadow-amber-700/20">
        <Medal size={18} className="text-white" />
      </div>
    );
  }
  return (
    <div className="w-9 h-9 rounded-xl bg-zinc-800/80 flex items-center justify-center border border-zinc-700/30">
      <span className="text-sm font-bold text-zinc-400">{rank}</span>
    </div>
  );
}

function ScoreBar({ score, maxScore }: { score: number; maxScore: number }) {
  const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;

  const getColor = (s: number) => {
    if (s >= 80) return "from-cyan-400 to-emerald-400";
    if (s >= 60) return "from-emerald-400 to-green-500";
    if (s >= 40) return "from-yellow-400 to-amber-500";
    if (s >= 20) return "from-orange-400 to-amber-600";
    return "from-red-400 to-red-600";
  };

  return (
    <div className="flex items-center gap-2 flex-1 min-w-0">
      <div className="flex-1 h-2 rounded-full bg-zinc-800/60 overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${getColor(score)} transition-all duration-700 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-sm font-bold text-white tabular-nums w-8 text-right">
        {score}
      </span>
    </div>
  );
}

export default function LeaderboardPage() {
  const [tab, setTab] = useState<Tab>("schools");
  const [schools, setSchools] = useState<LeaderboardSchool[]>([]);
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    if (tab === "schools") {
      getLeaderboardSchools()
        .then(setSchools)
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      getLeaderboardUsers()
        .then(setUsers)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [tab]);

  const maxPartyScore = schools.length > 0 ? schools[0].party_score : 100;
  const maxRatings = users.length > 0 ? users[0].rating_count : 1;

  return (
    <div className="min-h-[calc(100vh-3.5rem)]">
      {/* Hero */}
      <div
        className="relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, #78350f 0%, #0a0a0a 40%, #0a0a0a 100%)",
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
        <div className="relative max-w-3xl mx-auto px-4 pt-6 pb-10">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-zinc-400 hover:text-white text-sm mb-6 transition-colors"
          >
            <ArrowLeft size={16} />
            Back to map
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
              <Trophy size={28} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Leaderboard</h1>
              <p className="text-zinc-400 text-sm mt-0.5">
                Top party schools & most active contributors
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-zinc-900/60 backdrop-blur-xl border border-zinc-700/30 rounded-xl mb-6">
          <button
            onClick={() => setTab("schools")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              tab === "schools"
                ? "bg-violet-600 text-white shadow-lg shadow-violet-500/20"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
            }`}
          >
            <Flame size={16} />
            Top Party Schools
          </button>
          <button
            onClick={() => setTab("users")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              tab === "users"
                ? "bg-violet-600 text-white shadow-lg shadow-violet-500/20"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
            }`}
          >
            <User size={16} />
            Top Contributors
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-16 rounded-xl skeleton-shimmer"
              />
            ))}
          </div>
        ) : tab === "schools" ? (
          <div className="space-y-2">
            {schools.length === 0 ? (
              <div className="text-center py-16 bg-zinc-900/60 border border-zinc-700/30 rounded-2xl">
                <Trophy size={32} className="mx-auto text-zinc-600 mb-3" />
                <p className="text-zinc-400">No ranked schools yet</p>
                <p className="text-zinc-600 text-sm mt-1">
                  Add venues and ratings to get schools on the board
                </p>
              </div>
            ) : (
              schools.map((school) => (
                <Link
                  key={school.id}
                  href={`/school/${school.id}`}
                  className={`flex items-center gap-4 p-4 rounded-xl border transition-all group ${
                    school.rank <= 3
                      ? "bg-zinc-900/80 border-amber-500/15 hover:border-amber-500/30 hover:shadow-lg hover:shadow-amber-500/5"
                      : "bg-zinc-900/60 border-zinc-700/30 hover:border-violet-500/20 hover:shadow-lg hover:shadow-violet-500/5"
                  }`}
                >
                  <RankBadge rank={school.rank} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-white truncate group-hover:text-violet-300 transition-colors">
                        {school.name}
                      </h3>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
                      <span>{school.state}</span>
                      <span className="flex items-center gap-1">
                        <Building2 size={10} />
                        {school.venue_count} venues
                      </span>
                      <span className="flex items-center gap-1">
                        <Star size={10} />
                        {school.avg_rating > 0
                          ? school.avg_rating.toFixed(1)
                          : "N/A"}
                      </span>
                    </div>
                  </div>
                  <ScoreBar
                    score={school.party_score}
                    maxScore={maxPartyScore}
                  />
                </Link>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {users.length === 0 ? (
              <div className="text-center py-16 bg-zinc-900/60 border border-zinc-700/30 rounded-2xl">
                <User size={32} className="mx-auto text-zinc-600 mb-3" />
                <p className="text-zinc-400">No contributors yet</p>
                <p className="text-zinc-600 text-sm mt-1">
                  Be the first to review a venue!
                </p>
              </div>
            ) : (
              users.map((user) => (
                <div
                  key={user.username}
                  className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                    user.rank <= 3
                      ? "bg-zinc-900/80 border-amber-500/15"
                      : "bg-zinc-900/60 border-zinc-700/30"
                  }`}
                >
                  <RankBadge rank={user.rank} />
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-sm font-bold text-white shrink-0">
                      {user.username[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-white truncate">
                        {user.username}
                      </h3>
                      <p className="text-xs text-zinc-500 flex items-center gap-1">
                        <MessageSquare size={10} />
                        {user.rating_count} reviews
                      </p>
                    </div>
                  </div>
                  <div className="flex-1 max-w-[200px]">
                    <div className="h-2 rounded-full bg-zinc-800/60 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-700 ease-out"
                        style={{
                          width: `${(user.rating_count / maxRatings) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-bold text-white tabular-nums w-8 text-right">
                    {user.rating_count}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
