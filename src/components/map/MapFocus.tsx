"use client";

import L from "leaflet";
import { useEffect } from "react";
import { useMap } from "react-leaflet";
import type { Point } from "@/lib/types";
import { toLatLng } from "./coords";

export type FocusRequest = { points: Point[]; key: number } | null;

/**
 * Centre la carte (animation) sur un ou plusieurs points. Changer `focus.key` relance le centrage.
 * À placer comme enfant de <MapView>.
 */
export default function MapFocus({ focus, minZoom = 1.5 }: { focus: FocusRequest; minZoom?: number }) {
  const map = useMap();

  useEffect(() => {
    if (!focus || focus.points.length === 0) return;
    let center: L.LatLng;
    let zoom: number;
    if (focus.points.length === 1) {
      center = L.latLng(toLatLng(focus.points[0]));
      zoom = Math.max(map.getZoom(), minZoom);
    } else {
      const bounds = L.latLngBounds(focus.points.map(toLatLng)).pad(0.3);
      center = bounds.getCenter();
      zoom = Math.min(map.getBoundsZoom(bounds), map.getMaxZoom() - 1);
    }
    zoom = Math.max(map.getMinZoom(), Math.min(map.getMaxZoom(), zoom));
    const size = map.getSize();
    if (size.x === 0 || size.y === 0 || !Number.isFinite(zoom)) return;
    // Leaflet.flyTo calcule 0/0 = NaN si on est déjà sur la vue cible → pas d'animation dans ce cas.
    const distPx = map.project(map.getCenter(), zoom).distanceTo(map.project(center, zoom));
    if (distPx < 1 && Math.abs(map.getZoom() - zoom) < 0.01) return;
    map.flyTo(center, zoom, { duration: 0.6 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, focus?.key]);

  return null;
}
