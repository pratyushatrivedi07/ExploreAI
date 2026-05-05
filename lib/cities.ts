export const CITY_CENTERS: Record<string, [number, number]> = {
  london: [51.5074, -0.1278],
  paris: [48.8566, 2.3522],
  barcelona: [41.3851, 2.1734],
  rome: [41.9028, 12.4964],
  amsterdam: [52.3676, 4.9041],
  tokyo: [35.6762, 139.6503],
  "new york": [40.7128, -74.006],
  dubai: [25.2048, 55.2708],
  singapore: [1.3521, 103.8198],
  sydney: [-33.8688, 151.2093],
  delhi: [28.7041, 77.1025],
};

export function cityCenter(city: string): { center: [number, number]; zoom: number } {
  const key = city.trim().toLowerCase();
  if (CITY_CENTERS[key]) return { center: CITY_CENTERS[key], zoom: 13 };
  return { center: [20, 0], zoom: 2 };
}
