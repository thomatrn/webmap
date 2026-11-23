export type Point = [number, number]; // [x, y] en coordonnées SVG (origine en haut à gauche)

export type ZoneDTO = {
  id: string;
  name: string;
  description: string;
  category: string;
  color: string;
  fillOpacity: number;
  strokeWidth: number;
  dashed: boolean;
  points: Point[];
  updatedAt: string;
};

export type MarkerDTO = {
  id: string;
  name: string;
  description: string;
  type: MarkerType;
  linkedGarage: boolean;
  x: number;
  y: number;
  updatedAt: string;
};

export const MARKER_TYPES = ["house", "building", "factory"] as const;
export type MarkerType = (typeof MARKER_TYPES)[number];

export const MARKER_LABELS: Record<MarkerType, string> = {
  house: "Garage",
  building: "Immeuble",
  factory: "Entrepôt",
};

/** Types d'icône pour lesquels la case "Garage lié" est proposée. */
export const LINKED_GARAGE_TYPES: readonly MarkerType[] = ["house", "building"];

export type MapSize = {
  width: number;
  height: number;
  /** Modèle d'URL des tuiles, ex: /tiles/{z}/{x}/{y}.webp?v=… */
  tileUrl: string;
  /** Zoom le plus détaillé disponible en tuiles ; au-delà, Leaflet agrandit ces tuiles. */
  maxNativeZoom: number;
};

export const ZONE_PRESET_COLORS = [
  "#22c55e", // vert
  "#ef4444", // rouge
  "#f97316", // orange
  "#facc15", // jaune
  "#22d3ee", // cyan
  "#a855f7", // violet
  "#3b82f6", // bleu
  "#1d4ed8", // bleu foncé
  "#f472b6", // rose
  "#fef3c7", // crème
];
