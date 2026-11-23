"use client";

import "@geoman-io/leaflet-geoman-free";
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css";
import L from "leaflet";
import { useEffect, useRef } from "react";
import { useMap, useMapEvents } from "react-leaflet";
import type { Point, ZoneDTO } from "@/lib/types";
import { latLngsToPoints, toLatLng, zoneStyle } from "./coords";

export type Tool = "select" | "draw-zone" | "place-marker";
export type ShapeMode = "none" | "vertices" | "drag";

type Props = {
  tool: Tool;
  drawColor: string;
  /** Zone en cours d'édition (sélectionnée ou brouillon), rendue ici plutôt que par MapView. */
  editing: ZoneDTO | null;
  shapeMode: ShapeMode;
  /** Incrémenter pour recréer la couche depuis editing.points (ex: annuler). */
  resetKey: number;
  onDrawn: (points: Point[]) => void;
  onShapeChange: (points: Point[]) => void;
  onPlace: (x: number, y: number) => void;
  onBackgroundClick: () => void;
  /** Centrer la carte sur ces points (change `key` pour relancer). */
  focus?: { points: Point[]; key: number } | null;
};

export default function AdminTools({
  tool,
  drawColor,
  editing,
  shapeMode,
  resetKey,
  onDrawn,
  onShapeChange,
  onPlace,
  onBackgroundClick,
  focus,
}: Props) {
  const map = useMap();
  const layerRef = useRef<L.Polygon | null>(null);

  // Garder les callbacks à jour sans relancer les effets.
  const cb = useRef({ onDrawn, onShapeChange, onPlace, onBackgroundClick });
  useEffect(() => {
    cb.current = { onDrawn, onShapeChange, onPlace, onBackgroundClick };
  });

  useEffect(() => {
    map.pm.setLang("fr");
    map.pm.setGlobalOptions({ snappable: true, snapDistance: 15 });
  }, [map]);

  // --- Mode dessin de zone ---
  useEffect(() => {
    if (tool !== "draw-zone") return;
    map.pm.enableDraw("Polygon", {
      allowSelfIntersection: false,
      finishOn: "dblclick",
      templineStyle: { color: drawColor },
      hintlineStyle: { color: drawColor, dashArray: "5 5" },
      pathOptions: { color: drawColor, fillColor: drawColor, fillOpacity: 0.3 },
    });
    const handler = (e: { layer: L.Layer }) => {
      const poly = e.layer as L.Polygon;
      const points = latLngsToPoints(poly.getLatLngs() as L.LatLng[][]);
      map.removeLayer(poly);
      if (points.length >= 3) cb.current.onDrawn(points);
    };
    map.on("pm:create", handler);
    return () => {
      map.off("pm:create", handler);
      map.pm.disableDraw();
    };
  }, [map, tool, drawColor]);

  // --- Couche de la zone en édition ---
  const editingId = editing?.id ?? null;
  useEffect(() => {
    if (!editing) return;
    const layer = L.polygon(editing.points.map(toLatLng), {
      ...zoneStyle(editing, true),
      pmIgnore: false,
      bubblingMouseEvents: false, // ne pas désélectionner en cliquant dessus
    });
    layer.addTo(map);
    layerRef.current = layer;
    const emit = () => cb.current.onShapeChange(latLngsToPoints(layer.getLatLngs() as L.LatLng[][]));
    layer.on("pm:edit", emit);
    layer.on("pm:dragend", emit);
    return () => {
      layer.off();
      layer.pm.disable();
      map.removeLayer(layer);
      layerRef.current = null;
    };
    // On ne recrée la couche que si on change de zone ou si on force un reset.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, editingId, resetKey]);

  // Style en direct quand on modifie le formulaire.
  useEffect(() => {
    if (editing) layerRef.current?.setStyle(zoneStyle(editing, true));
  }, [editing]);

  // Activation édition des sommets / déplacement.
  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    if (shapeMode === "vertices") {
      layer.pm.enable({ allowSelfIntersection: false, snappable: true });
    } else if (shapeMode === "drag") {
      layer.pm.enableLayerDrag();
    }
    return () => {
      layer.pm.disable();
      layer.pm.disableLayerDrag();
    };
  }, [shapeMode, editingId, resetKey]);

  // --- Centrage ---
  useEffect(() => {
    if (!focus || focus.points.length === 0) return;
    let center: L.LatLng;
    let zoom: number;
    if (focus.points.length === 1) {
      center = L.latLng(toLatLng(focus.points[0]));
      zoom = Math.max(map.getZoom(), 0);
    } else {
      const bounds = L.latLngBounds(focus.points.map(toLatLng)).pad(0.4);
      center = bounds.getCenter();
      zoom = map.getBoundsZoom(bounds);
    }
    const size = map.getSize();
    const distPx = map.project(map.getCenter(), zoom).distanceTo(map.project(center, zoom));
    if (size.x === 0 || size.y === 0 || !Number.isFinite(zoom)) return;
    // Leaflet.flyTo calcule 0/0 = NaN si on est déjà sur la vue cible → pas d'animation dans ce cas.
    if (distPx < 1 && Math.abs(map.getZoom() - zoom) < 0.01) return;
    map.flyTo(center, zoom, { duration: 0.6 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, focus?.key]);

  // --- Clics carte ---
  useMapEvents({
    click(e) {
      if (tool === "place-marker") {
        cb.current.onPlace(Math.round(e.latlng.lng * 100) / 100, Math.round(-e.latlng.lat * 100) / 100);
      } else if (tool === "select") {
        cb.current.onBackgroundClick();
      }
    },
  });

  useEffect(() => {
    const el = map.getContainer();
    el.style.cursor = tool === "select" ? "" : "crosshair";
    return () => {
      el.style.cursor = "";
    };
  }, [map, tool]);

  return null;
}
