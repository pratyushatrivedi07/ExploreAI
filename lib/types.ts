export type Transport = {
  mode: "walk" | "bus" | "metro" | "train" | "start" | string;
  line?: string | null;
  from_stop?: string | null;
  to_stop?: string | null;
  fare?: number;
  cost?: number;
  walk_to_stop_mins?: number;
  walk_mins?: number;
};

export type Stop = {
  name: string;
  type: "attraction" | "food" | "activity" | string;
  lat: number;
  lng: number;
  duration_mins: number;
  entry_cost: number;
  notes?: string;
  description?: string;
  transport_from_previous?: Transport | null;
};

export type Day = {
  day: number;
  theme?: string;
  stops: Stop[];
  daily_total_cost: number;
};

export type Itinerary = {
  city: string;
  days: Day[];
  trip_total_cost?: number;
};
