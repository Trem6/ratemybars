"use client";

import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { LogIn, LogOut, Plus, User, Shield, Trophy } from "lucide-react";
import ActivityTicker from "./ActivityTicker";

export default function Navbar() {
  const { user, logout } = useAuth();

  const isAdmin = user?.role === "admin";

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-zinc-950/70 backdrop-blur-2xl border-b border-zinc-700/30 shadow-lg shadow-black/20">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group shrink-0">
          <Image
            src="/logo.png"
            alt="RateMyCollegeParty"
            width={36}
            height={36}
            className="group-hover:scale-110 transition-transform drop-shadow-[0_0_8px_rgba(167,139,250,0.4)]"
          />
          <span className="text-lg font-bold text-white tracking-tight hidden sm:inline">
            Rate<span className="text-violet-400">My</span>CollegeParty
          </span>
          <span className="text-lg font-bold text-white tracking-tight sm:hidden">
            R<span className="text-violet-400">M</span>CP
          </span>
        </Link>

        {/* Activity Ticker - fills middle space */}
        <div className="flex-1 min-w-0 hidden md:block overflow-hidden mx-2">
          <ActivityTicker />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 sm:gap-3 ml-auto shrink-0">
          <Link
            href="/leaderboard"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-zinc-800/50 text-zinc-400 hover:text-amber-400 text-sm font-medium transition-colors"
            title="Leaderboard"
          >
            <Trophy size={16} />
            <span className="hidden lg:inline">Leaderboard</span>
          </Link>
          {user ? (
            <>
              {isAdmin && (
                <Link
                  href="/admin"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 text-sm font-medium transition-colors border border-amber-600/30"
                >
                  <Shield size={14} />
                  <span className="hidden sm:inline">Admin</span>
                </Link>
              )}
              <Link
                href="/submit"
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white text-sm font-semibold transition-all shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30"
              >
                <Plus size={15} strokeWidth={2.5} />
                <span className="hidden sm:inline">Add Venue</span>
              </Link>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800/50 text-zinc-300 text-sm">
                <User size={14} />
                <span className="hidden sm:inline">{user.username}</span>
              </div>
              <button
                onClick={logout}
                className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                title="Logout"
              >
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <Link
              href="/auth/login"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-black text-sm font-medium hover:bg-zinc-200 transition-colors"
            >
              <LogIn size={16} />
              <span>Login</span>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
