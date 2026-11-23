import type { Prisma } from "@prisma/client";

export type AuditAction = "CREATE" | "UPDATE" | "DELETE" | "REVERT";
export type EntityType = "ZONE" | "MARKER";

export async function writeLog(
  tx: Prisma.TransactionClient,
  entry: {
    action: AuditAction;
    entityType: EntityType;
    entityId: string;
    actor: string;
    before?: unknown;
    after?: unknown;
  },
) {
  await tx.auditLog.create({
    data: {
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      actor: entry.actor,
      before: entry.before === undefined ? null : JSON.stringify(entry.before),
      after: entry.after === undefined ? null : JSON.stringify(entry.after),
    },
  });
}
