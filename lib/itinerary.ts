import { haversineKm } from "./utils";

const CITY_TRANSIT: Record<
  string,
  { metroName: string; busName: string; metroFare: number; busFare: number }
> = {
  london: { metroName: "Tube", busName: "Bus", metroFare: 2.8, busFare: 1.75 },
  paris: { metroName: "Métro", busName: "Bus", metroFare: 1.8, busFare: 1.8 },
  barcelona: { metroName: "Metro", busName: "Bus", metroFare: 1.1, busFare: 1.1 },
  rome: { metroName: "Metro", busName: "Bus", metroFare: 1.5, busFare: 1.5 },
  amsterdam: { metroName: "Metro", busName: "Tram", metroFare: 3.2, busFare: 3.2 },
  tokyo: { metroName: "Metro", busName: "Bus", metroFare: 2.0, busFare: 1.5 },
  "new york": { metroName: "Subway", busName: "Bus", metroFare: 2.9, busFare: 2.9 },
  dubai: { metroName: "Metro", busName: "Bus", metroFare: 2.0, busFare: 1.5 },
  singapore: { metroName: "MRT", busName: "Bus", metroFare: 1.5, busFare: 1.2 },
  sydney: { metroName: "Train", busName: "Bus", metroFare: 3.5, busFare: 2.5 },
  delhi: { metroName: "Metro", busName: "Bus", metroFare: 1.0, busFare: 0.5 },
};

export function enforceTransportModes(parsed: any, city: string, travelStyle: string): any {
  const transit = CITY_TRANSIT[city.toLowerCase()] ?? {
    metroName: "Metro",
    busName: "Bus",
    metroFare: 2.5,
    busFare: 1.75,
  };

  const correctedDays = parsed.days.map((day: any) => {
    const correctedStops = day.stops.map((stop: any, i: number) => {
      if (i === 0) return stop;

      const prev = day.stops[i - 1];
      const dist = haversineKm(prev.lat, prev.lng, stop.lat, stop.lng);
      const t = stop.transport_from_previous ?? {};
      const currentMode = (t.mode ?? "walk").toLowerCase();

      if (currentMode === "start") return stop;

      let correctedMode = currentMode;
      let correctedFare = t.fare ?? 0;

      if (dist < 0.8) {
        correctedMode = "walk";
        correctedFare = 0;
      } else if (dist < 3) {
        if (currentMode === "walk") {
          correctedMode = "bus";
          correctedFare = transit.busFare;
        }
      } else {
        if (currentMode === "walk" || currentMode === "bus") {
          correctedMode = "metro";
          correctedFare = transit.metroFare;
        }
      }

      if (travelStyle === "walking" && dist < 1.5) {
        correctedMode = "walk";
        correctedFare = 0;
      }

      return {
        ...stop,
        transport_from_previous: {
          ...t,
          mode: correctedMode,
          fare: correctedFare,
          line:
            correctedMode === "metro"
              ? (t.line ?? transit.metroName)
              : correctedMode === "bus"
                ? (t.line ?? transit.busName)
                : null,
        },
      };
    });

    const recalcTotal = correctedStops.reduce(
      (sum: number, s: any) =>
        sum + (s.entry_cost ?? 0) + (s.transport_from_previous?.fare ?? 0),
      0,
    );

    return { ...day, stops: correctedStops, daily_total_cost: recalcTotal };
  });

  const tripTotal = correctedDays.reduce(
    (s: number, d: any) => s + (d.daily_total_cost ?? 0),
    0,
  );

  return { ...parsed, days: correctedDays, trip_total_cost: tripTotal };
}

