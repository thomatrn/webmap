import { NextResponse, connection } from "next/server";
import { prisma } from "@/lib/db";
import { handle, requireAdmin } from "@/lib/api";

export const GET = handle(async (req: Request) => {
  await connection(); // route toujours dynamique (session + DB)
  await requireAdmin();
  const url = new URL(req.url);
  const take = Math.min(Number(url.searchParams.get("take") ?? 100), 500);
  const cursor = url.searchParams.get("cursor");
  const entityId = url.searchParams.get("entityId");
  const logs = await prisma.auditLog.findMany({
    where: entityId ? { entityId } : undefined,
    orderBy: { createdAt: "desc" },
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  const hasMore = logs.length > take;
  const page = logs.slice(0, take).map((l) => ({
    ...l,
    before: l.before ? JSON.parse(l.before) : null,
    after: l.after ? JSON.parse(l.after) : null,
    createdAt: l.createdAt.toISOString(),
  }));
  return NextResponse.json({ logs: page, nextCursor: hasMore ? page[page.length - 1].id : null });
});
