"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  Map as MapIcon,
  ChevronLeft,
  Plus,
  Save,
  Loader2,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { StopCard } from "@/components/StopCard";
import type { Itinerary, Stop } from "@/lib/types";
import { cityCenter } from "@/lib/cities";
import { supabase } from "@/lib/supabase";
import { haversineKm } from "@/lib/utils";
import { toast } from "sonner";

const JourneyGenie = dynamic(
  () => import("@/components/JourneyGenie").then((m) => m.JourneyGenie),
  {
    ssr: false,
    loading: () => <div className="h-full w-full bg-muted animate-pulse" />,
  },
);

const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

type Stored = {
  meta: {
    city: string;
    days: number;
    budget: string;
    travelStyle: string;
    mustVisit: string[];
  };
  itinerary: Itinerary;
};

export default function TripPage() {
  const router = useRouter();
  const [data, setData] = useState<Stored | null>(null);
  const [activeDay, setActiveDay] = useState(1);
  const [activeStop, setActiveStop] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [addingFor, setAddingFor] = useState<number | null>(null);
  const [newStopName, setNewStopName] = useState("");
  const [nominatimResults, setNominatimResults] = useState<
    Array<{ display_name: string; lat: string; lon: string }>
  >([]);

  useEffect(() => {
    const raw = sessionStorage.getItem("journeyGenie:current");
    if (!raw) {
      router.push("/");
      return;
    }
    setData(JSON.parse(raw));
  }, [router]);

  const day = useMemo(
    () =>
      data?.itinerary.days.find((d) => d.day === activeDay) ??
      data?.itinerary.days[0],
    [data, activeDay],
  );

  const tripTotal = useMemo(
    () =>
      data?.itinerary.days.reduce((s, d) => s + (d.daily_total_cost ?? 0), 0) ??
      0,
    [data],
  );

  const persist = (next: Stored) => {
    setData(next);
    sessionStorage.setItem("journeyGenie:current", JSON.stringify(next));
  };

  const removeStop = (idx: number) => {
    if (!data || !day) return;
    const newDays = data.itinerary.days.map((d) =>
      d.day !== day.day
        ? d
        : {
            ...d,
            stops: d.stops.filter((_, i) => i !== idx),
            daily_total_cost: recalcDay(d.stops.filter((_, i) => i !== idx)),
          },
    );
    persist({ ...data, itinerary: { ...data.itinerary, days: newDays } });
    setActiveStop(null);
  };

  const searchNominatim = async (query: string) => {
    setNewStopName(query);
    if (query.length < 3) {
      setNominatimResults([]);
      return;
    }
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          query + " " + (data?.meta.city ?? ""),
        )}&format=json&limit=5`,
        { headers: { "User-Agent": "JourneyGenie/1.0" } },
      );
      setNominatimResults(await res.json());
    } catch {
      setNominatimResults([]);
    }
  };

  const addStopFromNominatim = (r: {
    display_name: string;
    lat: string;
    lon: string;
  }) => {
    if (!data || !day) return;
    const newLat = parseFloat(r.lat);
    const newLng = parseFloat(r.lon);
    const lastStop = day.stops[day.stops.length - 1];
    const distKm = lastStop
      ? haversineKm(lastStop.lat, lastStop.lng, newLat, newLng)
      : 0;
    const mode = distKm < 0.8 ? "walk" : distKm < 5 ? "bus" : "metro";
    const fare = mode === "walk" ? 0 : 2.5;

    const newStop: Stop = {
      name: r.display_name.split(",")[0].trim(),
      type: "attraction",
      lat: newLat,
      lng: newLng,
      duration_mins: 60,
      entry_cost: 0,
      transport_from_previous: {
        mode,
        line: null,
        from_stop: null,
        to_stop: null,
        fare,
        walk_to_stop_mins:
          mode === "walk" ? Math.round((distKm * 1000) / 80) : 5,
      },
    };

    const newDays = data.itinerary.days.map((d) =>
      d.day !== day.day
        ? d
        : {
            ...d,
            stops: [...d.stops, newStop],
            daily_total_cost: recalcDay([...d.stops, newStop]),
          },
    );
    persist({ ...data, itinerary: { ...data.itinerary, days: newDays } });
    setNewStopName("");
    setNominatimResults([]);
    setAddingFor(null);
  };

  const save = async () => {
    if (!data) return;
    setSaving(true);
    try {
      const { data: row, error } = await supabase
        .from("trips")
        .insert({
          city: data.meta.city,
          days: data.meta.days,
          budget: data.meta.budget,
          travel_style: data.meta.travelStyle,
          must_visit: data.meta.mustVisit,
          itinerary: data.itinerary as never,
        })
        .select("share_slug")
        .single();
      if (error) throw error;
      setShareUrl(`${window.location.origin}/t/${row.share_slug}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (!data || !day) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
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
            <ChevronLeft className="h-4 w-4" /> New trip
          </Link>
          <div className="flex items-center gap-2 font-semibold">
            <MapIcon className="h-4 w-4 text-primary" /> JourneyGenie
          </div>
        </header>

        <div className="px-5 py-4">
          <h1 className="text-xl font-semibold capitalize">{data.meta.city}</h1>
          <p className="text-xs text-white/60">
            {data.meta.days} days · {data.meta.budget} · {data.meta.travelStyle}
          </p>
        </div>

        <div className="flex gap-1 overflow-x-auto border-b border-white/10 px-3 pb-3">
          {data.itinerary.days.map((d) => (
            <button
              key={d.day}
              onClick={() => {
                setActiveDay(d.day);
                setActiveStop(null);
              }}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm transition ${
                activeDay === d.day
                  ? "bg-primary text-primary-foreground"
                  : "text-white/70 hover:bg-white/10"
              }`}
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
              onRemove={() => removeStop(i)}
            />
          ))}

          {addingFor === day.day ? (
            <div className="rounded-xl border border-white/20 bg-white/5 p-3">
              <div className="relative">
                <Input
                  value={newStopName}
                  onChange={(e) => searchNominatim(e.target.value)}
                  placeholder="Search for a place…"
                  className="border-white/20 bg-white/10 text-white placeholder:text-white/50"
                  autoFocus
                />
                {nominatimResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border border-white/20 bg-[#0F172A] shadow-xl">
                    {nominatimResults.map((r, idx) => (
                      <button
                        key={idx}
                        className="flex w-full px-3 py-2 text-left text-xs text-white/80 hover:bg-white/10 first:rounded-t-lg last:rounded-b-lg"
                        onClick={() => addStopFromNominatim(r)}
                      >
                        <span className="font-medium">
                          {r.display_name.split(",")[0]}
                        </span>
                        <span className="ml-1 text-white/40">
                          {r.display_name.split(",").slice(1, 3).join(",")}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="mt-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setAddingFor(null);
                    setNewStopName("");
                    setNominatimResults([]);
                  }}
                  className="w-full text-white/70 hover:bg-white/10 hover:text-white"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAddingFor(day.day)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 py-3 text-sm text-white/60 hover:bg-white/5"
            >
              <Plus className="h-4 w-4" /> Add a stop
            </button>
          )}
        </div>

        <div className="border-t border-white/10 bg-black/20 p-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-white/60">Daily estimate</span>
            <span className="font-semibold">
              £{day.daily_total_cost?.toFixed(2) ?? "0.00"}
            </span>
          </div>
          <div className="mb-4 flex items-center justify-between text-sm">
            <span className="text-white/60">Trip total</span>
            <span className="font-semibold">£{tripTotal.toFixed(2)}</span>
          </div>
          <Button onClick={save} disabled={saving} className="w-full">
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Itinerary
              </>
            )}
          </Button>
        </div>
      </aside>

      <div className="relative h-[50vh] flex-1 md:h-auto">
        <JourneyGenie
          stops={day.stops}
          activeIndex={activeStop}
          onSelect={setActiveStop}
          city={data.meta.city}
        />
      </div>

      <Dialog open={!!shareUrl} onOpenChange={(o) => !o && setShareUrl(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Itinerary saved! 🎉</DialogTitle>
            <DialogDescription>
              Share this link with anyone to show them your trip.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Input
              value={shareUrl ?? ""}
              readOnly
              className="font-mono text-xs"
            />
            <Button
              onClick={async () => {
                await navigator.clipboard.writeText(shareUrl ?? "");
                toast.success("Link copied!");
              }}
            >
              <Copy className="mr-1 h-4 w-4" /> Copy
            </Button>
          </div>
          <Button
            variant="outline"
            onClick={() =>
              shareUrl &&
              router.push(shareUrl.replace(window.location.origin, ""))
            }
          >
            Open shared view
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function recalcDay(stops: Stop[]) {
  return stops.reduce(
    (sum, s) =>
      sum +
      (s.entry_cost ?? 0) +
      (s.transport_from_previous?.fare ??
        (s.transport_from_previous as any)?.cost ??
        0),
    0,
  );
}
