"use client";

import Link from "next/link";
import { useState } from "react";
import { LABEL_GROUPS, sortLabels, type LabelDTO, type LabelGroup } from "@/lib/labels";
import { api } from "./api-client";
import { Button, Input } from "./ui";

type Props = { initialLabels: LabelDTO[]; initialUsage: Record<string, number> };

/** Gestion des labels cochables sur les icônes : ajout, renommage, suppression. */
export default function LabelsView({ initialLabels, initialUsage }: Props) {
  const [labels, setLabels] = useState(initialLabels);
  const [usage, setUsage] = useState(initialUsage);
  const [query, setQuery] = useState("");
  const [drafts, setDrafts] = useState<Partial<Record<LabelGroup, string>>>({});
  const [error, setError] = useState<string | null>(null);

  const run = async (fn: () => Promise<void>) => {
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const add = (group: LabelGroup) =>
    run(async () => {
      const name = drafts[group]?.trim();
      if (!name) return;
      const label = await api<LabelDTO>("POST", "/api/labels", { group, name });
      setLabels((ls) => sortLabels([...ls, label]));
      setDrafts((d) => ({ ...d, [group]: "" }));
    });

  const rename = (l: LabelDTO) =>
    run(async () => {
      const name = window.prompt("Nouveau nom (il sera aussi changé sur les icônes) :", l.name)?.trim();
      if (!name || name === l.name) return;
      const updated = await api<LabelDTO>("PATCH", `/api/labels/${l.id}`, { name });
      setLabels((ls) => sortLabels(ls.map((x) => (x.id === l.id ? updated : x))));
      setUsage(({ [l.name]: n, ...rest }) => (n ? { ...rest, [name]: n } : rest));
    });

  const remove = (l: LabelDTO) =>
    run(async () => {
      if (!window.confirm(`Supprimer « ${l.name} » ?`)) return;
      await api("DELETE", `/api/labels/${l.id}`);
      setLabels((ls) => ls.filter((x) => x.id !== l.id));
    });

  const q = query.trim().toLowerCase();

  return (
    <main className="min-h-dvh bg-neutral-950 text-neutral-200">
      <div className="mx-auto max-w-3xl p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Labels des icônes</h1>
            <p className="text-sm text-neutral-500">Cochés sur les icônes et proposés dans la recherche d&apos;intérieur.</p>
          </div>
          <Link href="/admin" className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10">
            ← Retour à l&apos;éditeur
          </Link>
        </div>

        {error && <p className="mb-4 rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}

        <Input placeholder="Filtrer…" value={query} onChange={(e) => setQuery(e.target.value)} className="mb-4" />

        <div className="space-y-6">
          {LABEL_GROUPS.map((g) => {
            const list = labels.filter((l) => l.group === g.key && (!q || l.name.toLowerCase().includes(q)));
            return (
              <section key={g.key} className="overflow-hidden rounded-xl border border-white/10">
                <h2 className="flex items-center justify-between bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                  {g.title}
                  <span className="text-neutral-600">{labels.filter((l) => l.group === g.key).length}</span>
                </h2>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    add(g.key);
                  }}
                  className="flex gap-2 border-b border-white/5 p-2"
                >
                  <Input
                    placeholder={`Ajouter dans « ${g.title} »…`}
                    value={drafts[g.key] ?? ""}
                    onChange={(e) => setDrafts((d) => ({ ...d, [g.key]: e.target.value }))}
                  />
                  <Button type="submit" variant="primary" disabled={!drafts[g.key]?.trim()}>
                    Ajouter
                  </Button>
                </form>
                <ul className="max-h-96 overflow-y-auto">
                  {list.map((l) => {
                    const n = usage[l.name] ?? 0;
                    return (
                      <li key={l.id} className="flex items-center gap-2 border-b border-white/5 px-3 py-1.5 text-sm last:border-0 hover:bg-white/[0.03]">
                        <span className="flex-1">{l.name}</span>
                        <span className={`text-xs ${n ? "text-yellow-300" : "text-neutral-600"}`} title="Icônes qui l'ont coché">
                          {n} icône{n > 1 ? "s" : ""}
                        </span>
                        <Button onClick={() => rename(l)} className="!px-2 !py-0.5 text-xs">
                          Renommer
                        </Button>
                        <Button
                          variant="danger"
                          onClick={() => remove(l)}
                          disabled={n > 0}
                          title={n > 0 ? "Décoche-le des icônes avant de le supprimer" : undefined}
                          className="!px-2 !py-0.5 text-xs"
                        >
                          Supprimer
                        </Button>
                      </li>
                    );
                  })}
                  {list.length === 0 && <li className="px-3 py-3 text-center text-xs text-neutral-500">Aucun label.</li>}
                </ul>
              </section>
            );
          })}
        </div>
      </div>
    </main>
  );
}
