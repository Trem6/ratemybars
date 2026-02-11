"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { LogIn, LogOut, Plus, User } from "lucide-react";

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-zinc-950/70 backdrop-blur-2xl border-b border-zinc-700/30 shadow-lg shadow-black/20">
      <div className="max-w-screen-2xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white font-bold text-sm group-hover:scale-105 transition-transform">
            R
          </div>
          <span className="text-lg font-bold text-white tracking-tight">
            Rate<span className="text-violet-400">My</span>Bars
          </span>
        </Link>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link
                href="/submit"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors"
              >
                <Plus size={16} />
                <span className="hidden sm:inline">Add Venue</span>
              </Link>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800/50 text-zinc-300 text-sm">
                <User size={14} />
                <span className="hidden sm:inline">{user.username}</span>
              </div>
              <button
                onClick={logout}
                className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                title="Logout"
              >
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <Link
              href="/auth/login"
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-white text-black text-sm font-medium hover:bg-zinc-200 transition-colors"
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
