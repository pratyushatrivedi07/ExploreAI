"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Map,
  Loader2,
  Backpack,
  Hotel,
  Plane,
  Bus,
  Footprints,
  Shuffle,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const budgets = [
  { id: "budget", icon: Backpack, label: "Budget", sub: "Under £50/day", emoji: "🎒" },
  { id: "mid", icon: Hotel, label: "Mid-range", sub: "£50–£150/day", emoji: "🏨" },
  { id: "comfort", icon: Plane, label: "Comfort", sub: "£150+/day", emoji: "✈️" },
] as const;

const styles = [
  { id: "public", icon: Bus, label: "Public Transport" },
  { id: "walking", icon: Footprints, label: "Walking" },
  { id: "mixed", icon: Shuffle, label: "Mixed" },
] as const;

const cities = [
  { name: "London", flag: "🇬🇧" },
  { name: "Paris", flag: "🇫🇷" },
  { name: "Barcelona", flag: "🇪🇸" },
  { name: "Rome", flag: "🇮🇹" },
  { name: "Amsterdam", flag: "🇳🇱" },
  { name: "Tokyo", flag: "🇯🇵" },
  { name: "New York", flag: "🇺🇸" },
  { name: "Dubai", flag: "🇦🇪" },
  { name: "Singapore", flag: "🇸🇬" },
  { name: "Sydney", flag: "🇦🇺" },
  { name: "Delhi", flag: "🇮🇳" },
];

const loadingMessages = [
  "Mapping your trip…",
  "Finding the best stops…",
  "Sorting transport options…",
  "Almost ready…",
];

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [city, setCity] = useState("");
  const [days, setDays] = useState(3);
  const [budget, setBudget] = useState<"budget" | "mid" | "comfort" | null>(null);
  const [travelStyle, setTravelStyle] = useState<"public" | "walking" | "mixed" | null>(null);
  const [mustVisit, setMustVisit] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);

  useEffect(() => {
    if (!loading) return;
    const id = setInterval(
      () => setLoadingMsgIdx((i) => (i + 1) % loadingMessages.length),
      1800,
    );
    return () => clearInterval(id);
  }, [loading]);

  const submit = async () => {
    if (!city.trim() || !budget || !travelStyle) return;
    setLoading(true);
    try {
      const mustVisitList = mustVisit
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 10);

      const res = await fetch("/api/generate-itinerary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city: city.trim(),
          days,
          budget,
          travelStyle,
          mustVisit: mustVisitList,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Couldn't generate itinerary — try again.");
      }

      const result = await res.json();
      sessionStorage.setItem(
        "journeyGenie:current",
        JSON.stringify({
          meta: { city: city.trim(), days, budget, travelStyle, mustVisit: mustVisitList },
          itinerary: result,
        }),
      );
      router.push("/trip");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't generate itinerary — try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-[var(--sidebar-bg)] text-[var(--sidebar-fg)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <Map className="h-5 w-5 text-primary" />
            <span>JourneyGenie</span>
          </Link>
          <Link href="/trips" className="text-sm text-white/70 hover:text-white">
            My Trips
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-12">
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-semibold tracking-tight">Plan your perfect trip</h1>
          <p className="mt-3 text-muted-foreground">
            A few quick questions and we'll map it for you.
          </p>
        </div>

        <div className="space-y-6 rounded-2xl border bg-card p-8 shadow-card">
          {/* Step 1 — City */}
          <Step n={1} active={step >= 1} title="Where are you going?">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {cities.map((c) => (
                <button
                  key={c.name}
                  onClick={() => {
                    setCity(c.name.toLowerCase());
                    setStep((s) => Math.max(s, 2));
                  }}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition ${
                    city === c.name.toLowerCase()
                      ? "border-primary bg-accent ring-2 ring-primary/20"
                      : "hover:bg-accent/50"
                  }`}
                >
                  <span className="text-base">{c.flag}</span>
                  <span className="font-medium">{c.name}</span>
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">More cities coming soon.</p>
          </Step>

          {/* Step 2 — Days */}
          {step >= 2 && (
            <Step n={2} active title="How many days?">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setDays(Math.max(1, days - 1))}
                >
                  −
                </Button>
                <div className="min-w-12 text-center text-2xl font-semibold tabular-nums">
                  {days}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setDays(Math.min(7, days + 1))}
                >
                  +
                </Button>
                {step === 2 && (
                  <Button variant="ghost" className="ml-auto" onClick={() => setStep(3)}>
                    Next <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                )}
              </div>
            </Step>
          )}

          {/* Step 3 — Budget */}
          {step >= 3 && (
            <Step n={3} active title="Daily budget">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {budgets.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => {
                      setBudget(b.id);
                      setStep((s) => Math.max(s, 4));
                    }}
                    className={`rounded-xl border p-4 text-left transition ${
                      budget === b.id
                        ? "border-primary bg-accent ring-2 ring-primary/20"
                        : "hover:bg-accent/50"
                    }`}
                  >
                    <div className="mb-2 text-2xl">{b.emoji}</div>
                    <div className="font-medium">{b.label}</div>
                    <div className="text-xs text-muted-foreground">{b.sub}</div>
                  </button>
                ))}
              </div>
            </Step>
          )}

          {/* Step 4 — Travel style */}
          {step >= 4 && (
            <Step n={4} active title="Travel style">
              <div className="grid grid-cols-3 gap-2">
                {styles.map((s) => {
                  const Icon = s.icon;
                  return (
                    <button
                      key={s.id}
                      onClick={() => {
                        setTravelStyle(s.id);
                        setStep((cs) => Math.max(cs, 5));
                      }}
                      className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm transition ${
                        travelStyle === s.id
                          ? "border-primary bg-accent text-foreground"
                          : "text-muted-foreground hover:bg-accent/50"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{s.label}</span>
                    </button>
                  );
                })}
              </div>
            </Step>
          )}

          {/* Step 5 — Must visit */}
          {step >= 5 && (
            <Step n={5} active title="Any must-visit places? (optional)">
              <Input
                value={mustVisit}
                onChange={(e) => setMustVisit(e.target.value)}
                placeholder="e.g. Tower of London, Borough Market"
              />
              <p className="mt-2 text-xs text-muted-foreground">Comma separated.</p>
            </Step>
          )}

          {/* Submit */}
          {step >= 4 && budget && travelStyle && (
            <Button
              onClick={submit}
              disabled={loading || !city.trim()}
              size="lg"
              className="w-full text-base"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {loadingMessages[loadingMsgIdx]}
                </>
              ) : (
                "Build My Itinerary"
              )}
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}

function Step({
  n,
  active,
  title,
  children,
}: {
  n: number;
  active: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className={active ? "" : "opacity-50"}>
      <div className="mb-3 flex items-center gap-2 text-sm font-medium">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[11px] text-accent-foreground">
          {n}
        </span>
        {title}
      </div>
      {children}
    </div>
  );
}
