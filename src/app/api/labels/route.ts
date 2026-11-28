import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handle, requireAdmin } from "@/lib/api";
import { labelCreateSchema } from "@/lib/validation";

export const POST = handle(async (req: Request) => {
  await requireAdmin();
  const data = labelCreateSchema.parse(await req.json());
  const label = await prisma.label.create({ data });
  return NextResponse.json(label, { status: 201 });
});
