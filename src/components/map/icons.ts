import L from "leaflet";
import type { MarkerType } from "@/lib/types";
import { MARKER_SVG } from "./icons-svg";

export { MARKER_SVG };

const cache = new Map<string, L.DivIcon>();

export function markerIcon(type: MarkerType, selected = false): L.DivIcon {
  const key = `${type}:${selected}`;
  let icon = cache.get(key);
  if (!icon) {
    icon = L.divIcon({
      className: `wm-marker${selected ? " wm-marker--selected" : ""}`,
      html: MARKER_SVG[type] ?? MARKER_SVG.house,
      iconSize: [34, 34],
      iconAnchor: [17, 30],
      tooltipAnchor: [0, -26],
      popupAnchor: [0, -28],
    });
    cache.set(key, icon);
  }
  return icon;
}
