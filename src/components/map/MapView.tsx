"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useMemo, useRef, useState, type ReactNode } from "react";
import { Marker, Popup, TileLayer, Polygon, Tooltip, ZoomControl } from "react-leaflet";
import type { MapSize, MarkerDTO, ZoneDTO } from "@/lib/types";
import { LINKED_GARAGE_TYPES, MARKER_LABELS } from "@/lib/types";
import { sortLabels } from "@/lib/catalog";
import { mapBounds, toLatLng, zoneStyle } from "./coords";
import { markerIcon } from "./icons";
import "./leaflet-patches";
import StableMapContainer from "./StableMapContainer";

export type MapViewProps = {
  size: MapSize;
  zones: ZoneDTO[];
  markers: MarkerDTO[];
  /** Mode admin : pas de popups, les clics sélectionnent, les icônes sont déplaçables. */
  admin?: boolean;
  selectedId?: string | null;
  /** Zone cachée (ex: en cours d'édition, rendue ailleurs). */
  hiddenZoneId?: string | null;
  onZoneClick?: (z: ZoneDTO) => void;
  onMarkerClick?: (m: MarkerDTO) => void;
  onMarkerDragEnd?: (m: MarkerDTO, x: number, y: number) => void;
  children?: ReactNode;
};

export default function MapView({
  size,
  zones,
  markers,
  admin = false,
  selectedId,
  hiddenZoneId,
  onZoneClick,
  onMarkerClick,
  onMarkerDragEnd,
  children,
}: MapViewProps) {
  const bounds = useMemo(() => mapBounds(size), [size]);
  const maxBounds = useMemo(
    () =>
      L.latLngBounds(bounds).pad(0.25),
    [bounds],
  );

  return (
    <StableMapContainer
      bounds={bounds}
      className="h-full w-full !bg-[#242b2f]"
      options={{
        crs: L.CRS.Simple,
        maxBounds,
        maxBoundsViscosity: 0.8,
        minZoom: -4,
        // Ta carte contient des PNG (~12 px par unité SVG) : au-delà de ~4.5 on ne fait qu'agrandir des pixels (flou).
        maxZoom: 4.5,
        zoomSnap: 0.25,
        zoomDelta: 0.5,
        attributionControl: false,
        zoomControl: false,
      }}
    >
      <TileLayer
        url={size.tileUrl}
        bounds={bounds}
        tileSize={256}
        minNativeZoom={0}
        // Par défaut TileLayer disparaît sous le zoom 0 : on garde les tuiles du niveau 0 (réduites) en dessous.
        minZoom={-10}
        maxNativeZoom={size.maxNativeZoom}
        noWrap
        keepBuffer={4}
      />
      <ZoomControl position="topright" />

      {zones
        .filter((z) => z.id !== hiddenZoneId)
        .map((z) => (
          <Polygon
            key={`${z.id}:${z.updatedAt}`}
            positions={z.points.map(toLatLng)}
            pathOptions={zoneStyle(z, z.id === selectedId)}
            eventHandlers={{
              click: (e) => {
                if (onZoneClick) {
                  L.DomEvent.stopPropagation(e);
                  onZoneClick(z);
                }
              },
            }}
          >
            {z.name && (
              <Tooltip sticky direction="top" offset={[0, -12]} className="wm-tooltip wm-tooltip--info">
                <InfoBody title={z.name} subtitle={z.category} body={z.description} color={z.color} />
              </Tooltip>
            )}
          </Polygon>
        ))}

      {markers.map((m) => (
        <HoverMarker
          key={`${m.id}:${m.updatedAt}`}
          m={m}
          admin={admin}
          selected={m.id === selectedId}
          onClick={onMarkerClick}
          onDragEnd={onMarkerDragEnd}
        />
      ))}

      {children}
    </StableMapContainer>
  );
}

function InfoBody({
  title,
  subtitle,
  body,
  color,
  mention,
}: {
  title: string;
  subtitle?: string;
  body?: string;
  color?: string;
  /** Mention colorée affichée après la description (ex: "Garage lié"). */
  mention?: { text: string; color: string };
}) {
  return (
    <div className="min-w-44 max-w-72">
      <div className="flex items-center gap-2">
        {color && <span className="inline-block h-3 w-3 rounded-sm" style={{ background: color }} />}
        <strong className="text-sm">{title}</strong>
      </div>
      {subtitle && <div className="mt-0.5 text-xs uppercase tracking-wide text-neutral-400">{subtitle}</div>}
      {body && <p className="mt-2 whitespace-pre-wrap text-[13px] leading-snug text-neutral-200">{body}</p>}
      {mention && (
        <div className="mt-2 text-[13px] font-semibold" style={{ color: mention.color }}>
          {mention.text}
        </div>
      )}
    </div>
  );
}

