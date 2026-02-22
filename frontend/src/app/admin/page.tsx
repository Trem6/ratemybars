"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import {
  getPendingVenues,
  approveVenue,
  rejectVenue,
  getAdminUsers,
  updateUserRole,
  searchSchools,
  getAllFraternities,
  getSchoolFraternities,
  adminAddFrat,
  adminRemoveFrat,
  type Venue,
  type AdminUser,
  type School,
  type FratWithRating,
} from "@/lib/api";
import { Shield, Check, X, ArrowLeft, Inbox, Users, ClipboardList, ShieldCheck, ShieldOff, Plus, Trash2, Search } from "lucide-react";

const CATEGORY_LABELS: Record<string, string> = {
  bar: "Bar",
  nightclub: "Nightclub",
  frat: "Frat / Sorority",
  party_host: "Party Host",
  other: "Other",
};

type Tab = "venues" | "users" | "fraternities";

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<Tab>("venues");
  const [venues, setVenues] = useState<Venue[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  const fetchPending = useCallback(async () => {
    try {
      const data = await getPendingVenues();
      setVenues(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load pending venues");
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const data = await getAdminUsers();
      setUsers(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    }
  }, []);

  useEffect(() => {
    if (user?.role === "admin") {
      setLoading(true);
      Promise.all([fetchPending(), fetchUsers()]).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [user, fetchPending, fetchUsers]);

  if (authLoading || loading) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <Shield size={48} className="text-zinc-600 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
        <p className="text-zinc-400 mb-6">You need admin privileges to access this page.</p>
        <Link
          href="/"
          className="inline-flex px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-xl transition-colors"
        >
          Back to Map
        </Link>
      </div>
    );
  }

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    setError("");
    try {
      await approveVenue(id);
      setVenues((prev) => prev.filter((v) => v.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve venue");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    setActionLoading(id);
    setError("");
    try {
      await rejectVenue(id);
      setVenues((prev) => prev.filter((v) => v.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject venue");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    setActionLoading(userId);
    setError("");
    try {
      await updateUserRole(userId, newRole);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update role");
    } finally {
      setActionLoading(null);
    }
  };

  // Fraternity management state
  const [glSchoolQuery, setGlSchoolQuery] = useState("");
  const [glSchoolResults, setGlSchoolResults] = useState<School[]>([]);
  const [glSelectedSchool, setGlSelectedSchool] = useState<School | null>(null);
  const [glFrats, setGlFrats] = useState<FratWithRating[]>([]);
  const [glAllFrats, setGlAllFrats] = useState<string[]>([]);
  const [glNewFrat, setGlNewFrat] = useState("");
  const [glFratSuggestions, setGlFratSuggestions] = useState<string[]>([]);
  const [glShowSuggestions, setGlShowSuggestions] = useState(false);
  const glSuggestRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (tab === "fraternities" && glAllFrats.length === 0) {
      getAllFraternities().then(setGlAllFrats).catch(console.error);
    }
  }, [tab, glAllFrats.length]);

  useEffect(() => {
    if (glSchoolQuery.length < 2) { setGlSchoolResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await searchSchools({ q: glSchoolQuery, limit: "5", page: "1" });
        setGlSchoolResults(res.data || []);
      } catch { setGlSchoolResults([]); }
    }, 300);
    return () => clearTimeout(t);
  }, [glSchoolQuery]);

  useEffect(() => {
    if (!glSelectedSchool) return;
    getSchoolFraternities(glSelectedSchool.id).then(setGlFrats).catch(console.error);
  }, [glSelectedSchool]);

  useEffect(() => {
    if (!glShowSuggestions) return;
    const handler = (e: MouseEvent) => {
      if (glSuggestRef.current && !glSuggestRef.current.contains(e.target as Node)) {
        setGlShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [glShowSuggestions]);

  const handleGlSelectSchool = (school: School) => {
    setGlSelectedSchool(school);
    setGlSchoolQuery(school.name);
    setGlSchoolResults([]);
  };

  const handleGlAddFrat = async () => {
    if (!glSelectedSchool || !glNewFrat.trim()) return;
    setActionLoading("add-frat");
    setError("");
    try {
      await adminAddFrat(glNewFrat.trim(), glSelectedSchool.id);
      const updated = await getSchoolFraternities(glSelectedSchool.id);
      setGlFrats(updated);
      setGlNewFrat("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add fraternity");
    } finally {
      setActionLoading(null);
    }
  };

  const handleGlRemoveFrat = async (fratName: string) => {
    if (!glSelectedSchool) return;
    setActionLoading(`rm-${fratName}`);
    setError("");
    try {
      await adminRemoveFrat(fratName, glSelectedSchool.id);
      setGlFrats((prev) => prev.filter((f) => f.name !== fratName));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove fraternity");
    } finally {
      setActionLoading(null);
    }
  };

  const filteredGlSuggestions = glNewFrat
    ? glAllFrats.filter((n) => n.toLowerCase().includes(glNewFrat.toLowerCase())).slice(0, 8)
    : [];

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-zinc-400 hover:text-white text-sm mb-6 transition-colors"
      >
        <ArrowLeft size={16} />
        Back to map
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-amber-600/20 border border-amber-600/30 flex items-center justify-center">
          <Shield size={20} className="text-amber-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
          <p className="text-zinc-400 text-sm">
            Manage venues, users &amp; fraternities
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-zinc-900/50 rounded-xl p-1 border border-zinc-800/50">
        <button
          onClick={() => setTab("venues")}
          className={`flex items-center gap-2 flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            tab === "venues"
              ? "bg-zinc-800 text-white"
              : "text-zinc-400 hover:text-zinc-300"
          }`}
        >
          <ClipboardList size={16} />
          Pending Venues
          {venues.length > 0 && (
            <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
              {venues.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("users")}
          className={`flex items-center gap-2 flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            tab === "users"
              ? "bg-zinc-800 text-white"
              : "text-zinc-400 hover:text-zinc-300"
          }`}
        >
          <Users size={16} />
          Users
          <span className="ml-auto text-xs text-zinc-500">{users.length}</span>
        </button>
        <button
          onClick={() => setTab("fraternities")}
          className={`flex items-center gap-2 flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            tab === "fraternities"
              ? "bg-zinc-800 text-white"
              : "text-zinc-400 hover:text-zinc-300"
          }`}
        >
          <Shield size={16} />
          Fraternities
        </button>
      </div>

      {error && (
        <div className="p-3 mb-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center">
          {error}
        </div>
      )}

      {/* Pending Venues Tab */}
      {tab === "venues" && (
        <>
          {venues.length === 0 ? (
            <div className="text-center py-16 bg-zinc-900/50 rounded-2xl border border-zinc-800/50">
              <Inbox size={48} className="text-zinc-700 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-zinc-400 mb-1">No Pending Submissions</h2>
              <p className="text-zinc-500 text-sm">All venue submissions have been reviewed.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {venues.map((venue) => (
                <div
                  key={venue.id}
                  className="p-4 bg-zinc-900/70 border border-zinc-800/50 rounded-xl flex items-start justify-between gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-white font-semibold text-sm truncate">{venue.name}</h3>
                      <span className="shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700/50">
                        {CATEGORY_LABELS[venue.category] || venue.category}
                      </span>
                    </div>
                    {venue.description && (
                      <p className="text-zinc-500 text-xs mb-1.5 line-clamp-2">{venue.description}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-zinc-600">
                      <span>School: {venue.school_id}</span>
                      {venue.address && <span>{venue.address}</span>}
                      <span>{new Date(venue.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleApprove(venue.id)}
                      disabled={actionLoading === venue.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 text-sm font-medium transition-colors border border-emerald-600/30 disabled:opacity-50"
                      title="Approve"
                    >
                      <Check size={14} />
                      <span className="hidden sm:inline">Approve</span>
                    </button>
                    <button
                      onClick={() => handleReject(venue.id)}
                      disabled={actionLoading === venue.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-400 text-sm font-medium transition-colors border border-red-600/30 disabled:opacity-50"
                      title="Reject"
                    >
                      <X size={14} />
                      <span className="hidden sm:inline">Reject</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Users Tab */}
      {tab === "users" && (
        <div className="space-y-2">
          {users.length === 0 ? (
            <div className="text-center py-16 bg-zinc-900/50 rounded-2xl border border-zinc-800/50">
              <Users size={48} className="text-zinc-700 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-zinc-400">No Users Yet</h2>
            </div>
          ) : (
            users.map((u) => {
              const isCurrentUser = u.id === user.id;
              const isAdmin = u.role === "admin";
              return (
                <div
                  key={u.id}
                  className="p-4 bg-zinc-900/70 border border-zinc-800/50 rounded-xl flex items-center justify-between gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-white font-semibold text-sm">{u.username}</span>
                      {isAdmin && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          ADMIN
                        </span>
                      )}
                      {isCurrentUser && (
                        <span className="text-[10px] text-zinc-500">(you)</span>
                      )}
                    </div>
                    <div className="text-xs text-zinc-500">
                      {u.email} &middot; joined {new Date(u.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="shrink-0">
                    {isCurrentUser ? (
                      <span className="text-xs text-zinc-600 px-3 py-1.5">--</span>
                    ) : isAdmin ? (
                      <button
                        onClick={() => handleRoleChange(u.id, "user")}
                        disabled={actionLoading === u.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-sm font-medium transition-colors border border-zinc-700/50 disabled:opacity-50"
                        title="Remove admin"
                      >
                        <ShieldOff size={14} />
                        <span className="hidden sm:inline">Remove Admin</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleRoleChange(u.id, "admin")}
                        disabled={actionLoading === u.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 text-sm font-medium transition-colors border border-amber-600/30 disabled:opacity-50"
                        title="Make admin"
                      >
                        <ShieldCheck size={14} />
                        <span className="hidden sm:inline">Make Admin</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Fraternities Tab */}
      {tab === "fraternities" && (
        <div className="space-y-4">
          {/* School search */}
          <div className="relative">
            <label className="block text-xs text-zinc-400 mb-1.5">Select a School</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={glSchoolQuery}
                onChange={(e) => {
                  setGlSchoolQuery(e.target.value);
                  if (glSelectedSchool && e.target.value !== glSelectedSchool.name) {
                    setGlSelectedSchool(null);
                    setGlFrats([]);
                  }
                }}
                placeholder="Search by school name..."
                className="w-full pl-10 pr-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-violet-500"
              />
            </div>
            {glSchoolResults.length > 0 && !glSelectedSchool && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl max-h-48 overflow-y-auto z-50">
                {glSchoolResults.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleGlSelectSchool(s)}
                    className="w-full px-4 py-2.5 text-left hover:bg-zinc-700 transition-colors"
                  >
                    <div className="text-sm text-white font-medium">{s.name}</div>
                    <div className="text-xs text-zinc-500">{s.city}, {s.state}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {glSelectedSchool && (
            <>
              <div className="p-4 bg-zinc-900/70 border border-zinc-800/50 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-white font-semibold text-sm">{glSelectedSchool.name}</h3>
                    <p className="text-xs text-zinc-500">{glSelectedSchool.city}, {glSelectedSchool.state} &middot; ID: {glSelectedSchool.id}</p>
                  </div>
                  <span className="text-xs text-zinc-500">{glFrats.length} fraternities</span>
                </div>

                {/* Add fraternity */}
                <div className="relative mb-3" ref={glSuggestRef}>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={glNewFrat}
                        onChange={(e) => {
                          setGlNewFrat(e.target.value);
                          setGlShowSuggestions(true);
                        }}
                        onFocus={() => glNewFrat && setGlShowSuggestions(true)}
                        placeholder="Fraternity name (e.g. Alpha Phi Alpha)"
                        className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") { e.preventDefault(); handleGlAddFrat(); }
                        }}
                      />
                      {glShowSuggestions && filteredGlSuggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl max-h-32 overflow-y-auto z-50">
                          {filteredGlSuggestions.map((name) => (
                            <button
                              key={name}
                              onClick={() => {
                                setGlNewFrat(name);
                                setGlShowSuggestions(false);
                              }}
                              className="w-full px-3 py-1.5 text-left text-sm text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
                            >
                              {name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={handleGlAddFrat}
                      disabled={!glNewFrat.trim() || actionLoading === "add-frat"}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors shrink-0"
                    >
                      <Plus size={14} />
                      Add
                    </button>
                  </div>
                </div>

                {/* Existing fraternities */}
                {glFrats.length === 0 ? (
                  <p className="text-zinc-600 text-sm text-center py-4">No fraternities at this school yet.</p>
                ) : (
                  <div className="space-y-1">
                    {glFrats.map((f) => (
                      <div
                        key={f.name}
                        className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg hover:bg-zinc-800/70 transition-colors group"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="text-sm text-zinc-300 truncate">{f.name}</span>
                          {f.rating_count > 0 && (
                            <span className="text-[10px] text-zinc-500 shrink-0">
                              {f.avg_rating.toFixed(1)} ({f.rating_count})
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleGlRemoveFrat(f.name)}
                          disabled={actionLoading === `rm-${f.name}`}
                          className="opacity-0 group-hover:opacity-100 flex items-center gap-1 px-2 py-1 rounded-md bg-red-600/20 hover:bg-red-600/30 text-red-400 text-xs font-medium transition-all border border-red-600/30 disabled:opacity-50 shrink-0"
                        >
                          <Trash2 size={12} />
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {!glSelectedSchool && (
            <div className="text-center py-16 bg-zinc-900/50 rounded-2xl border border-zinc-800/50">
              <Shield size={48} className="text-zinc-700 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-zinc-400 mb-1">Manage Fraternities</h2>
              <p className="text-zinc-500 text-sm">Search for a school above to add or remove fraternities.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
