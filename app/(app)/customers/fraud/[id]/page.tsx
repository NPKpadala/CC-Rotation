import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Lock } from "lucide-react";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { canEditFraudAfterSubmit } from "@/lib/rbac";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FraudEditClient } from "./FraudEditClient";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function FraudDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();
  const f = await prisma.fraudCustomer.findUnique({
    where: { id: params.id },
    include: { createdBy: { select: { name: true } } },
  });
  if (!f) notFound();

  const canEdit = !f.isSubmitted || canEditFraudAfterSubmit(session?.user?.role ?? "");

  return (
    <div className="space-y-6">
      <div>
        <Link href="/customers/fraud" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
          <ChevronLeft className="h-4 w-4" /> Back to fraud list
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900">Fraud Entry — {f.mobile}</h1>
          {f.isSubmitted ? (
            <Badge variant="destructive">
              <Lock className="mr-1 h-3 w-3" /> Locked (Submitted)
            </Badge>
          ) : (
            <Badge variant="warning">Editable</Badge>
          )}
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Reported by {f.createdBy?.name ?? "—"} on {formatDateTime(f.createdAt)}
          {f.submittedAt && ` · Submitted ${formatDateTime(f.submittedAt)}`}
        </p>
      </div>

      <FraudEditClient
        fraud={{
          id: f.id,
          mobile: f.mobile,
          name: f.name,
          cardDetails: f.cardDetails,
          remarks: f.remarks,
          isSubmitted: f.isSubmitted,
          cardPhotoUrls: f.cardPhotoUrls,
        }}
        canEdit={canEdit}
        userRole={session?.user?.role ?? "EMPLOYEE"}
      />

      {!canEdit && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 text-sm text-red-700">
            <Lock className="mr-2 inline h-4 w-4" />
            This fraud entry has been submitted and is locked. Only an administrator can modify it now.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
