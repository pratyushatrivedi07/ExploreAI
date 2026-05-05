"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Map, Loader2, MapPin, Calendar } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Trip = {
  id: string;
  share_slug: string;
  city: string;
  days: number;
  budget: string;
  created_at: string;
};

export default function TripsPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("trips")
      .select("id, share_slug, city, days, budget, created_at")
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        setTrips(data ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-[var(--sidebar-bg)] text-[var(--sidebar-fg)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <Map className="h-5 w-5 text-primary" />
            <span>JourneyGenie</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="mb-8 text-3xl font-semibold">My Trips</h1>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : trips.length === 0 ? (
          <div className="rounded-2xl border bg-card p-12 text-center">
            <MapPin className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">No saved trips yet.</p>
            <Link
              href="/"
              className="mt-4 inline-block rounded-xl bg-primary px-4 py-2 text-sm text-primary-foreground"
            >
              Plan your first trip
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {trips.map((t) => (
              <Link
                key={t.id}
                href={`/t/${t.share_slug}`}
                className="flex items-center justify-between rounded-xl border bg-card p-4 hover:bg-accent/50 transition"
              >
                <div>
                  <div className="font-medium capitalize">{t.city}</div>
                  <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {t.days} days
                    </span>
                    <span className="capitalize">{t.budget}</span>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(t.created_at).toLocaleDateString()}
                </span>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
