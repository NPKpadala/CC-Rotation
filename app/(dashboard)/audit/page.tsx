import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/rbac";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

export default async function AuditPage({ searchParams }: { searchParams: { page?: string } }) {
  const s = await requireSession();
  if (s.user.role !== "ADMIN") redirect("/dashboard");
  const page = Math.max(1, parseInt(searchParams.page || "1", 10));
  const take = 50;
  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({ orderBy: { timestamp: "desc" }, skip: (page-1)*take, take, include: { user: { select: { name: true, email: true } } } }),
    prisma.auditLog.count(),
  ]);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Audit Logs</h1>
      <Card>
        <CardHeader><CardTitle>{total} entries</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <THead><TR><TH>Time</TH><TH>Action</TH><TH>Entity</TH><TH>Entity ID</TH><TH>By</TH></TR></THead>
            <TBody>
              {logs.map((l) => (
                <TR key={l.id}>
                  <TD>{format(l.timestamp, "dd MMM yyyy HH:mm:ss")}</TD>
                  <TD>{l.action}</TD>
                  <TD>{l.entityType}</TD>
                  <TD className="font-mono text-xs">{l.entityId}</TD>
                  <TD>{l.user.name || l.user.email}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
