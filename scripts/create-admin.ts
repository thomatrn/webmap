/**
 * Crée ou met à jour un compte admin.
 *   pnpm admin:create <username> <password>
 * Sans arguments : utilise ADMIN_USERNAME / ADMIN_PASSWORD du .env
 */
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password";

const prisma = new PrismaClient();

async function main() {
  const username = process.argv[2] ?? process.env.ADMIN_USERNAME;
  const password = process.argv[3] ?? process.env.ADMIN_PASSWORD;
  if (!username || !password) {
    console.error("Usage: pnpm admin:create <username> <password>");
    process.exit(1);
  }
  const passwordHash = await hashPassword(password);
  await prisma.adminUser.upsert({
    where: { username },
    create: { username, passwordHash },
    update: { passwordHash },
  });
  console.log(`✔ Admin "${username}" prêt.`);
}

main().finally(() => prisma.$disconnect());
