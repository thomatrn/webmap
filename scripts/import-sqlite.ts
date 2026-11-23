/**
 * Import unique des données de l'ancienne base SQLite vers la base Postgres de DATABASE_URL.
 *
 *   1. python3 scripts/export-sqlite.py prisma/dev.sqlite.backup > prisma/sqlite-export.json
 *   2. pnpm tsx --env-file=.env scripts/import-sqlite.ts prisma/sqlite-export.json
 *
 * Idempotent : les lignes déjà présentes (même id) sont ignorées.
 */
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

type Row = Record<string, unknown>;
const prisma = new PrismaClient();

const date = (v: unknown) => new Date(Number(v));
const bool = (v: unknown) => v === 1 || v === true;

async function main() {
  const file = process.argv[2];
  if (!file) throw new Error("Usage: import-sqlite.ts <export.json>");
  const data = JSON.parse(readFileSync(file, "utf8")) as Record<string, Row[]>;

  const users = await prisma.adminUser.createMany({
    skipDuplicates: true,
    data: data.AdminUser.map((r) => ({
      id: String(r.id),
      username: String(r.username),
      passwordHash: String(r.passwordHash),
      createdAt: date(r.createdAt),
    })),
  });
  const zones = await prisma.zone.createMany({
    skipDuplicates: true,
    data: data.Zone.map((r) => ({
      id: String(r.id),
      name: String(r.name),
      description: String(r.description),
      category: String(r.category),
      color: String(r.color),
      fillOpacity: Number(r.fillOpacity),
      strokeWidth: Number(r.strokeWidth),
      dashed: bool(r.dashed),
      points: String(r.points),
      createdAt: date(r.createdAt),
      updatedAt: date(r.updatedAt),
    })),
  });
  const markers = await prisma.marker.createMany({
    skipDuplicates: true,
    data: data.Marker.map((r) => ({
      id: String(r.id),
      name: String(r.name),
      description: String(r.description),
      type: String(r.type),
      linkedGarage: bool(r.linkedGarage),
      x: Number(r.x),
      y: Number(r.y),
      createdAt: date(r.createdAt),
      updatedAt: date(r.updatedAt),
    })),
  });
  const logs = await prisma.auditLog.createMany({
    skipDuplicates: true,
    data: data.AuditLog.map((r) => ({
      id: String(r.id),
      action: String(r.action),
      entityType: String(r.entityType),
      entityId: String(r.entityId),
      actor: String(r.actor),
      before: r.before == null ? null : String(r.before),
      after: r.after == null ? null : String(r.after),
      createdAt: date(r.createdAt),
    })),
  });
  console.log(`✔ importé : ${users.count} admin(s), ${zones.count} zone(s), ${markers.count} icône(s), ${logs.count} log(s)`);
}

main().finally(() => prisma.$disconnect());
