import { NextResponse } from "next/server";
import { handle } from "@/lib/api";
import { destroySession } from "@/lib/session";

export const POST = handle(async (_req: Request) => {
  await destroySession();
  return NextResponse.json({ ok: true });
});
