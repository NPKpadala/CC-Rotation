import { prisma } from "./db";

export async function logAudit(opts: {
  action: string;
  entityType: string;
  entityId: string;
  performedBy: string;
  meta?: Record<string, unknown>;
}) {
  await prisma.auditLog.create({
    data: {
      action: opts.action,
      entityType: opts.entityType,
      entityId: opts.entityId,
      performedBy: opts.performedBy,
      meta: (opts.meta as any) ?? undefined,
    },
  });
}
