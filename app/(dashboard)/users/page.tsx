import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { maskPan } from "@/lib/utils";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

export default async function ProfilesPage({ searchParams }: { searchParams: { q?: string; page?: string } }) {
  const q = (searchParams.q || "").trim();
  const page = Math.max(1, parseInt(searchParams.page || "1", 10));
  const take = 20;
  const skip = (page - 1) * take;
  const where = q
    ? { OR: [{ fullName: { contains: q, mode: "insensitive" as const } }, { mobile: { contains: q } }, { pan: { contains: q.toUpperCase() } }] }
    : {};
  const [items, total] = await Promise.all([
    prisma.profile.findMany({ where, orderBy: { createdAt: "desc" }, skip, take, include: { _count: { select: { transactions: true } } } }),
    prisma.profile.count({ where }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / take));
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Profiles</h1>
        <Link href="/users/new-profile"><Button>+ New Profile</Button></Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Search</CardTitle>
          <form className="flex gap-2 mt-2"><Input name="q" defaultValue={q} placeholder="Search by name, mobile or PAN" /><Button type="submit">Search</Button></form>
        </CardHeader>
        <CardContent>
          <Table>
            <THead><TR><TH>Name</TH><TH>Mobile</TH><TH>PAN</TH><TH>Txns</TH><TH>Status</TH><TH>Created</TH><TH></TH></TR></THead>
            <TBody>
              {items.map((p) => (
                <TR key={p.id}>
                  <TD className="font-medium">{p.fullName}</TD>
                  <TD>{p.mobile}</TD>
                  <TD className="font-mono">{maskPan(p.pan)}</TD>
                  <TD>{p._count.transactions}</TD>
                  <TD><Badge variant={p.isActive ? "success" : "secondary"}>{p.isActive ? "ACTIVE" : "INACTIVE"}</Badge></TD>
                  <TD>{format(p.createdAt, "dd MMM yyyy")}</TD>
                  <TD><Link href={`/users/${p.id}`} className="text-primary text-sm hover:underline">View</Link></TD>
                </TR>
              ))}
              {items.length === 0 && <TR><TD colSpan={7} className="text-center text-muted-foreground">No profiles</TD></TR>}
            </TBody>
          </Table>
          <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
            <span>{total} profiles · Page {page} / {totalPages}</span>
            <div className="flex gap-2">
              {page > 1 && <Link href={`/users?q=${encodeURIComponent(q)}&page=${page-1}`}><Button variant="outline" size="sm">Prev</Button></Link>}
              {page < totalPages && <Link href={`/users?q=${encodeURIComponent(q)}&page=${page+1}`}><Button variant="outline" size="sm">Next</Button></Link>}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
