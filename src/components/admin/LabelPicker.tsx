"use client";

import { useMemo, useState } from "react";
import { LABEL_GROUPS, sortNames, type LabelDTO } from "@/lib/labels";
import { Input } from "./ui";

/** Sélection de labels (intérieurs, garages, entreprises) par cases à cocher. */
export default function LabelPicker({
  catalog,
  value,
  onChange,
}: {
  catalog: LabelDTO[];
  value: string[];
  onChange: (labels: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const selected = useMemo(() => new Set(value), [value]);

  const q = query.trim().toLowerCase();
  const groups = LABEL_GROUPS.map((g) => {
    const all = catalog.filter((l) => l.group === g.key).map((l) => l.name);
    return { ...g, labels: q ? all.filter((l) => l.toLowerCase().includes(q)) : all };
  }).filter(
    (g) => g.labels.length > 0,
  );

  const toggle = (label: string) => {
    const next = new Set(selected);
    if (next.has(label)) next.delete(label);
    else next.add(label);
    onChange(sortNames([...next], catalog));
  };

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {value.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => toggle(l)}
              title="Retirer"
              className="rounded-full bg-yellow-400/15 px-2 py-0.5 text-xs text-yellow-100 ring-1 ring-yellow-400/40 hover:bg-red-500/20 hover:text-red-200 hover:ring-red-400/50"
            >
              {l} ×
            </button>
          ))}
        </div>
      )}

      <Input placeholder="Rechercher un label…" value={query} onChange={(e) => setQuery(e.target.value)} />

      <div className="max-h-64 overflow-y-auto rounded-md border border-white/10 bg-neutral-950/60">
        {groups.length === 0 && <p className="px-3 py-3 text-center text-xs text-neutral-500">Aucun label trouvé.</p>}
        {groups.map((g) => {
          const count = g.labels.filter((l) => selected.has(l)).length;
          // Pendant une recherche, tous les groupes qui ont des résultats sont dépliés.
          const isOpen = q ? true : (open[g.key] ?? false);
          return (
            <div key={g.key} className="border-b border-white/5 last:border-0">
              <button
                type="button"
                onClick={() => setOpen((o) => ({ ...o, [g.key]: !isOpen }))}
                className="flex w-full items-center justify-between px-3 py-1.5 text-left text-xs font-semibold uppercase tracking-wide text-neutral-400 hover:text-white"
              >
                <span>
                  {isOpen ? "▾" : "▸"} {g.title}
                </span>
                <span className={count ? "text-yellow-300" : "text-neutral-600"}>
                  {count ? `${count} coché${count > 1 ? "s" : ""}` : g.labels.length}
                </span>
              </button>
              {isOpen && (
                <ul className="pb-1">
                  {g.labels.map((l) => (
                    <li key={l}>
                      <label className="flex cursor-pointer items-center gap-2 px-3 py-1 text-sm hover:bg-white/5">
                        <input type="checkbox" checked={selected.has(l)} onChange={() => toggle(l)} className="accent-yellow-400" />
                        <span className={selected.has(l) ? "text-white" : "text-neutral-300"}>{l}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
