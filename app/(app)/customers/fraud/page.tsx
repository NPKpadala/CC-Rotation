import Link from "next/link";
import { ShieldAlert, Lock } from "lucide-react";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FraudForm } from "@/components/forms/FraudForm";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function FraudPage() {
  const items = await prisma.fraudCustomer.findMany({
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { name: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
          <ShieldAlert className="h-6 w-6 text-primary-600" /> Fraud Management
        </h1>
        <p className="text-sm text-slate-500">{items.length} reported · Submitted entries lock for non-admins</p>
      </div>

      <FraudForm />

      <Card>
        <CardHeader>
          <CardTitle>Reported Fraud</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">No entries.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Card</TableHead>
                  <TableHead>Reported By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-mono">{f.mobile}</TableCell>
                    <TableCell>{f.name ?? "—"}</TableCell>
                    <TableCell className="text-xs">{f.cardDetails ?? "—"}</TableCell>
                    <TableCell className="text-xs">{f.createdBy?.name ?? "—"}</TableCell>
                    <TableCell className="text-xs">{formatDate(f.createdAt)}</TableCell>
                    <TableCell>
                      {f.isSubmitted ? (
                        <Badge variant="destructive">
                          <Lock className="mr-1 h-3 w-3" /> Submitted
                        </Badge>
                      ) : (
                        <Badge variant="warning">Editable</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Link href={`/customers/fraud/${f.id}`} className="text-sm text-primary-600 hover:text-primary-700">
                        View →
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
