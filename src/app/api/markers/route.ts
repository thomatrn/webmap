import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handle, requireAdmin } from "@/lib/api";
import { writeLog } from "@/lib/audit";
import { markerToDTO } from "@/lib/serialize";
import { markerCreateSchema } from "@/lib/validation";

export const POST = handle(async (req: Request) => {
  const { username } = await requireAdmin();
  const data = markerCreateSchema.parse(await req.json());
  const marker = await prisma.$transaction(async (tx) => {
    const m = await tx.marker.create({ data });
    await writeLog(tx, { action: "CREATE", entityType: "MARKER", entityId: m.id, actor: username, after: markerToDTO(m) });
    return m;
  });
  return NextResponse.json(markerToDTO(marker), { status: 201 });
});
