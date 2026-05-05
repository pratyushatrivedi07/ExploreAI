"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Map as MapIcon, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Itinerary } from "@/lib/types";
import { StopCard } from "@/components/StopCard";

const JourneyGenie = dynamic(
  () => import("@/components/JourneyGenie").then((m) => m.JourneyGenie),
  {
    ssr: false,
    loading: () => <div className="h-full w-full bg-muted animate-pulse" />,
  },
);

export default function SharedTripPage() {
  const { slug } = useParams<{ slug: string }>();
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [meta, setMeta] = useState<any>(null);
  const [activeDay, setActiveDay] = useState(1);
  const [activeStop, setActiveStop] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    supabase
      .from("trips")
      .select("*")
      .eq("share_slug", slug)
      .single()
      .then(({ data, error }: { data: any; error: any }) => {
        if (error || !data) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        setItinerary(data.itinerary as unknown as Itinerary);
        setMeta({
          city: data.city,
          days: data.days,
          budget: data.budget,
          travelStyle: data.travel_style,
        });
        setLoading(false);
      });
  }, [slug]);

  const day =
    itinerary?.days.find((d) => d.day === activeDay) ?? itinerary?.days[0];

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound || !itinerary || !day) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Trip not found.</p>
        <Link href="/" className="text-primary underline">
          Plan your own trip
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col md:flex-row">
      <aside className="flex w-full flex-col border-r bg-[var(--sidebar-bg)] text-[var(--sidebar-fg)] md:w-[40%] md:max-w-[520px]">
        <header className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-white/70 hover:text-white"
          >
            <MapIcon className="h-4 w-4 text-primary" /> JourneyGenie
          </Link>
          <span className="text-xs text-white/40">Shared itinerary</span>
        </header>

        <div className="px-5 py-4">
          <h1 className="text-xl font-semibold capitalize">{meta?.city}</h1>
          <p className="text-xs text-white/60">
            {meta?.days} days · {meta?.budget} · {meta?.travelStyle}
          </p>
        </div>

        <div className="flex gap-1 overflow-x-auto border-b border-white/10 px-3 pb-3">
          {itinerary.days.map((d) => (
            <button
              key={d.day}
              onClick={() => {
                setActiveDay(d.day);
                setActiveStop(null);
              }}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm transition ${activeDay === d.day ? "bg-primary text-primary-foreground" : "text-white/70 hover:bg-white/10"}`}
            >
              Day {d.day}
            </button>
          ))}
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {day.theme && (
            <div className="text-xs uppercase tracking-wide text-white/50">
              {day.theme}
            </div>
          )}
          {day.stops.map((stop, i) => (
            <StopCard
              key={i}
              stop={stop}
              index={i}
              active={activeStop === i}
              onClick={() => setActiveStop(i)}
            />
          ))}
        </div>

        <div className="border-t border-white/10 bg-black/20 p-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-white/60">Daily estimate</span>
            <span className="font-semibold">
              £{day.daily_total_cost?.toFixed(2) ?? "0.00"}
            </span>
          </div>
          <div className="mt-2">
            <Link
              href="/"
              className="block w-full rounded-xl bg-primary px-4 py-2.5 text-center text-sm font-medium text-primary-foreground"
            >
              Plan my own trip →
            </Link>
          </div>
        </div>
      </aside>

      <div className="relative h-[50vh] flex-1 md:h-auto">
        <JourneyGenie
          stops={day.stops}
          activeIndex={activeStop}
          onSelect={setActiveStop}
          city={meta?.city}
        />
      </div>
    </div>
  );
}
