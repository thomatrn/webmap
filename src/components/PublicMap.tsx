"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { MapSize, MarkerDTO, MarkerType, ZoneDTO } from "@/lib/types";
import { MARKER_LABELS, MARKER_TYPES } from "@/lib/types";
import { MARKER_SVG } from "./map/icons-svg";

const MapView = dynamic(() => import("./map/MapView"), { ssr: false, loading: () => <MapLoading /> });

export function MapLoading() {
  return <div className="grid h-full w-full place-items-center bg-[#1b1b1b] text-neutral-500">Chargement de la carte…</div>;
}

const NO_CATEGORY = "Sans catégorie";

export default function PublicMap({
  size,
  zones,
  markers,
}: {
  size: MapSize;
  zones: ZoneDTO[];
  markers: MarkerDTO[];
}) {
  const [hiddenTypes, setHiddenTypes] = useState<Set<MarkerType>>(new Set());
  const [hiddenCats, setHiddenCats] = useState<Set<string>>(new Set());
  const [panelOpen, setPanelOpen] = useState(true);

  const categories = useMemo(() => {
    const map = new Map<string, { color: string; count: number }>();
    for (const z of zones) {
      const key = z.category || NO_CATEGORY;
      const e = map.get(key);
      if (e) e.count++;
      else map.set(key, { color: z.color, count: 1 });
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [zones]);

  const visibleZones = zones.filter((z) => !hiddenCats.has(z.category || NO_CATEGORY));
  const visibleMarkers = markers.filter((m) => !hiddenTypes.has(m.type));

  const toggle = <T,>(set: Set<T>, v: T) => {
    const next = new Set(set);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    return next;
  };

  return (
    <div className="relative h-dvh w-full overflow-hidden">
      <MapView size={size} zones={visibleZones} markers={visibleMarkers} />

      <div className="pointer-events-none absolute left-3 top-3 z-[1000] flex flex-col gap-2">
        <button
          onClick={() => setPanelOpen((o) => !o)}
          className="pointer-events-auto w-fit rounded-lg border border-white/10 bg-neutral-900/90 px-3 py-2 text-sm font-semibold text-white shadow-lg backdrop-blur hover:bg-neutral-800"
        >
          {panelOpen ? "✕ Légende" : "☰ Légende"}
        </button>

        {panelOpen && (
          <div className="pointer-events-auto w-64 rounded-xl border border-white/10 bg-neutral-900/90 p-3 text-sm text-neutral-200 shadow-xl backdrop-blur">
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-neutral-400">Icônes</h2>
            <ul className="space-y-1">
              {MARKER_TYPES.map((t) => {
                const count = markers.filter((m) => m.type === t).length;
                const off = hiddenTypes.has(t);
                return (
                  <li key={t}>
                    <button
                      onClick={() => setHiddenTypes((s) => toggle(s, t))}
                      className={`flex w-full items-center gap-2 rounded-md px-2 py-1 text-left hover:bg-white/5 ${off ? "opacity-40" : ""}`}
                    >
                      <span className="h-6 w-6" dangerouslySetInnerHTML={{ __html: MARKER_SVG[t] }} />
                      <span className="flex-1">{MARKER_LABELS[t]}</span>
                      <span className="text-xs text-neutral-500">{count}</span>
                    </button>
                  </li>
                );
              })}
            </ul>

            {categories.length > 0 && (
              <>
                <h2 className="mb-2 mt-4 text-xs font-bold uppercase tracking-wider text-neutral-400">Zones</h2>
                <ul className="max-h-[40vh] space-y-1 overflow-y-auto">
                  {categories.map(([cat, { color, count }]) => {
                    const off = hiddenCats.has(cat);
                    return (
                      <li key={cat}>
                        <button
                          onClick={() => setHiddenCats((s) => toggle(s, cat))}
                          className={`flex w-full items-center gap-2 rounded-md px-2 py-1 text-left hover:bg-white/5 ${off ? "opacity-40" : ""}`}
                        >
                          <span className="h-4 w-4 rounded-sm border-2" style={{ borderColor: color, background: `${color}55` }} />
                          <span className="flex-1">{cat}</span>
                          <span className="text-xs text-neutral-500">{count}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </div>
        )}
      </div>

      <Link
        href="/admin"
        prefetch={false}
        className="absolute bottom-3 right-3 z-[1000] rounded-md bg-neutral-900/70 px-2 py-1 text-xs text-neutral-400 hover:text-white"
      >
        Admin
      </Link>
    </div>
  );
}
