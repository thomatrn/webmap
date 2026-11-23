import type { Marker, Zone } from "@prisma/client";
import type { MarkerDTO, MarkerType, Point, ZoneDTO } from "./types";

export function zoneToDTO(z: Zone): ZoneDTO {
  return {
    id: z.id,
    name: z.name,
    description: z.description,
    category: z.category,
    color: z.color,
    fillOpacity: z.fillOpacity,
    strokeWidth: z.strokeWidth,
    dashed: z.dashed,
    points: JSON.parse(z.points) as Point[],
    updatedAt: z.updatedAt.toISOString(),
  };
}

export function markerToDTO(m: Marker): MarkerDTO {
  return {
    id: m.id,
    name: m.name,
    description: m.description,
    type: m.type as MarkerType,
    linkedGarage: m.linkedGarage,
    x: m.x,
    y: m.y,
    updatedAt: m.updatedAt.toISOString(),
  };
}
