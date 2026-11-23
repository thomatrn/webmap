"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { MapSize, MarkerDTO, MarkerType, Point, ZoneDTO } from "@/lib/types";
import { LINKED_GARAGE_TYPES, MARKER_LABELS, MARKER_TYPES, ZONE_PRESET_COLORS } from "@/lib/types";
import { MapLoading } from "../PublicMap";
import { MARKER_SVG } from "../map/icons-svg";
import type { ShapeMode, Tool } from "../map/AdminTools";
import { api, logout } from "./api-client";
import { Button, Field, Input, Textarea } from "./ui";

// Geoman doit être chargé AVANT la création de la carte (il s'accroche à L.Map via un init hook).
const MapView = dynamic(
  async () => {
    const { loadGeoman } = await import("../map/load-geoman");
    await loadGeoman();
    return import("../map/MapView");
  },
  { ssr: false, loading: () => <MapLoading /> },
);
const AdminTools = dynamic(() => import("../map/AdminTools"), { ssr: false });

const NEW_ID = "__new__";

type Props = {
  size: MapSize;
  initialZones: ZoneDTO[];
  initialMarkers: MarkerDTO[];
  username: string;
};

const zoneFields = (z: ZoneDTO) => ({
  name: z.name,
  description: z.description,
  category: z.category,
  color: z.color,
  fillOpacity: z.fillOpacity,
  strokeWidth: z.strokeWidth,
  dashed: z.dashed,
  points: z.points,
});
const markerFields = (m: MarkerDTO) => ({
  name: m.name,
  description: m.description,
  type: m.type,
  // "Garage lié" n'a de sens que pour garages / immeubles
  linkedGarage: LINKED_GARAGE_TYPES.includes(m.type) && m.linkedGarage,
});

