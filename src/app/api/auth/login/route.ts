import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { HttpError, handle } from "@/lib/api";
import { verifyPassword } from "@/lib/password";
import { createSession } from "@/lib/session";

const schema = z.object({ username: z.string().min(1), password: z.string().min(1) });

export const POST = handle(async (req: Request) => {
  const { username, password } = schema.parse(await req.json());
  const user = await prisma.adminUser.findUnique({ where: { username } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw new HttpError(401, "Identifiants invalides");
  }
  await createSession(user.username);
  return NextResponse.json({ ok: true });
});