export function parseItineraryJson(content: string): any {
  try {
    return JSON.parse(content);
  } catch {
    let jsonStr = content;
    const fenceMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) {
      jsonStr = fenceMatch[1].trim();
    } else {
      const start = content.indexOf("{");
      if (start !== -1) jsonStr = content.substring(start);
    }
    try {
      return JSON.parse(jsonStr);
    } catch {
      let depth = 0;
      let lastSafePos = 0;
      for (let i = 0; i < jsonStr.length; i++) {
        if (jsonStr[i] === "{" || jsonStr[i] === "[") depth++;
        if (jsonStr[i] === "}" || jsonStr[i] === "]") {
          depth--;
          if (depth <= 1) lastSafePos = i + 1;
        }
      }
      const truncated = jsonStr.substring(0, lastSafePos);
      try {
        return JSON.parse(
          truncated + (truncated.trimEnd().endsWith("]") ? "}" : "]}]}"),
        );
      } catch {
        throw new Error("Couldn't generate itinerary — try again.");
      }
    }
  }
}

export const SYSTEM_PROMPT = `You are a travel planning assistant. Return ONLY a valid JSON object — no markdown, no explanation, no code fences. Start your response with { and end with }.

The JSON must match this exact structure:
{
  "city": "string",
  "days": [
    {
      "day": 1,
      "theme": "string (e.g. Historic London)",
      "stops": [
        {
          "name": "string",
          "type": "attraction | food | activity",
          "lat": float,
          "lng": float,
          "duration_mins": int,
          "entry_cost": float,
          "notes": "string (1 sentence)",
          "transport_from_previous": {
            "mode": "walk | bus | metro | train | start",
            "line": "string or null",
            "from_stop": "string or null",
            "to_stop": "string or null",
            "fare": float,
            "walk_to_stop_mins": int
          }
        }
      ],
      "daily_total_cost": float
    }
  ],
  "trip_total_cost": float
}

STRICT TRANSPORT RULES:
1. Under 800m between stops: mode = "walk", fare = 0
2. 800m–3km: use bus or metro. NEVER walk.
3. Over 3km: use metro or train. NEVER walk or bus.
4. Walking style: walk only under 1km, use transit beyond.
5. Public style: always most direct transit, never walk over 800m.
6. Mixed style: walk under 800m only, transit for everything else.
7. Metro/tube: line = real line name (e.g. "Central Line"). from_stop and to_stop = real station names.
8. Bus: line = real route number (e.g. "15", "RV1"). from_stop = stop near origin. to_stop = stop near destination.
9. Never leave line, from_stop, to_stop as null for bus or metro.
10. fare = actual fare in GBP. London Tube = £2.80, Paris Metro = £1.80.
11. First stop each day: mode = "start", fare = 0, line/from_stop/to_stop = null.
12. Order stops geographically — minimize backtracking. Route must never cross itself.`;

export function buildUserPrompt(
  city: string,
  days: number,
  budget: string,
  travelStyle: string,
  mustVisit: string[],
): string {
  const budgetLabel: Record<string, string> = {
    budget: "budget (under £50/day)",
    mid: "mid-range (£50–£150/day)",
    comfort: "comfort (£150+/day)",
  };
  const styleLabel: Record<string, string> = {
    public: "public transport",
    walking: "walking",
    mixed: "mixed",
  };

  return `Generate a realistic ${days}-day itinerary for ${city}.
Budget: ${budgetLabel[budget] ?? budget}
Travel style: ${styleLabel[travelStyle] ?? travelStyle}
Must-visit places: ${mustVisit.length ? mustVisit.join(", ") : "none"}

Requirements:
- Include exactly 1 food stop per day at a logical meal time
- 4-6 stops per day total
- Stops must be geographically clustered — minimize cross-city travel
- All transport modes must follow the STRICT TRANSPORT RULES
- Use accurate lat/lng coordinates for every stop in ${city}
- daily_total_cost = sum of all entry_cost + all transport fares for that day
- trip_total_cost = sum of all daily_total_cost values

CRITICAL GEOGRAPHIC RULE: Sort stops so each consecutive pair is the nearest unvisited stop. The route must never cross itself. Split far-apart must-visit places across different days.`;
}