export default function AdminMap({ size, initialZones, initialMarkers, username }: Props) {
  const [zones, setZones] = useState(initialZones);
  const [markers, setMarkers] = useState(initialMarkers);

  const [tool, setTool] = useState<Tool>("select");
  const [placeType, setPlaceType] = useState<MarkerType>("house");
  const [drawColor, setDrawColor] = useState(ZONE_PRESET_COLORS[0]);

  const [zoneDraft, setZoneDraft] = useState<ZoneDTO | null>(null);
  const [markerDraft, setMarkerDraft] = useState<MarkerDTO | null>(null);
  const [shapeMode, setShapeMode] = useState<ShapeMode>("none");
  const [resetKey, setResetKey] = useState(0);
  const [focus, setFocus] = useState<{ points: Point[]; key: number } | null>(null);

  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ msg: string; error?: boolean } | null>(null);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"zones" | "markers">("zones");

  const savedZone = zoneDraft ? zones.find((z) => z.id === zoneDraft.id) ?? null : null;
  const savedMarker = markerDraft ? markers.find((m) => m.id === markerDraft.id) ?? null : null;

  const zoneDirty =
    !!zoneDraft && (zoneDraft.id === NEW_ID || !savedZone || JSON.stringify(zoneFields(zoneDraft)) !== JSON.stringify(zoneFields(savedZone)));
  const markerDirty =
    !!markerDraft && !!savedMarker && JSON.stringify(markerFields(markerDraft)) !== JSON.stringify(markerFields(savedMarker));

  const categories = useMemo(() => [...new Set(zones.map((z) => z.category).filter(Boolean))].sort(), [zones]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), toast.error ? 5000 : 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const run = useCallback(async (fn: () => Promise<void>, ok?: string) => {
    setBusy(true);
    try {
      await fn();
      if (ok) setToast({ msg: ok });
    } catch (e) {
      setToast({ msg: (e as Error).message, error: true });
    } finally {
      setBusy(false);
    }
  }, []);

  const confirmDiscard = () => (!zoneDirty && !markerDirty) || window.confirm("Modifications non enregistrées. Les abandonner ?");

  const clearSelection = () => {
    setZoneDraft(null);
    setMarkerDraft(null);
    setShapeMode("none");
  };

  const selectZone = (z: ZoneDTO, fly = false) => {
    if (zoneDraft?.id === z.id) return;
    if (!confirmDiscard()) return;
    setMarkerDraft(null);
    setZoneDraft({ ...z });
    setShapeMode("none");
    setTab("zones");
    if (fly) setFocus({ points: z.points, key: Date.now() });
  };

  const selectMarker = (m: MarkerDTO, fly = false) => {
    if (markerDraft?.id === m.id) return;
    if (!confirmDiscard()) return;
    setZoneDraft(null);
    setShapeMode("none");
    setMarkerDraft({ ...m });
    setTab("markers");
    if (fly) setFocus({ points: [[m.x, m.y]], key: Date.now() });
  };

  const changeTool = (t: Tool) => {
    if (t !== "select" && !confirmDiscard()) return;
    if (t !== "select") clearSelection();
    setTool(t);
  };

  // --- Zones ---
  const onDrawn = (points: Point[]) => {
    setTool("select");
    setMarkerDraft(null);
    setShapeMode("none");
    setZoneDraft({
      id: NEW_ID,
      name: "",
      description: "",
      category: zoneDraft?.category ?? "",
      color: drawColor,
      fillOpacity: 0.35,
      strokeWidth: 3,
      dashed: false,
      points,
      updatedAt: "",
    });
    setResetKey((k) => k + 1);
    setTab("zones");
  };

  const saveZone = () =>
    zoneDraft &&
    run(async () => {
      const body = { ...zoneFields(zoneDraft), name: zoneDraft.name.trim() || "Zone sans nom" };
      if (zoneDraft.id === NEW_ID) {
        const z = await api<ZoneDTO>("POST", "/api/zones", body);
        setZones((zs) => [...zs, z]);
        setZoneDraft(z);
      } else {
        const z = await api<ZoneDTO>("PATCH", `/api/zones/${zoneDraft.id}`, body);
        setZones((zs) => zs.map((x) => (x.id === z.id ? z : x)));
        setZoneDraft(z);
      }
      setDrawColor(zoneDraft.color);
      setShapeMode("none");
      setResetKey((k) => k + 1);
    }, "Zone enregistrée");

  const deleteZone = () => {
    if (!zoneDraft) return;
    if (zoneDraft.id === NEW_ID) return clearSelection();
    if (!window.confirm(`Supprimer la zone « ${zoneDraft.name} » ?`)) return;
    const id = zoneDraft.id;
    run(async () => {
      await api("DELETE", `/api/zones/${id}`);
      setZones((zs) => zs.filter((z) => z.id !== id));
      clearSelection();
    }, "Zone supprimée");
  };

  const cancelZone = () => {
    if (!zoneDraft) return;
    if (zoneDraft.id === NEW_ID || !savedZone) return clearSelection();
    setZoneDraft({ ...savedZone });
    setShapeMode("none");
    setResetKey((k) => k + 1);
  };

  // --- Icônes ---
  const onPlace = (x: number, y: number) =>
    run(async () => {
      const m = await api<MarkerDTO>("POST", "/api/markers", { type: placeType, x, y, name: "" });
      setMarkers((ms) => [...ms, m]);
      setZoneDraft(null);
      setMarkerDraft(m);
      setTab("markers");
    }, "Icône placée");

  const onMarkerDragEnd = (m: MarkerDTO, x: number, y: number) =>
    run(async () => {
      const updated = await api<MarkerDTO>("PATCH", `/api/markers/${m.id}`, { x, y });
      setMarkers((ms) => ms.map((o) => (o.id === m.id ? updated : o)));
      setMarkerDraft((d) => (d?.id === m.id ? { ...d, x: updated.x, y: updated.y, updatedAt: updated.updatedAt } : d));
    }, "Icône déplacée");

  const saveMarker = () =>
    markerDraft &&
    run(async () => {
      const m = await api<MarkerDTO>("PATCH", `/api/markers/${markerDraft.id}`, markerFields(markerDraft));
      setMarkers((ms) => ms.map((o) => (o.id === m.id ? m : o)));
      setMarkerDraft(m);
    }, "Icône enregistrée");

  const deleteMarker = () => {
    if (!markerDraft) return;
    if (!window.confirm("Supprimer cette icône ?")) return;
    const id = markerDraft.id;
    run(async () => {
      await api("DELETE", `/api/markers/${id}`);
      setMarkers((ms) => ms.filter((m) => m.id !== id));
      setMarkerDraft(null);
    }, "Icône supprimée");
  };

  // Échap : revenir en sélection / quitter l'édition de forme
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (tool !== "select") setTool("select");
      else if (shapeMode !== "none") setShapeMode("none");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tool, shapeMode]);

  // Aperçu en direct du type/nom d'icône en cours d'édition
  const markersView = markerDraft
    ? markers.map((m) => (m.id === markerDraft.id ? { ...m, ...markerFields(markerDraft) } : m))
    : markers;

  const q = search.trim().toLowerCase();
  const filteredZones = zones.filter((z) => !q || z.name.toLowerCase().includes(q) || z.category.toLowerCase().includes(q));
  const filteredMarkers = markers.filter(
    (m) => !q || m.name.toLowerCase().includes(q) || MARKER_LABELS[m.type].toLowerCase().includes(q),
  );

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-neutral-950 text-neutral-200">
      <div className="relative flex-1">
        <MapView
          size={size}
          zones={zones}
          markers={markersView}
          admin
          selectedId={zoneDraft?.id ?? markerDraft?.id ?? null}
          hiddenZoneId={zoneDraft?.id ?? null}
          onZoneClick={tool === "select" ? (z) => selectZone(z) : undefined}
          onMarkerClick={(m) => selectMarker(m)}
          onMarkerDragEnd={onMarkerDragEnd}
        >
          <AdminTools
            tool={tool}
            drawColor={drawColor}
            editing={zoneDraft}
            shapeMode={shapeMode}
            resetKey={resetKey}
            focus={focus}
            onDrawn={onDrawn}
            onShapeChange={(points) => setZoneDraft((d) => (d ? { ...d, points } : d))}
            onPlace={onPlace}
            onBackgroundClick={() => {
              if (shapeMode === "none" && confirmDiscard()) clearSelection();
            }}
          />
        </MapView>

        {/* Barre d'outils flottante */}
        <div className="absolute left-1/2 top-3 z-[1000] flex -translate-x-1/2 items-center gap-1 rounded-xl border border-white/10 bg-neutral-900/90 p-1 shadow-xl backdrop-blur">
          <Button variant="toggle" active={tool === "select"} onClick={() => changeTool("select")}>
            ↖ Sélection
          </Button>
          <Button variant="toggle" active={tool === "draw-zone"} onClick={() => changeTool("draw-zone")}>
            ⬠ Dessiner une zone
          </Button>
          <Button variant="toggle" active={tool === "place-marker"} onClick={() => changeTool("place-marker")}>
            ⌂ Placer une icône
          </Button>
        </div>

        {tool !== "select" && (
          <div className="absolute left-1/2 top-16 z-[1000] flex -translate-x-1/2 items-center gap-3 rounded-lg border border-white/10 bg-neutral-900/90 px-3 py-2 text-sm shadow-xl backdrop-blur">
            {tool === "draw-zone" ? (
              <>
                <span className="text-neutral-400">Clique pour ajouter des points, clique sur le 1er point ou double-clique pour fermer.</span>
                <ColorPicker value={drawColor} onChange={setDrawColor} compact />
              </>
            ) : (
              <>
                <span className="text-neutral-400">Clique sur la carte pour placer :</span>
                {MARKER_TYPES.map((t) => (
                  <button
                    key={t}
                    title={MARKER_LABELS[t]}
                    onClick={() => setPlaceType(t)}
                    className={`h-9 w-9 rounded-md p-1 ${placeType === t ? "bg-yellow-400/20 ring-2 ring-yellow-400" : "hover:bg-white/10"}`}
                    dangerouslySetInnerHTML={{ __html: MARKER_SVG[t] }}
                  />
                ))}
              </>
            )}
            <span className="text-xs text-neutral-500">Échap pour quitter</span>
          </div>
        )}

        {toast && (
          <div
            className={`absolute bottom-4 left-1/2 z-[1000] -translate-x-1/2 rounded-lg px-4 py-2 text-sm font-medium shadow-xl ${
              toast.error ? "bg-red-600 text-white" : "bg-neutral-100 text-neutral-900"
            }`}
          >
            {toast.msg}
          </div>
        )}
      </div>

      {/* Panneau latéral */}
      <aside className="flex w-[360px] shrink-0 flex-col border-l border-white/10 bg-neutral-900">
        <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div>
            <h1 className="text-sm font-bold text-white">Panel admin</h1>
            <p className="text-xs text-neutral-500">Connecté : {username}</p>
          </div>
          <div className="flex gap-1">
            <Link href="/" target="_blank" prefetch={false} className="rounded-md px-2 py-1 text-xs text-neutral-400 hover:bg-white/5 hover:text-white">
              Carte ↗
            </Link>
            <Link href="/admin/logs" className="rounded-md px-2 py-1 text-xs text-neutral-400 hover:bg-white/5 hover:text-white">
              Logs
            </Link>
            <button onClick={logout} className="rounded-md px-2 py-1 text-xs text-neutral-400 hover:bg-white/5 hover:text-white">
              Déconnexion
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          {zoneDraft && (
            <section className="space-y-3 border-b border-white/10 p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white">{zoneDraft.id === NEW_ID ? "Nouvelle zone" : "Modifier la zone"}</h2>
                {zoneDraft.id !== NEW_ID && (
                  <Link href={`/admin/logs?entityId=${zoneDraft.id}`} className="text-xs text-neutral-500 hover:text-white">
                    Historique
                  </Link>
                )}
              </div>
              <Field label="Nom">
                <Input
                  autoFocus
                  value={zoneDraft.name}
                  placeholder="ex: Territoire Ballas"
                  onChange={(e) => setZoneDraft({ ...zoneDraft, name: e.target.value })}
                />
              </Field>
              <Field label="Catégorie" hint="sert de filtre sur la carte">
                <Input
                  list="zone-categories"
                  value={zoneDraft.category}
                  placeholder="ex: Gang, Entreprise, Police…"
                  onChange={(e) => setZoneDraft({ ...zoneDraft, category: e.target.value })}
                />
                <datalist id="zone-categories">
                  {categories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </Field>
              <Field label="Couleur">
                <ColorPicker value={zoneDraft.color} onChange={(color) => setZoneDraft({ ...zoneDraft, color })} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Remplissage" hint={`${Math.round(zoneDraft.fillOpacity * 100)}%`}>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={zoneDraft.fillOpacity}
                    onChange={(e) => setZoneDraft({ ...zoneDraft, fillOpacity: Number(e.target.value) })}
                    className="w-full accent-yellow-400"
                  />
                </Field>
                <Field label="Épaisseur" hint={`${zoneDraft.strokeWidth}px`}>
                  <input
                    type="range"
                    min={0}
                    max={10}
                    step={0.5}
                    value={zoneDraft.strokeWidth}
                    onChange={(e) => setZoneDraft({ ...zoneDraft, strokeWidth: Number(e.target.value) })}
                    className="w-full accent-yellow-400"
                  />
                </Field>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={zoneDraft.dashed}
                  onChange={(e) => setZoneDraft({ ...zoneDraft, dashed: e.target.checked })}
                  className="accent-yellow-400"
                />
                Contour en pointillés
              </label>
              <Field label="Description">
                <Textarea
                  rows={3}
                  value={zoneDraft.description}
                  onChange={(e) => setZoneDraft({ ...zoneDraft, description: e.target.value })}
                />
              </Field>

              <div>
                <span className="mb-1 block text-xs font-medium text-neutral-400">Forme ({zoneDraft.points.length} points)</span>
                <div className="flex gap-1">
                  <Button
                    variant="toggle"
                    active={shapeMode === "vertices"}
                    onClick={() => setShapeMode(shapeMode === "vertices" ? "none" : "vertices")}
                  >
                    ✎ Points
                  </Button>
                  <Button variant="toggle" active={shapeMode === "drag"} onClick={() => setShapeMode(shapeMode === "drag" ? "none" : "drag")}>
                    ✥ Déplacer
                  </Button>
                </div>
                {shapeMode === "vertices" && (
                  <p className="mt-1.5 text-xs text-neutral-500">
                    Glisse les points pour les bouger, glisse un point du milieu pour en ajouter, clic droit sur un point pour le supprimer.
                  </p>
                )}
              </div>

              <div className="flex gap-2 pt-1">
                <Button variant="primary" disabled={busy || !zoneDirty} onClick={saveZone} className="flex-1">
                  Enregistrer
                </Button>
                <Button onClick={cancelZone} disabled={busy}>
                  {zoneDraft.id === NEW_ID ? "Annuler" : zoneDirty ? "Annuler" : "Fermer"}
                </Button>
                <Button variant="danger" onClick={deleteZone} disabled={busy}>
                  Suppr.
                </Button>
              </div>
            </section>
          )}

          {markerDraft && (
            <section className="space-y-3 border-b border-white/10 p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white">Modifier l&apos;icône</h2>
                <Link href={`/admin/logs?entityId=${markerDraft.id}`} className="text-xs text-neutral-500 hover:text-white">
                  Historique
                </Link>
              </div>
              <Field label="Nom">
                <Input
                  value={markerDraft.name}
                  placeholder="ex: Pawn shop Davis"
                  onChange={(e) => setMarkerDraft({ ...markerDraft, name: e.target.value })}
                />
              </Field>
              <Field label="Type">
                <div className="flex gap-1">
                  {MARKER_TYPES.map((t) => (
                    <button
                      key={t}
                      onClick={() => setMarkerDraft({ ...markerDraft, type: t })}
                      title={MARKER_LABELS[t]}
                      className={`flex flex-1 flex-col items-center gap-1 rounded-md p-2 text-[11px] ${
                        markerDraft.type === t ? "bg-yellow-400/15 ring-1 ring-yellow-400" : "bg-white/5 hover:bg-white/10"
                      }`}
                    >
                      <span className="h-7 w-7" dangerouslySetInnerHTML={{ __html: MARKER_SVG[t] }} />
                      {MARKER_LABELS[t]}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Description">
                <Textarea rows={3} value={markerDraft.description} onChange={(e) => setMarkerDraft({ ...markerDraft, description: e.target.value })} />
              </Field>
              {LINKED_GARAGE_TYPES.includes(markerDraft.type) && (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={markerDraft.linkedGarage}
                    onChange={(e) => setMarkerDraft({ ...markerDraft, linkedGarage: e.target.checked })}
                    className="accent-yellow-400"
                  />
                  Garage lié
                  <span className={`text-xs ${markerDraft.type === "building" ? "text-green-400" : "text-red-400"}`}>
                    (affiché en {markerDraft.type === "building" ? "vert" : "rouge"} au survol)
                  </span>
                </label>
              )}
              <p className="text-xs text-neutral-500">
                Position : {markerDraft.x.toFixed(0)}, {markerDraft.y.toFixed(0)} — glisse l&apos;icône sur la carte pour la déplacer.
              </p>
              <div className="flex gap-2">
                <Button variant="primary" disabled={busy || !markerDirty} onClick={saveMarker} className="flex-1">
                  Enregistrer
                </Button>
                <Button onClick={() => (confirmDiscard() ? setMarkerDraft(null) : undefined)}>Fermer</Button>
                <Button variant="danger" onClick={deleteMarker} disabled={busy}>
                  Suppr.
                </Button>
              </div>
            </section>
          )}

          <section className="p-4">
            <div className="mb-3 flex gap-1 rounded-lg bg-white/5 p-1 text-sm">
              {(["zones", "markers"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 rounded-md py-1 ${tab === t ? "bg-white/10 text-white" : "text-neutral-400 hover:text-white"}`}
                >
                  {t === "zones" ? `Zones (${zones.length})` : `Icônes (${markers.length})`}
                </button>
              ))}
            </div>
            <Input placeholder="Rechercher…" value={search} onChange={(e) => setSearch(e.target.value)} className="mb-2" />
            <ul className="space-y-0.5">
              {tab === "zones"
                ? filteredZones.map((z) => (
                    <li key={z.id}>
                      <button
                        onClick={() => selectZone(z, true)}
                        className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-white/5 ${
                          zoneDraft?.id === z.id ? "bg-white/10" : ""
                        }`}
                      >
                        <span className="h-3.5 w-3.5 shrink-0 rounded-sm border-2" style={{ borderColor: z.color, background: `${z.color}55` }} />
                        <span className="flex-1 truncate">{z.name}</span>
                        {z.category && <span className="truncate text-xs text-neutral-500">{z.category}</span>}
                      </button>
                    </li>
                  ))
                : filteredMarkers.map((m) => (
                    <li key={m.id}>
                      <button
                        onClick={() => selectMarker(m, true)}
                        className={`flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-sm hover:bg-white/5 ${
                          markerDraft?.id === m.id ? "bg-white/10" : ""
                        }`}
                      >
                        <span className="h-5 w-5 shrink-0" dangerouslySetInnerHTML={{ __html: MARKER_SVG[m.type] }} />
                        <span className={`flex-1 truncate ${m.name ? "" : "italic text-neutral-500"}`}>{m.name || "Sans nom"}</span>
                      </button>
                    </li>
                  ))}
              {(tab === "zones" ? filteredZones : filteredMarkers).length === 0 && (
                <li className="px-2 py-4 text-center text-xs text-neutral-500">Rien ici pour l&apos;instant.</li>
              )}
            </ul>
          </section>
        </div>
      </aside>
    </div>
  );
}

function ColorPicker({ value, onChange, compact }: { value: string; onChange: (c: string) => void; compact?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {ZONE_PRESET_COLORS.map((c) => (
        <button
          key={c}
          title={c}
          onClick={() => onChange(c)}
          className={`${compact ? "h-5 w-5" : "h-6 w-6"} rounded-full border-2 ${value === c ? "border-white" : "border-transparent"}`}
          style={{ background: c }}
        />
      ))}
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${compact ? "h-5 w-6" : "h-6 w-8"} cursor-pointer rounded border-0 bg-transparent p-0`}
        title="Couleur personnalisée"
      />
    </div>
  );
}
