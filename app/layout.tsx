import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "JourneyGenie — AI-powered tourist itinerary planner",
  description:
    "Plan a multi-day trip in seconds. Tell JourneyGenie your city, budget and style — get a mapped itinerary.",
  openGraph: {
    title: "JourneyGenie — AI itinerary planner",
    description: "AI-built day-by-day itineraries with maps and transit.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
