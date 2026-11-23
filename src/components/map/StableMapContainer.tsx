"use client";

import L from "leaflet";
import { createLeafletContext, LeafletContext, type LeafletContextInterface } from "@react-leaflet/core";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { SmoothWheelZoom } from "./smooth-wheel-zoom";

/** Crans de zoom ajoutés à l'arrivée sur la carte (1 = x2). */
const INITIAL_ZOOM_BOOST = 1.75;

/**
 * Remplace <MapContainer> de react-leaflet.
 *
 * Next 16 (cacheComponents) garde les pages visitées dans un <Activity> React : quand une page est
 * cachée puis réaffichée, les effets sont démontés puis remontés, mais le DOM est conservé.
 * MapContainer détruit la carte au démontage et ne la recrée jamais → carte cassée.
 * Ici, on ne détruit la carte que si son <div> a vraiment quitté le DOM.
 */
export default function StableMapContainer({
  options,
  bounds,
  className,
  children,
}: {
  options: L.MapOptions;
  bounds: L.LatLngBoundsExpression;
  className?: string;
  children?: ReactNode;
}) {
  const divRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [context, setContext] = useState<LeafletContextInterface | null>(null);

  useEffect(() => {
    const div = divRef.current;
    if (!div) return;
    if (!mapRef.current) {
      // scrollWheelZoom (par crans) remplacé par un zoom molette continu
      const map = L.map(div, { ...options, scrollWheelZoom: false });
      new SmoothWheelZoom(map).enable();
      map.fitBounds(bounds);
      // Zoom par défaut un peu plus serré que "toute la carte visible".
      map.setZoom(map.getZoom() + INITIAL_ZOOM_BOOST, { animate: false });
      mapRef.current = map;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- la carte Leaflet n'existe qu'après le montage
      setContext(createLeafletContext(map));
    }
    // La carte peut avoir été cachée (taille 0) : on recalcule sa taille quand elle réapparaît.
    const ro = new ResizeObserver(() => mapRef.current?.invalidateSize());
    ro.observe(div);
    return () => {
      ro.disconnect();
      setTimeout(() => {
        if (!div.isConnected && mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }
      }, 0);
    };
    // Options/bounds lus une seule fois à la création, comme MapContainer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={divRef} className={className}>
      {context && <LeafletContext value={context}>{children}</LeafletContext>}
    </div>
  );
}
