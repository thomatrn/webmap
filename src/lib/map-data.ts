import "server-only";
import { prisma } from "./db";
import { sortLabels, type LabelDTO } from "./labels";
import { markerToDTO, zoneToDTO } from "./serialize";

export async function getLabels(): Promise<LabelDTO[]> {
  const labels = await prisma.label.findMany();
  return sortLabels(labels.map((l) => ({ id: l.id, group: l.group as LabelDTO["group"], name: l.name })));
}

export async function getMapData() {
  const [zones, markers, labels] = await Promise.all([
    prisma.zone.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.marker.findMany({ orderBy: { createdAt: "asc" } }),
    getLabels(),
  ]);
  return { zones: zones.map(zoneToDTO), markers: markers.map(markerToDTO), labels };
}
