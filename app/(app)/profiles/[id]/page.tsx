import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronLeft,
  Phone,
  Mail,
  Calendar,
  Receipt,
  CreditCard as CardIcon,
  FileText,
  MapPin,
  Briefcase,
  Lock,
  Edit2,
  Eye,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CardGrid } from "@/components/cards/CardGrid";
import { AddCardDialog } from "@/components/cards/AddCardDialog";
import { ConductBadge } from "@/components/shared/ConductBadge";
import { OldPendingsCell } from "@/components/reports/OldPendingsCell";
import { ProfileEditForm } from "@/components/forms/ProfileEditForm";
import { formatDate, formatCurrency, decimalToNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ProfileDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { cardId?: string; mode?: string };
}) {
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";
  const mode = searchParams.mode === "edit" ? "edit" : "view";

  const profile = await prisma.profile.findUnique({
    where: { id: params.id },
    include: {
      cards: { orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }] },
      transactions: {
        orderBy: { transactionDate: "desc" },
        take: 100,
        include: { card: { select: { id: true, bankName: true, cardNumberLast4: true, cardNetwork: true } } },
      },
      createdBy: { select: { name: true } },
    },
  });

  if (!profile) notFound();

  // ─── ADDED v1.3: Edit Mode toggle ──────────────────────────────────────────
  if (mode === "edit") {
    return (
      <div className="space-y-6">
        <div>
          <Link
            href={`/profiles/${profile.id}?mode=view`}
            className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
          >
            <ChevronLeft className="h-4 w-4" /> Back to view
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">
            Editing: {profile.name}
          </h1>
          <p className="text-sm text-slate-500">{profile.mobile}</p>
        </div>

        <ProfileEditForm profile={profile} isAdmin={isAdmin} />
      </div>
    );
  }

  const filterCardId = searchParams.cardId;
  const filteredTransactions = filterCardId
    ? profile.transactions.filter((t) => t.cardId === filterCardId)
    : profile.transactions;

  const newPending = profile.transactions
    .filter((t) => t.type === "BILL_PAYMENT" && t.status === "PENDING")
    .reduce((s, t) => s + decimalToNumber(t.afterClearPending), 0);
  const oldPendings = decimalToNumber(profile.oldPendings);
  const clearedOldPendings = decimalToNumber(profile.clearedOldPendings);
  const totalPending = newPending + oldPendings - clearedOldPendings;

  const totalPaid = profile.transactions
    .filter((t) => t.type === "BILL_PAYMENT")
    .reduce((s, t) => s + decimalToNumber(t.paidAmount), 0);
  const totalCharges = profile.transactions
    .filter((t) => t.type === "BILL_PAYMENT")
    .reduce((s, t) => s + decimalToNumber(t.charges), 0);

  // Profile completion %
  const completionFields = [
    profile.email,
    profile.alternativeNumber,
    profile.dateOfBirth,
    profile.occupation,
    profile.aadhaarNumber,
    profile.panNumber,
    profile.aadhaarFrontUrl,
    profile.panCardUrl,
    profile.permanentCity,
    profile.permanentPincode,
  ];
  const filledCount = completionFields.filter((f) => f && String(f).trim() !== "").length;
  const completion = Math.round((filledCount / completionFields.length) * 100);

  // ADDED v1.2 — Per-employee pending breakdown for THIS customer
  const byHeldBy: Record<string, number> = {};
  for (const t of profile.transactions) {
    if (t.type !== "BILL_PAYMENT" || t.status !== "PENDING") continue;
    const k = t.pendingHeldBy ?? "Unassigned";
    byHeldBy[k] = (byHeldBy[k] ?? 0) + decimalToNumber(t.afterClearPending);
  }
  const heldByRows = Object.entries(byHeldBy).sort((a, b) => b[1] - a[1]);

  const cardsForGrid = profile.cards.map((c) => ({
    id: c.id,
    bankName: c.bankName,
    cardNumberLast4: c.cardNumberLast4,
    cardNumberFull: c.cardNumberFull, // ADDED v1.3
    cardNetwork: c.cardNetwork,
    holderName: c.holderName,
    defaultPercentage: Number(c.defaultPercentage),
    cardExpireMonth: c.cardExpireMonth,
    cardExpireYear: c.cardExpireYear,
    status: c.status,
    isPrimary: c.isPrimary,
    swipeAttemptCount: c.swipeAttemptCount,
  }));

  const txsForGrid = profile.transactions.map((t) => ({
    cardId: t.cardId,
    afterClearPending: decimalToNumber(t.afterClearPending),
    status: t.status,
  }));

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div>
        <Link href="/profiles" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
          <ChevronLeft className="h-4 w-4" /> Back to profiles
        </Link>

        <div className="mt-3 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div className="flex items-start gap-4">
            {profile.selfiePhotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.selfiePhotoUrl}
                alt={profile.name}
                className="h-16 w-16 rounded-full border-2 border-white object-cover shadow-md"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-xl font-bold text-white shadow-md">
                {profile.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900">{profile.name}</h1>
                <ConductBadge totalPending={totalPending} />
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" /> {profile.mobile}
                </span>
                {profile.alternativeNumber && (
                  <span className="inline-flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5 opacity-60" /> {profile.alternativeNumber}
                  </span>
                )}
                {profile.email && (
                  <span className="inline-flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" /> {profile.email}
                  </span>
                )}
                {profile.occupation && (
                  <span className="inline-flex items-center gap-1">
                    <Briefcase className="h-3.5 w-3.5" /> {profile.occupation}
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" /> {formatDate(profile.createdAt)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="default">
              <Link href={`/profiles/${profile.id}?mode=edit`}>
                <Edit2 className="h-4 w-4" /> Edit Profile
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/transactions/payments?profileId=${profile.id}`}>
                <Receipt className="h-4 w-4" /> New Payment
              </Link>
            </Button>
            <AddCardDialog
              profileId={profile.id}
              profileName={profile.name}
              profileMobile={profile.mobile}
            />
          </div>
        </div>
      </div>

      {/* KPI BAND */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
        <KPI label="Cards" value={profile.cards.length.toString()} icon={<CardIcon className="h-4 w-4" />} />
        <KPI label="Total Paid" value={formatCurrency(totalPaid)} />
        <KPI label="Charges Earned" value={formatCurrency(totalCharges)} accent="primary" />
        <KPI label="New Pending" value={formatCurrency(newPending)} accent={newPending > 0 ? "orange" : "green"} />
        <KPI label="Old Pending" value={formatCurrency(oldPendings)} />
        <KPI label="Total Pending" value={formatCurrency(totalPending)} accent={totalPending > 0 ? "orange" : "green"} />
        <KPI label="Profile" value={`${completion}%`} accent={completion >= 70 ? "green" : "orange"} />
      </div>

      {/* IDENTITY & DOCUMENTS — always expanded */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary-600" /> Identity & Documents
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <InfoRow label="Aadhaar Number" value={profile.aadhaarNumber} mono />
            <InfoRow label="PAN Number" value={profile.panNumber} mono />
            <InfoRow
              label="Date of Birth"
              value={profile.dateOfBirth ? formatDate(profile.dateOfBirth) : null}
            />
          </div>

          {/* PERMANENT ADDRESS */}
          {(profile.permanentAddressLine1 || profile.permanentCity) ? (
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">
                <MapPin className="mr-1 inline h-3 w-3" /> Permanent Address
              </p>
              <p className="mt-1 text-sm text-slate-700">
                {[
                  profile.permanentAddressLine1,
                  profile.permanentAddressLine2,
                  profile.permanentLandmark,
                  profile.permanentCity,
                  profile.permanentState,
                  profile.permanentPincode,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            </div>
          ) : (
            <p className="text-sm italic text-slate-400">No permanent address on file</p>
          )}

          {/* CURRENT ADDRESS — only if different */}
          {!profile.currentSameAsPermanent && profile.currentAddressLine1 && (
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">
                <MapPin className="mr-1 inline h-3 w-3" /> Current Address
              </p>
              <p className="mt-1 text-sm text-slate-700">
                {[
                  profile.currentAddressLine1,
                  profile.currentAddressLine2,
                  profile.currentLandmark,
                  profile.currentCity,
                  profile.currentState,
                  profile.currentPincode,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            </div>
          )}

          {/* DOCUMENTS GRID — always visible */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Documents</p>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              <DocLink label="Aadhaar Front" url={profile.aadhaarFrontUrl} />
              <DocLink label="Aadhaar Back" url={profile.aadhaarBackUrl} />
              <DocLink label="PAN Card" url={profile.panCardUrl} />
              <DocLink label="Selfie" url={profile.selfiePhotoUrl} />
              <DocLink label="Gas Bill" url={profile.gasBillUrl} />
              <DocLink label="Electricity Bill" url={profile.electricityBillUrl} />
              <DocLink label="Rent Agreement" url={profile.rentAgreementUrl} />
              <DocLink label="Bank Passbook" url={profile.bankPassbookUrl} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CARDS GRID */}
      <section>
        <div className="mb-3">
          <h2 className="text-lg font-bold text-slate-900">Cards</h2>
          <p className="text-xs text-slate-500">Click any card to see its full details + transactions</p>
        </div>
        <CardGrid cards={cardsForGrid} transactions={txsForGrid} />
      </section>

      {/* PENDING BREAKDOWN */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div>
              <p className="text-xs uppercase text-slate-500">New Pendings</p>
              <p className="mt-1 font-mono text-lg font-bold tabular-nums text-orange-600">{formatCurrency(newPending)}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500">+ Old Pendings</p>
              <div className="mt-1 text-lg font-bold">
                <OldPendingsCell
                  profileId={profile.id}
                  oldPendings={oldPendings}
                  clearedOldPendings={clearedOldPendings}
                  field="oldPendings"
                  canEdit={isAdmin}
                />
              </div>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500">− Cleared Old</p>
              <div className="mt-1 text-lg font-bold">
                <OldPendingsCell
                  profileId={profile.id}
                  oldPendings={oldPendings}
                  clearedOldPendings={clearedOldPendings}
                  field="clearedOldPendings"
                  canEdit={isAdmin}
                />
              </div>
            </div>
            <div className="rounded-lg border-2 border-primary-200 bg-primary-50/40 p-2">
              <p className="text-xs font-semibold uppercase text-primary-700">TOTAL PENDING</p>
              <p className="mt-1 font-mono text-xl font-bold tabular-nums text-primary-700">{formatCurrency(totalPending)}</p>
            </div>
          </div>

          {heldByRows.length > 0 && (
            <div className="mt-4 border-t border-slate-100 pt-3">
              <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Pending held by employee</p>
              <div className="flex flex-wrap gap-2">
                {heldByRows.map(([name, amt]) => (
                  <div key={name} className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs">
                    <span className="font-medium text-slate-700">{name}:</span>{" "}
                    <span className="font-mono font-semibold text-orange-600">{formatCurrency(amt)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* TRANSACTION TABLE WITH CARD FILTER + EDIT ACTION */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle>Transactions ({filteredTransactions.length})</CardTitle>
            <p className="text-xs text-slate-500">
              {filterCardId ? `Filtered to one card · ` : `Across all cards · `}
              <span className="font-semibold">{profile.transactions.length}</span> total
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant={filterCardId ? "outline" : "default"} size="sm">
              <Link href={`/profiles/${profile.id}`}>All cards</Link>
            </Button>
            {profile.cards.map((c) => (
              <Button
                key={c.id}
                asChild
                variant={filterCardId === c.id ? "default" : "outline"}
                size="sm"
              >
                <Link href={`/profiles/${profile.id}?cardId=${c.id}`}>
                  {c.bankName} ••{c.cardNumberLast4}
                </Link>
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredTransactions.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">No transactions yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Card</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Charges</TableHead>
                  <TableHead className="text-right">Cleared</TableHead>
                  <TableHead className="text-right">Today Pending</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((t) => {
                  const cleared = decimalToNumber(t.clearedTotal);
                  const today = decimalToNumber(t.customerTodayPending);
                  const isLocked = t.status === "CLEARED" && !isAdmin;
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="whitespace-nowrap text-xs">{formatDate(t.transactionDate)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{t.type.replace("_", " ")}</Badge>
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {t.card ? `${t.card.bankName} ••${t.card.cardNumberLast4}` : "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">{formatCurrency(decimalToNumber(t.paidAmount))}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-primary-600">{formatCurrency(decimalToNumber(t.charges))}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {cleared > 0 ? formatCurrency(cleared) : "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">{formatCurrency(today || decimalToNumber(t.afterClearPending))}</TableCell>
                      <TableCell>
                        <Badge variant={t.status === "CLEARED" ? "success" : "warning"}>{t.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {t.type === "BILL_PAYMENT" && (
                          isLocked ? (
                            <span title="Locked — admin only" className="inline-flex items-center text-xs text-slate-400">
                              <Lock className="h-3 w-3" />
                            </span>
                          ) : (
                            <Link
                              href={`/transactions/payments/${t.id}/edit`}
                              className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700"
                            >
                              <Edit2 className="h-3 w-3" /> Edit
                            </Link>
                          )
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* INTERNAL NOTES */}
      {profile.internalNotes && (
        <Card>
          <CardHeader>
            <CardTitle>Internal Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-line text-sm text-slate-700">{profile.internalNotes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function KPI({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  accent?: "primary" | "orange" | "green";
}) {
  const accentClass =
    accent === "primary" ? "text-primary-600"
      : accent === "orange" ? "text-orange-600"
      : accent === "green" ? "text-green-600"
      : "text-slate-900";

  return (
    <Card>
      <CardContent className="p-3">
        <p className="flex items-center gap-1 text-[10px] uppercase text-slate-500">
          {icon} {label}
        </p>
        <p className={`mt-1 text-base font-bold tabular-nums ${accentClass}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string | null | undefined; mono?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase text-slate-500">{label}</p>
      <p className={`mt-0.5 text-sm text-slate-800 ${mono ? "font-mono" : ""}`}>{value || "—"}</p>
    </div>
  );
}

function DocLink({ label, url }: { label: string; url: string | null | undefined }) {
  if (!url) {
    return (
      <div className="rounded-md border border-dashed border-slate-200 px-2.5 py-1.5 text-xs text-slate-400">
        {label}
      </div>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="rounded-md border border-green-200 bg-green-50/60 px-2.5 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100"
    >
      {label} ↗
    </a>
  );
}
