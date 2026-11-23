import "server-only";
import { prisma } from "./db";
import { markerToDTO, zoneToDTO } from "./serialize";

export async function getMapData() {
  const [zones, markers] = await Promise.all([
    prisma.zone.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.marker.findMany({ orderBy: { createdAt: "asc" } }),
  ]);
  return { zones: zones.map(zoneToDTO), markers: markers.map(markerToDTO) };
}
