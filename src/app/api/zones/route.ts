import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handle, requireAdmin } from "@/lib/api";
import { writeLog } from "@/lib/audit";
import { zoneToDTO } from "@/lib/serialize";
import { zoneCreateSchema } from "@/lib/validation";

export const POST = handle(async (req: Request) => {
  const { username } = await requireAdmin();
  const { points, ...data } = zoneCreateSchema.parse(await req.json());
  const zone = await prisma.$transaction(async (tx) => {
    const z = await tx.zone.create({ data: { ...data, points: JSON.stringify(points) } });
    await writeLog(tx, { action: "CREATE", entityType: "ZONE", entityId: z.id, actor: username, after: zoneToDTO(z) });
    return z;
  });
  return NextResponse.json(zoneToDTO(zone), { status: 201 });
});
