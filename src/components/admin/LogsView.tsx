"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { MARKER_LABELS, type MarkerType } from "@/lib/types";
import { api } from "./api-client";
import { Button } from "./ui";

type Snapshot = Record<string, unknown> | null;
type Log = {
  id: string;
  action: "CREATE" | "UPDATE" | "DELETE" | "REVERT";
  entityType: "ZONE" | "MARKER";
  entityId: string;
  actor: string;
  before: Snapshot;
  after: Snapshot;
  createdAt: string;
};

const ACTION_STYLE: Record<Log["action"], { label: string; cls: string }> = {
  CREATE: { label: "Création", cls: "bg-green-500/15 text-green-300" },
  UPDATE: { label: "Modification", cls: "bg-blue-500/15 text-blue-300" },
  DELETE: { label: "Suppression", cls: "bg-red-500/15 text-red-300" },
  REVERT: { label: "Annulation", cls: "bg-amber-500/15 text-amber-300" },
};

const FIELD_LABELS: Record<string, string> = {
  name: "nom",
  description: "description",
  category: "catégorie",
  color: "couleur",
  fillOpacity: "remplissage",
  strokeWidth: "épaisseur",
  dashed: "pointillés",
  points: "forme",
  type: "type",
  linkedGarage: "garage lié",
  labels: "labels",
  x: "position",
  y: "position",
};

function entityName(log: Log) {
  const s = log.after ?? log.before;
  const name = (s?.name as string) || "";
  if (log.entityType === "MARKER") return name || MARKER_LABELS[(s?.type as MarkerType) ?? "house"] || "Icône";
  return name || "Zone";
}

function diff(log: Log): string[] {
  if (!log.before || !log.after) return [];
  const changed = new Set<string>();
  for (const k of Object.keys(FIELD_LABELS)) {
    if (JSON.stringify(log.before[k]) !== JSON.stringify(log.after[k])) changed.add(FIELD_LABELS[k]);
  }
  return [...changed];
}

function fmtValue(k: string, v: unknown) {
  if (k === "points" && Array.isArray(v)) return `${v.length} points`;
  if (k === "labels" && Array.isArray(v)) return v.length ? v.join(", ") : "—";
  if (k === "type") return MARKER_LABELS[v as MarkerType] ?? String(v);
  if (typeof v === "boolean") return v ? "oui" : "non";
  if (typeof v === "number") return String(Math.round(v * 100) / 100);
  return v === "" || v == null ? "—" : String(v);
}

export default function LogsView({ entityId }: { entityId: string | null }) {
  const [logs, setLogs] = useState<Log[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  const fetchPage = useCallback(
    async (from: string | null) => {
      const qs = new URLSearchParams({ take: "50" });
      if (from) qs.set("cursor", from);
      if (entityId) qs.set("entityId", entityId);
      return api<{ logs: Log[]; nextCursor: string | null }>("GET", `/api/logs?${qs}`);
    },
    [entityId],
  );

  const load = useCallback(
    (from: string | null) =>
      fetchPage(from)
        .then((data) => {
          setLogs((prev) => (from ? [...prev, ...data.logs] : data.logs));
          setCursor(data.nextCursor);
        })
        .catch((e: Error) => setError(e.message))
        .finally(() => setLoading(false)),
    [fetchPage],
  );

  useEffect(() => {
    load(null);
  }, [load]);

  const loadMore = () => {
    setLoading(true);
    load(cursor);
  };

  const revert = async (log: Log) => {
    const what =
      log.action === "CREATE" ? "supprimer l'élément créé" : log.action === "DELETE" ? "restaurer l'élément supprimé" : "remettre l'état d'avant";
    if (!window.confirm(`Annuler cette action va ${what}. Continuer ?`)) return;
    try {
      await api("POST", `/api/logs/${log.id}/revert`);
      await load(null);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <main className="min-h-dvh bg-neutral-950 text-neutral-200">
      <div className="mx-auto max-w-5xl p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Historique des modifications</h1>
            {entityId && (
              <p className="text-sm text-neutral-500">
                Filtré sur un élément — <Link href="/admin/logs" className="underline hover:text-white">tout voir</Link>
              </p>
            )}
          </div>
          <Link href="/admin" className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10">
            ← Retour à l&apos;éditeur
          </Link>
        </div>

        {error && <p className="mb-4 rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}

        <div className="overflow-hidden rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-left text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Admin</th>
                <th className="px-3 py-2">Action</th>
                <th className="px-3 py-2">Élément</th>
                <th className="px-3 py-2">Détails</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const changes = diff(log);
                const a = ACTION_STYLE[log.action];
                return (
                  <FragmentRow key={log.id}>
                    <tr className="border-t border-white/5 hover:bg-white/[0.03]">
                      <td className="whitespace-nowrap px-3 py-2 text-neutral-400">
                        {new Date(log.createdAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "medium" })}
                      </td>
                      <td className="px-3 py-2 font-medium">{log.actor}</td>
                      <td className="px-3 py-2">
                        <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${a.cls}`}>{a.label}</span>
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-neutral-500">{log.entityType === "ZONE" ? "Zone" : "Icône"} · </span>
                        <Link href={`/admin/logs?entityId=${log.entityId}`} className="hover:underline">
                          {entityName(log)}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-neutral-400">
                        {changes.length > 0 ? (
                          <button onClick={() => setOpen(open === log.id ? null : log.id)} className="hover:text-white">
                            {changes.join(", ")} {open === log.id ? "▴" : "▾"}
                          </button>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Button onClick={() => revert(log)} className="!px-2 !py-1 text-xs">
                          ↶ Annuler
                        </Button>
                      </td>
                    </tr>
                    {open === log.id && log.before && log.after && (
                      <tr className="bg-white/[0.02]">
                        <td colSpan={6} className="px-6 py-3">
                          <ul className="space-y-1 font-mono text-xs">
                            {Object.keys(FIELD_LABELS)
                              .filter((k) => JSON.stringify(log.before![k]) !== JSON.stringify(log.after![k]))
                              .map((k) => (
                                <li key={k}>
                                  <span className="text-neutral-500">{k}: </span>
                                  <span className="text-red-300 line-through">{fmtValue(k, log.before![k])}</span>
                                  <span className="text-neutral-500"> → </span>
                                  <span className="text-green-300">{fmtValue(k, log.after![k])}</span>
                                </li>
                              ))}
                          </ul>
                        </td>
                      </tr>
                    )}
                  </FragmentRow>
                );
              })}
              {!loading && logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-10 text-center text-neutral-500">
                    Aucun log pour l&apos;instant.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex justify-center">
          {loading ? (
            <span className="text-sm text-neutral-500">Chargement…</span>
          ) : (
            cursor && <Button onClick={loadMore}>Charger plus</Button>
          )}
        </div>
      </div>
    </main>
  );
}

function FragmentRow({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
