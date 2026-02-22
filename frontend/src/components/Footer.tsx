"use client";

import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="border-t border-zinc-800/50 bg-zinc-950">
      <div className="max-w-screen-2xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Image src="/logo.png" alt="RateMyCollegeParty" width={28} height={28} className="drop-shadow-[0_0_6px_rgba(167,139,250,0.3)]" />
              <span className="text-base font-bold text-white tracking-tight">
                Rate<span className="text-violet-400">My</span>CollegeParty
              </span>
            </div>
            <p className="text-zinc-500 text-sm leading-relaxed max-w-xs">
              Discover and rate the best bars, nightclubs, and party venues near every college in the US.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
              Quick Links
            </h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/"
                  className="text-sm text-zinc-500 hover:text-white transition-colors"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  href="/submit"
                  className="text-sm text-zinc-500 hover:text-white transition-colors"
                >
                  Submit Venue
                </Link>
              </li>
              <li>
                <Link
                  href="/auth/login"
                  className="text-sm text-zinc-500 hover:text-white transition-colors"
                >
                  Login
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
              Legal
            </h4>
            <ul className="space-y-2">
              <li>
                <span className="text-sm text-zinc-600 cursor-default">Terms of Service</span>
              </li>
              <li>
                <span className="text-sm text-zinc-600 cursor-default">Privacy Policy</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-8 pt-6 border-t border-zinc-800/50 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-zinc-600">
            &copy; {new Date().getFullYear()} RateMyCollegeParty. All rights reserved.
          </p>
          <p className="text-xs text-zinc-700">
            Built with Next.js and Go
          </p>
        </div>
      </div>
    </footer>
  );
}
