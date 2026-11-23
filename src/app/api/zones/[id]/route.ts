import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, handle, requireAdmin } from "@/lib/api";
import { writeLog } from "@/lib/audit";
import { zoneToDTO } from "@/lib/serialize";
import { zoneUpdateSchema } from "@/lib/validation";

export const PATCH = handle(async (req: Request, ctx: RouteContext<"/api/zones/[id]">) => {
  const { username } = await requireAdmin();
  const { id } = await ctx.params;
  const { points, ...data } = zoneUpdateSchema.parse(await req.json());
  const zone = await prisma.$transaction(async (tx) => {
    const before = await tx.zone.findUnique({ where: { id } });
    if (!before) throw new HttpError(404, "Zone introuvable");
    const z = await tx.zone.update({
      where: { id },
      data: { ...data, ...(points ? { points: JSON.stringify(points) } : {}) },
    });
    await writeLog(tx, {
      action: "UPDATE", entityType: "ZONE", entityId: id, actor: username,
      before: zoneToDTO(before), after: zoneToDTO(z),
    });
    return z;
  });
  return NextResponse.json(zoneToDTO(zone));
});

export const DELETE = handle(async (_req: Request, ctx: RouteContext<"/api/zones/[id]">) => {
  const { username } = await requireAdmin();
  const { id } = await ctx.params;
  await prisma.$transaction(async (tx) => {
    const before = await tx.zone.findUnique({ where: { id } });
    if (!before) throw new HttpError(404, "Zone introuvable");
    await tx.zone.delete({ where: { id } });
    await writeLog(tx, { action: "DELETE", entityType: "ZONE", entityId: id, actor: username, before: zoneToDTO(before) });
  });
  return NextResponse.json({ ok: true });
});
