import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, handle, requireAdmin } from "@/lib/api";
import { labelUpdateSchema } from "@/lib/validation";

/** Renomme un label, et le renomme aussi sur les icônes qui l'ont coché. */
export const PATCH = handle(async (req: Request, ctx: RouteContext<"/api/labels/[id]">) => {
  await requireAdmin();
  const { id } = await ctx.params;
  const { name } = labelUpdateSchema.parse(await req.json());
  const label = await prisma.$transaction(async (tx) => {
    const before = await tx.label.findUnique({ where: { id } });
    if (!before) throw new HttpError(404, "Label introuvable");
    const updated = await tx.label.update({ where: { id }, data: { name } });
    const markers = await tx.marker.findMany({ where: { labels: { has: before.name } }, select: { id: true, labels: true } });
    for (const m of markers) {
      await tx.marker.update({ where: { id: m.id }, data: { labels: m.labels.map((l) => (l === before.name ? name : l)) } });
    }
    return updated;
  });
  return NextResponse.json(label);
});

/** Supprime un label, seulement s'il n'est coché sur aucune icône (pas de perte silencieuse). */
export const DELETE = handle(async (_req: Request, ctx: RouteContext<"/api/labels/[id]">) => {
  await requireAdmin();
  const { id } = await ctx.params;
  await prisma.$transaction(async (tx) => {
    const label = await tx.label.findUnique({ where: { id } });
    if (!label) throw new HttpError(404, "Label introuvable");
    const used = await tx.marker.count({ where: { labels: { has: label.name } } });
    if (used) throw new HttpError(409, `Coché sur ${used} icône${used > 1 ? "s" : ""} : décoche-le d'abord`);
    await tx.label.delete({ where: { id } });
  });
  return NextResponse.json({ ok: true });
});
