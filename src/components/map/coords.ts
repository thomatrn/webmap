import L from "leaflet";
import type { MapSize, Point } from "@/lib/types";

// On stocke tout en coordonnées SVG (x vers la droite, y vers le bas).
// Leaflet CRS.Simple : lat vers le haut, lng vers la droite => lat = -y, lng = x.
export const toLatLng = ([x, y]: Point): L.LatLngTuple => [-y, x];
export const fromLatLng = (ll: L.LatLng): Point => [round(ll.lng), round(-ll.lat)];
const round = (n: number) => Math.round(n * 100) / 100;

export const mapBounds = ({ width, height }: MapSize): L.LatLngBoundsLiteral => [
  [-height, 0],
  [0, width],
];

export function latLngsToPoints(latlngs: L.LatLng[] | L.LatLng[][]): Point[] {
  const ring = (Array.isArray(latlngs[0]) ? latlngs[0] : latlngs) as L.LatLng[];
  return ring.map(fromLatLng);
}

export function zoneStyle(z: {
  color: string;
  fillOpacity: number;
  strokeWidth: number;
  dashed: boolean;
}, selected = false): L.PathOptions {
  return {
    color: z.color,
    fillColor: z.color,
    fillOpacity: selected ? Math.min(1, z.fillOpacity + 0.15) : z.fillOpacity,
    weight: selected ? z.strokeWidth + 2 : z.strokeWidth,
    dashArray: z.dashed ? `${z.strokeWidth * 3} ${z.strokeWidth * 2.5}` : undefined,
    lineJoin: "round",
  };
}