/** Délai avant fermeture quand la souris quitte l'icône (le temps d'aller sur la carte d'infos). */
const HOVER_CLOSE_MS = 200;
/** Au-delà, la carte d'infos est repliée avec un bouton "Voir plus". */
const MAX_LINES = 8;

/**
 * Icône + carte d'infos au survol. C'est un Popup (et pas un Tooltip) pour pouvoir cliquer dedans
 * ("Voir plus") : il reste ouvert tant que la souris est sur l'icône OU sur la carte.
 */
function HoverMarker({
  m,
  admin,
  selected,
  onClick,
  onDragEnd,
}: {
  m: MarkerDTO;
  admin: boolean;
  selected: boolean;
  onClick?: (m: MarkerDTO) => void;
  onDragEnd?: (m: MarkerDTO, x: number, y: number) => void;
}) {
  const markerRef = useRef<L.Marker | null>(null);
  const closeTimer = useRef<number | undefined>(undefined);
  const [expanded, setExpanded] = useState(false);

  const cancelClose = () => window.clearTimeout(closeTimer.current);
  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = window.setTimeout(() => markerRef.current?.closePopup(), HOVER_CLOSE_MS);
  };
  const open = () => {
    cancelClose();
    markerRef.current?.openPopup();
  };

  return (
    <Marker
      ref={markerRef}
      position={toLatLng([m.x, m.y])}
      icon={markerIcon(m.type, selected)}
      draggable={admin}
      zIndexOffset={selected ? 1000 : 0}
      eventHandlers={{
        mouseover: open,
        mouseout: scheduleClose,
        click: () => {
          onClick?.(m);
          // Leaflet bascule le popup au clic sur l'icône : on le garde ouvert
          window.setTimeout(open, 0);
        },
        dragstart: () => markerRef.current?.closePopup(),
        dragend: (e) => {
          const ll = (e.target as L.Marker).getLatLng();
          onDragEnd?.(m, Math.round(ll.lng * 100) / 100, Math.round(-ll.lat * 100) / 100);
        },
        popupopen: (e) => {
          const el = (e as L.PopupEvent).popup.getElement();
          if (el) {
            el.onmouseenter = cancelClose;
            el.onmouseleave = scheduleClose;
          }
        },
        popupclose: () => setExpanded(false),
      }}
    >
      <Popup className="wm-popup wm-hovercard" closeButton={false} autoPan={false} offset={[0, -24]} maxWidth={300}>
        <MarkerCard m={m} expanded={expanded} onToggle={() => setExpanded((v) => !v)} />
      </Popup>
    </Marker>
  );
}

function MarkerCard({ m, expanded, onToggle }: { m: MarkerDTO; expanded: boolean; onToggle: () => void }) {
  // Lignes affichées : labels cochés (ordre du catalogue), puis description saisie à la main (toujours en dernier).
  const descLines = m.description.trim() ? m.description.trim().split("\n") : [];
  const allLabels = sortLabels(m.labels);
  const total = allLabels.length + descLines.length;
  const budget = expanded ? Infinity : MAX_LINES;
  const labels = allLabels.slice(0, budget);
  const desc = descLines.slice(0, Math.max(0, budget - labels.length));
  const hidden = total - labels.length - desc.length;
  const linked = LINKED_GARAGE_TYPES.includes(m.type) && m.linkedGarage;

  return (
    <div className="min-w-44">
      <strong className="text-sm">{m.name || MARKER_LABELS[m.type]}</strong>
      {m.name && <div className="mt-0.5 text-xs uppercase tracking-wide text-neutral-400">{MARKER_LABELS[m.type]}</div>}

      {(labels.length > 0 || desc.length > 0) && (
        <div className={`mt-2 space-y-1.5 ${expanded ? "max-h-72 overflow-y-auto pr-1" : ""}`}>
          {labels.length > 0 && (
            <ul className="space-y-0.5 text-[13px] text-neutral-100">
              {labels.map((l) => (
                <li key={l} className="flex gap-1.5">
                  <span className="text-yellow-400">•</span>
                  {l}
                </li>
              ))}
            </ul>
          )}
          {desc.length > 0 && (
            <p className="whitespace-pre-wrap text-[13px] leading-snug text-neutral-300">{desc.join("\n")}</p>
          )}
        </div>
      )}

      {(hidden > 0 || (expanded && total > MAX_LINES)) && (
        <button
          type="button"
          onClick={onToggle}
          className="mt-1.5 text-xs font-semibold text-yellow-300 hover:text-yellow-200"
        >
          {expanded ? "Voir moins" : `Voir plus (+${hidden})`}
        </button>
      )}

      {linked && (
        <div className="mt-2 text-[13px] font-semibold" style={{ color: m.type === "building" ? "#4ade80" : "#f87171" }}>
          Garage lié
        </div>
      )}
    </div>
  );
}
