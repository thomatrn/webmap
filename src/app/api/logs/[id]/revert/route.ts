import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, handle, requireAdmin } from "@/lib/api";
import { writeLog } from "@/lib/audit";
import { markerToDTO, zoneToDTO } from "@/lib/serialize";
import type { MarkerDTO, ZoneDTO } from "@/lib/types";

/**
 * Annule l'action d'un log : remet l'entité dans l'état "before" du log.
 * CREATE → supprime, UPDATE/DELETE → restaure le snapshot. L'annulation est elle-même loggée (REVERT).
 */
export const POST = handle(async (_req: Request, ctx: RouteContext<"/api/logs/[id]/revert">) => {
  const { username } = await requireAdmin();
  const { id } = await ctx.params;

  await prisma.$transaction(async (tx) => {
    const log = await tx.auditLog.findUnique({ where: { id } });
    if (!log) throw new HttpError(404, "Log introuvable");
    const target = log.before ? JSON.parse(log.before) : null; // null => l'entité ne doit pas exister

    if (log.entityType === "ZONE") {
      const current = await tx.zone.findUnique({ where: { id: log.entityId } });
      if (target) {
        const t = target as ZoneDTO;
        const data = {
          name: t.name, description: t.description, category: t.category, color: t.color,
          fillOpacity: t.fillOpacity, strokeWidth: t.strokeWidth, dashed: t.dashed,
          points: JSON.stringify(t.points),
        };
        const z = await tx.zone.upsert({ where: { id: log.entityId }, create: { id: log.entityId, ...data }, update: data });
        await writeLog(tx, { action: "REVERT", entityType: "ZONE", entityId: z.id, actor: username, before: current ? zoneToDTO(current) : undefined, after: zoneToDTO(z) });
      } else if (current) {
        await tx.zone.delete({ where: { id: current.id } });
        await writeLog(tx, { action: "REVERT", entityType: "ZONE", entityId: current.id, actor: username, before: zoneToDTO(current) });
      }
    } else {
      const current = await tx.marker.findUnique({ where: { id: log.entityId } });
      if (target) {
        const t = target as MarkerDTO;
        const data = { name: t.name, description: t.description, type: t.type, linkedGarage: t.linkedGarage ?? false, labels: t.labels ?? [], x: t.x, y: t.y };
        const m = await tx.marker.upsert({ where: { id: log.entityId }, create: { id: log.entityId, ...data }, update: data });
        await writeLog(tx, { action: "REVERT", entityType: "MARKER", entityId: m.id, actor: username, before: current ? markerToDTO(current) : undefined, after: markerToDTO(m) });
      } else if (current) {
        await tx.marker.delete({ where: { id: current.id } });
        await writeLog(tx, { action: "REVERT", entityType: "MARKER", entityId: current.id, actor: username, before: markerToDTO(current) });
      }
    }
  });
  return NextResponse.json({ ok: true });
});
