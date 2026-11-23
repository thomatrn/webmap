"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useMemo, type ReactNode } from "react";
import { Marker, TileLayer, Polygon, Tooltip, ZoomControl } from "react-leaflet";
import type { MapSize, MarkerDTO, ZoneDTO } from "@/lib/types";
import { LINKED_GARAGE_TYPES, MARKER_LABELS } from "@/lib/types";
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
        <Marker
          key={`${m.id}:${m.updatedAt}`}
          position={toLatLng([m.x, m.y])}
          icon={markerIcon(m.type, m.id === selectedId)}
          draggable={admin}
          zIndexOffset={m.id === selectedId ? 1000 : 0}
          eventHandlers={{
            click: () => onMarkerClick?.(m),
            dragend: (e) => {
              const ll = (e.target as L.Marker).getLatLng();
              onMarkerDragEnd?.(m, Math.round(ll.lng * 100) / 100, Math.round(-ll.lat * 100) / 100);
            },
          }}
        >
          {/* Infos au survol (nom, type, description) */}
          <Tooltip direction="top" className="wm-tooltip wm-tooltip--info">
            <InfoBody
              title={m.name || MARKER_LABELS[m.type]}
              subtitle={m.name ? MARKER_LABELS[m.type] : undefined}
              body={m.description}
              mention={
                LINKED_GARAGE_TYPES.includes(m.type) && m.linkedGarage
                  ? { text: "Garage lié", color: m.type === "building" ? "#4ade80" : "#f87171" }
                  : undefined
              }
            />
          </Tooltip>
        </Marker>
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
