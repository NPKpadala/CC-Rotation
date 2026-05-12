import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ScrollText, Search } from "lucide-react";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime, parseIntSafe, buildPagination } from "@/lib/utils";
import { PAGE_SIZE } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: { entityType?: string; action?: string; page?: string; q?: string };
}) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect("/dashboard");

  const page = parseIntSafe(searchParams.page, 1);
  const skip = (page - 1) * PAGE_SIZE;
  const q = searchParams.q?.trim() ?? "";

  const where = {
    ...(searchParams.entityType ? { entityType: searchParams.entityType } : {}),
    ...(searchParams.action
      ? { action: searchParams.action as "CREATE" | "UPDATE" | "DELETE" | "LOGIN" | "LOGOUT" | "SUBMIT" | "EXPORT" }
      : {}),
    ...(q ? { description: { contains: q, mode: "insensitive" as const } } : {}),
  };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
      include: { performedBy: { select: { name: true, mobile: true } } },
    }),
    prisma.auditLog.count({ where }),
  ]);

  const pagination = buildPagination(page, PAGE_SIZE, total);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
          <ScrollText className="h-6 w-6 text-primary-600" /> Audit Logs
        </h1>
        <p className="text-sm text-slate-500">{total.toLocaleString("en-IN")} events recorded</p>
      </div>

      <Card>
        <CardHeader>
          <form className="flex flex-wrap gap-2">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input name="q" defaultValue={q} placeholder="Search description..." className="pl-10" />
            </div>
            <Select name="entityType" defaultValue={searchParams.entityType ?? ""} className="w-[160px]">
              <option value="">All entities</option>
              <option value="Profile">Profile</option>
              <option value="Card">Card</option>
              <option value="Transaction">Transaction</option>
              <option value="User">User</option>
              <option value="FraudCustomer">Fraud</option>
              <option value="Report">Report</option>
            </Select>
            <Select name="action" defaultValue={searchParams.action ?? ""} className="w-[140px]">
              <option value="">All actions</option>
              <option value="CREATE">Create</option>
              <option value="UPDATE">Update</option>
              <option value="DELETE">Delete</option>
              <option value="LOGIN">Login</option>
              <option value="SUBMIT">Submit</option>
              <option value="EXPORT">Export</option>
            </Select>
            <Button type="submit" variant="outline" size="sm">Filter</Button>
          </form>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Performed By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="whitespace-nowrap font-mono text-xs">{formatDateTime(l.createdAt)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        l.action === "DELETE"
                          ? "destructive"
                          : l.action === "CREATE"
                          ? "success"
                          : l.action === "EXPORT"
                          ? "outline"
                          : "secondary"
                      }
                      className="text-xs"
                    >
                      {l.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    <span className="font-medium">{l.entityType}</span>
                    <div className="font-mono text-[10px] text-slate-400">{l.entityId.slice(0, 12)}…</div>
                  </TableCell>
                  <TableCell className="text-sm">{l.description}</TableCell>
                  <TableCell className="text-xs">
                    {l.performedBy.name}
                    <div className="text-slate-400">{l.performedBy.mobile}</div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Page {pagination.page} of {pagination.totalPages}
          </p>
          <div className="flex gap-2">
            {pagination.hasPrev && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/admin/audit?page=${page - 1}`}>← Prev</Link>
              </Button>
            )}
            {pagination.hasNext && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/admin/audit?page=${page + 1}`}>Next →</Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
