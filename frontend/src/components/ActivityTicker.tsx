"use client";

import { useMemo } from "react";
import { Star, Plus, TrendingUp } from "lucide-react";

interface TickerItem {
  icon: "star" | "plus" | "trending";
  text: string;
  color: string;
}

const ACTIVITY_POOL: TickerItem[] = [
  { icon: "star", text: "PartyPete rated The Boot at Tulane 4.5 stars", color: "#fbbf24" },
  { icon: "plus", text: "New venue added: Rick's American Cafe near UMich", color: "#4ade80" },
  { icon: "star", text: "CollegeFun rated Salty Dog Saloon at UF 5.0 stars", color: "#fbbf24" },
  { icon: "trending", text: "Arizona State trending -- 3 new ratings today", color: "#22d3ee" },
  { icon: "star", text: "NightOwl rated Fat Daddy's at WVU 4.0 stars", color: "#fbbf24" },
  { icon: "plus", text: "New venue added: State Street Brats near UW-Madison", color: "#4ade80" },
  { icon: "star", text: "GameDayKing rated Whiskey Row at ASU 4.5 stars", color: "#fbbf24" },
  { icon: "trending", text: "Penn State climbing ranks -- now A-Tier", color: "#22d3ee" },
  { icon: "star", text: "BarCrawler rated Georgia Theatre at UGA 5.0 stars", color: "#fbbf24" },
  { icon: "plus", text: "New venue added: Kilroy's on Kirkwood near IU", color: "#4ade80" },
  { icon: "star", text: "SocialScene rated The Sink at CU Boulder 4.0 stars", color: "#fbbf24" },
  { icon: "trending", text: "Ohio State is heating up -- 5 venues rated this week", color: "#22d3ee" },
  { icon: "star", text: "WeekendWarrior rated Chuck's Cafe at Syracuse 3.5 stars", color: "#fbbf24" },
  { icon: "plus", text: "New venue added: F&M Patio Bar near Tulane", color: "#4ade80" },
  { icon: "star", text: "TailgatePro rated Cain & Abel's at UT Austin 4.5 stars", color: "#fbbf24" },
  { icon: "trending", text: "LSU just hit S-Tier -- legendary party scene", color: "#22d3ee" },
];

function IconForType({ type, color }: { type: TickerItem["icon"]; color: string }) {
  const props = { size: 12, style: { color } };
  switch (type) {
    case "star":
      return <Star {...props} fill={color} />;
    case "plus":
      return <Plus {...props} />;
    case "trending":
      return <TrendingUp {...props} />;
  }
}

export default function ActivityTicker() {
  // Shuffle once on mount for variety
  const items = useMemo(() => {
    const shuffled = [...ACTIVITY_POOL].sort(() => Math.random() - 0.5);
    // Duplicate for seamless loop
    return [...shuffled, ...shuffled];
  }, []);

  return (
    <div className="overflow-hidden relative">
      {/* Fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-zinc-950 to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-zinc-950 to-transparent z-10 pointer-events-none" />

      <div className="flex animate-ticker whitespace-nowrap">
        {items.map((item, i) => (
          <div
            key={i}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs text-zinc-400 shrink-0"
          >
            <IconForType type={item.icon} color={item.color} />
            <span>{item.text}</span>
            <span className="text-zinc-600">&middot;</span>
            <span className="text-zinc-600">{Math.floor(Math.random() * 55 + 2)}m ago</span>
          </div>
        ))}
      </div>
    </div>
  );
}
