"use client";

import { useMemo, useRef, useState } from "react";
import { CATALOG } from "@/lib/catalog";
import type { MarkerDTO } from "@/lib/types";
import { MARKER_LABELS } from "@/lib/types";
import { MARKER_SVG } from "./map/icons-svg";

const INTERIORS = CATALOG.find((g) => g.key === "interiors")?.labels ?? [];

/** Minuscules sans accents, pour une recherche tolérante ("meuble" trouve "Meublé"). */
const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

type Props = {
  markers: MarkerDTO[];
  /** Intérieur sélectionné (filtre actif) */
  selected: string | null;
  onSelect: (interior: string | null) => void;
  /** Clic sur un résultat : centrer la carte dessus */
  onPick: (m: MarkerDTO) => void;
  pickedId: string | null;
};

export default function InteriorSearch({ markers, selected, onSelect, onPick, pickedId }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Nombre de points par intérieur
  const counts = useMemo(() => {
    const c = new Map<string, number>();
    for (const m of markers) for (const l of m.labels) c.set(l, (c.get(l) ?? 0) + 1);
    return c;
  }, [markers]);

  // Suggestions : intérieurs disponibles sur la carte d'abord, puis les autres (grisés)
  const suggestions = useMemo(() => {
    const q = norm(query);
    return INTERIORS.filter((i) => !q || norm(i).includes(q)).sort(
      (a, b) => Number((counts.get(b) ?? 0) > 0) - Number((counts.get(a) ?? 0) > 0),
    );
  }, [query, counts]);

  const results = useMemo(
    () => (selected ? markers.filter((m) => m.labels.includes(selected)) : []),
    [markers, selected],
  );

  const choose = (interior: string) => {
    onSelect(interior);
    setQuery("");
  };

  const clear = () => {
    onSelect(null);
    setQuery("");
    inputRef.current?.focus();
  };

  if (!open) {
    return (
      <button
        onClick={() => {
          setOpen(true);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        className="pointer-events-auto w-fit rounded-lg border border-white/10 bg-neutral-900/90 px-3 py-2 text-sm font-semibold text-white shadow-lg backdrop-blur hover:bg-neutral-800"
      >
        🔍 Intérieur{selected ? ` : ${selected}` : ""}
      </button>
    );
  }

  return (
    <div className="pointer-events-auto w-64 rounded-xl border border-white/10 bg-neutral-900/95 p-3 text-sm text-neutral-200 shadow-xl backdrop-blur">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Rechercher un intérieur</h2>
        <button onClick={() => setOpen(false)} className="text-neutral-500 hover:text-white" title="Réduire">
          ✕
        </button>
      </div>

      {selected ? (
        <>
          <div className="mb-2 flex items-center gap-2 rounded-md border border-yellow-400/40 bg-yellow-400/10 px-2 py-1.5">
            <span className="flex-1 font-semibold text-yellow-100">{selected}</span>
            <button onClick={clear} className="text-xs text-yellow-200/70 hover:text-white">
              Effacer
            </button>
          </div>
          <p className="mb-1 text-xs text-neutral-500">
            {results.length === 0
              ? "Aucun point avec cet intérieur."
              : `${results.length} point${results.length > 1 ? "s" : ""} avec cet intérieur :`}
          </p>
          <ul className="max-h-[35vh] space-y-0.5 overflow-y-auto">
            {results.map((m) => (
              <li key={m.id}>
                <button
                  onClick={() => onPick(m)}
                  className={`flex w-full items-center gap-2 rounded-md px-2 py-1 text-left hover:bg-white/5 ${
                    pickedId === m.id ? "bg-white/10" : ""
                  }`}
                >
                  <span className="h-5 w-5 shrink-0" dangerouslySetInnerHTML={{ __html: MARKER_SVG[m.type] }} />
                  <span className="flex-1 truncate">{m.name || MARKER_LABELS[m.type]}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && suggestions[0]) choose(suggestions[0]);
              if (e.key === "Escape") setOpen(false);
            }}
            placeholder="ex : Duplex, Bureau, Alta Street…"
            className="mb-2 w-full rounded-md border border-white/10 bg-neutral-950 px-2.5 py-1.5 text-sm text-white outline-none placeholder:text-neutral-600 focus:border-yellow-400/60"
          />
          <ul className="max-h-[35vh] space-y-0.5 overflow-y-auto">
            {suggestions.map((i) => {
              const n = counts.get(i) ?? 0;
              return (
                <li key={i}>
                  <button
                    onClick={() => choose(i)}
                    className={`flex w-full items-center gap-2 rounded-md px-2 py-1 text-left hover:bg-white/5 ${
                      n === 0 ? "text-neutral-500" : ""
                    }`}
                  >
                    <span className="flex-1 truncate">{i}</span>
                    <span className={`text-xs ${n ? "text-yellow-300" : "text-neutral-600"}`}>{n}</span>
                  </button>
                </li>
              );
            })}
            {suggestions.length === 0 && <li className="px-2 py-3 text-center text-xs text-neutral-500">Aucun intérieur trouvé.</li>}
          </ul>
        </>
      )}
    </div>
  );
}
