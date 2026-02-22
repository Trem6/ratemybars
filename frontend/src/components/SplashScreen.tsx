"use client";

import { useEffect, useState } from "react";

export default function SplashScreen() {
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);
  const [removed, setRemoved] = useState(false);

  useEffect(() => {
    // Only show once per session
    if (sessionStorage.getItem("rmb-splash-seen")) {
      setRemoved(true);
      return;
    }

    setVisible(true);

    // Start fade-out after 2.2s
    const fadeTimer = setTimeout(() => {
      setFading(true);
    }, 2200);

    // Remove from DOM after fade completes
    const removeTimer = setTimeout(() => {
      setRemoved(true);
      sessionStorage.setItem("rmb-splash-seen", "1");
    }, 3000);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  if (removed) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-zinc-950"
      style={{
        opacity: visible ? (fading ? 0 : 1) : 0,
        transition: "opacity 0.8s ease-in-out",
        pointerEvents: fading ? "none" : "auto",
      }}
    >
      {/* Radial gradient glow */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at center, rgba(139, 92, 246, 0.12) 0%, transparent 60%)",
        }}
      />

      <div className="relative flex flex-col items-center gap-4">
        {/* Animated logo */}
        <div
          className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white font-bold text-3xl shadow-2xl shadow-violet-500/30"
          style={{
            animation: visible ? "splashLogoIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) both" : "none",
          }}
        >
          R
        </div>

        {/* Animated text */}
        <div
          className="text-2xl font-bold text-white tracking-tight"
          style={{
            animation: visible ? "splashTextIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.3s both" : "none",
          }}
        >
          Rate<span className="text-violet-400">My</span>CollegeParty
        </div>

        {/* Tagline */}
        <div
          className="text-sm text-zinc-500"
          style={{
            animation: visible ? "splashTextIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.6s both" : "none",
          }}
        >
          Discover the best college party venues
        </div>

        {/* Loading bar */}
        <div
          className="w-32 h-0.5 bg-zinc-800 rounded-full overflow-hidden mt-2"
          style={{
            animation: visible ? "splashTextIn 0.6s ease 0.5s both" : "none",
          }}
        >
          <div
            className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full"
            style={{
              animation: visible ? "splashBarFill 1.5s ease 0.7s both" : "none",
            }}
          />
        </div>
      </div>
    </div>
  );
}
