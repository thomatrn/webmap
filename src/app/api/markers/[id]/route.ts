import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, handle, requireAdmin } from "@/lib/api";
import { writeLog } from "@/lib/audit";
import { markerToDTO } from "@/lib/serialize";
import { markerUpdateSchema } from "@/lib/validation";

export const PATCH = handle(async (req: Request, ctx: RouteContext<"/api/markers/[id]">) => {
  const { username } = await requireAdmin();
  const { id } = await ctx.params;
  const data = markerUpdateSchema.parse(await req.json());
  const marker = await prisma.$transaction(async (tx) => {
    const before = await tx.marker.findUnique({ where: { id } });
    if (!before) throw new HttpError(404, "Icône introuvable");
    const m = await tx.marker.update({ where: { id }, data });
    await writeLog(tx, {
      action: "UPDATE", entityType: "MARKER", entityId: id, actor: username,
      before: markerToDTO(before), after: markerToDTO(m),
    });
    return m;
  });
  return NextResponse.json(markerToDTO(marker));
});

export const DELETE = handle(async (_req: Request, ctx: RouteContext<"/api/markers/[id]">) => {
  const { username } = await requireAdmin();
  const { id } = await ctx.params;
  await prisma.$transaction(async (tx) => {
    const before = await tx.marker.findUnique({ where: { id } });
    if (!before) throw new HttpError(404, "Icône introuvable");
    await tx.marker.delete({ where: { id } });
    await writeLog(tx, { action: "DELETE", entityType: "MARKER", entityId: id, actor: username, before: markerToDTO(before) });
  });
  return NextResponse.json({ ok: true });
});
