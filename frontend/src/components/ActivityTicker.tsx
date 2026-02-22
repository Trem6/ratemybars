"use client";

import { useEffect, useMemo, useState } from "react";
import { Star, Plus, Flame } from "lucide-react";
import { getRecentActivity, type ActivityItem } from "@/lib/api";

const FALLBACK: ActivityItem[] = [
  { type: "rating", text: "PartyPete upvoted The Boot at Tulane", timestamp: "" },
  { type: "venue", text: "New venue added: Rick's American Cafe near UMich", timestamp: "" },
  { type: "rating", text: "CollegeFun upvoted Salty Dog Saloon at UF", timestamp: "" },
  { type: "venue", text: "New venue added: Kilroy's on Kirkwood near IU", timestamp: "" },
  { type: "rating", text: "GameDayKing upvoted Whiskey Row at ASU", timestamp: "" },
  { type: "frat_rating", text: "NightOwl rated Sigma Chi at Ohio State 4.0", timestamp: "" },
  { type: "rating", text: "BarCrawler upvoted Georgia Theatre at UGA", timestamp: "" },
  { type: "venue", text: "New venue added: State Street Brats near UW-Madison", timestamp: "" },
];

function timeAgo(ts: string): string {
  if (!ts) return "";
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function ItemIcon({ type }: { type: ActivityItem["type"] }) {
  switch (type) {
    case "rating":
      return <Star size={11} className="text-amber-400" fill="#fbbf24" />;
    case "venue":
      return <Plus size={11} className="text-emerald-400" />;
    case "frat_rating":
      return <Flame size={11} className="text-orange-400" />;
  }
}

export default function ActivityTicker() {
  const [items, setItems] = useState<ActivityItem[]>(FALLBACK);

  useEffect(() => {
    getRecentActivity()
      .then((data) => {
        if (data && data.length > 0) setItems(data);
      })
      .catch(() => {});

    const interval = setInterval(() => {
      getRecentActivity()
        .then((data) => {
          if (data && data.length > 0) setItems(data);
        })
        .catch(() => {});
    }, 60_000);

    return () => clearInterval(interval);
  }, []);

  const display = useMemo(() => {
    const shuffled = [...items].sort(() => Math.random() - 0.5);
    return [...shuffled, ...shuffled];
  }, [items]);

  return (
    <div className="overflow-hidden relative h-full flex items-center">
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-zinc-950/80 to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-zinc-950/80 to-transparent z-10 pointer-events-none" />

      <div className="flex animate-ticker whitespace-nowrap">
        {display.map((item, i) => (
          <div
            key={i}
            className="inline-flex items-center gap-1.5 px-3 text-[11px] text-zinc-500 shrink-0"
          >
            <ItemIcon type={item.type} />
            <span>{item.text}</span>
            {item.timestamp && (
              <>
                <span className="text-zinc-700 mx-0.5">&middot;</span>
                <span className="text-zinc-600">{timeAgo(item.timestamp)}</span>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
