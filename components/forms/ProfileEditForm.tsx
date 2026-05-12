"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Save,
  Loader2,
  Lock,
  ChevronLeft,
  User,
  MapPin,
  FileText,
  Briefcase,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PhotoUpload } from "@/components/shared/PhotoUpload";
import { updateProfileById } from "@/actions/profile.actions";
import { decimalToNumber } from "@/lib/utils";

interface ProfileEditFormProps {
  profile: {
    id: string;
    name: string;
    mobile: string;
    alternativeNumber: string | null;
    email: string | null;
    selfiePhotoUrl: string | null;
    dateOfBirth: Date | null;
    occupation: string | null;
    aadhaarNumber: string | null;
    panNumber: string | null;
    aadhaarFrontUrl: string | null;
    aadhaarBackUrl: string | null;
    panCardUrl: string | null;
    permanentAddressLine1: string | null;
    permanentAddressLine2: string | null;
    permanentLandmark: string | null;
    permanentCity: string | null;
    permanentState: string | null;
    permanentPincode: string | null;
    currentSameAsPermanent: boolean;
    currentAddressLine1: string | null;
    currentAddressLine2: string | null;
    currentLandmark: string | null;
    currentCity: string | null;
    currentState: string | null;
    currentPincode: string | null;
    gasBillUrl: string | null;
    electricityBillUrl: string | null;
    rentAgreementUrl: string | null;
    bankPassbookUrl: string | null;
    internalNotes: string | null;
    oldPendings: unknown;
    clearedOldPendings: unknown;
  };
  isAdmin: boolean;
}

export function ProfileEditForm({ profile, isAdmin }: ProfileEditFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Controlled state for the toggle behavior
  const [currentSameAsPermanent, setCurrentSameAsPermanent] = useState(
    profile.currentSameAsPermanent
  );

  // Photo URL state — PhotoUpload's onUploaded fires; hidden inputs carry value
  const [photos, setPhotos] = useState({
    selfiePhotoUrl: profile.selfiePhotoUrl ?? "",
    aadhaarFrontUrl: profile.aadhaarFrontUrl ?? "",
    aadhaarBackUrl: profile.aadhaarBackUrl ?? "",
    panCardUrl: profile.panCardUrl ?? "",
    gasBillUrl: profile.gasBillUrl ?? "",
    electricityBillUrl: profile.electricityBillUrl ?? "",
    rentAgreementUrl: profile.rentAgreementUrl ?? "",
    bankPassbookUrl: profile.bankPassbookUrl ?? "",
  });

  function setPhoto(name: keyof typeof photos, url: string) {
    setPhotos((p) => ({ ...p, [name]: url }));
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set("currentSameAsPermanent", String(currentSameAsPermanent));
    // PhotoUpload uses hidden inputs internally — but to be safe, set them all
    for (const [k, v] of Object.entries(photos)) fd.set(k, v);

    startTransition(async () => {
      const r = await updateProfileById(profile.id, fd);
      if (!r.success) {
        setError(r.error ?? "Failed");
        toast.error(r.error ?? "Failed");
        return;
      }
      toast.success("Profile updated");
      router.push(`/profiles/${profile.id}?mode=view`);
      router.refresh();
    });
  }

  const dob = profile.dateOfBirth ? profile.dateOfBirth.toISOString().slice(0, 10) : "";

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Top action bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/40 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-amber-900">✏️ Edit Mode</p>
          <p className="text-xs text-amber-700">
            All sections below are now editable. Mobile is locked once set.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/profiles/${profile.id}?mode=view`)}
            disabled={isPending}
          >
            <ChevronLeft className="h-4 w-4" /> Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
            ) : (
              <><Save className="h-4 w-4" /> Save Changes</>
            )}
          </Button>
        </div>
      </div>

      {/* Identity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4 text-primary-600" /> Identity & Contact
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name *</Label>
            <Input id="name" name="name" required minLength={2} defaultValue={profile.name} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mobile" className="flex items-center gap-1">
              Mobile <Lock className="h-3 w-3 text-slate-400" />
            </Label>
            <Input
              id="mobile"
              name="mobile"
              value={profile.mobile}
              disabled
              readOnly
              className="bg-slate-50 text-slate-500"
            />
            <p className="text-[11px] text-slate-500">
              Mobile is locked once set — primary identifier for matching customers + WhatsApp.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="alternativeNumber">Alt Mobile</Label>
            <Input
              id="alternativeNumber"
              name="alternativeNumber"
              pattern="[6-9]\d{9}"
              maxLength={10}
              inputMode="numeric"
              defaultValue={profile.alternativeNumber ?? ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" defaultValue={profile.email ?? ""} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dateOfBirth">Date of Birth</Label>
            <Input id="dateOfBirth" name="dateOfBirth" type="date" defaultValue={dob} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="occupation" className="flex items-center gap-1">
              <Briefcase className="h-3 w-3" /> Occupation
            </Label>
            <Input id="occupation" name="occupation" defaultValue={profile.occupation ?? ""} />
          </div>
        </CardContent>
      </Card>

      {/* Government IDs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-primary-600" /> Government IDs
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="aadhaarNumber">Aadhaar Number</Label>
            <Input
              id="aadhaarNumber"
              name="aadhaarNumber"
              pattern="\d{12}"
              maxLength={12}
              inputMode="numeric"
              defaultValue={profile.aadhaarNumber ?? ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="panNumber">PAN Number</Label>
            <Input
              id="panNumber"
              name="panNumber"
              pattern="[A-Z]{5}[0-9]{4}[A-Z]{1}"
              maxLength={10}
              defaultValue={profile.panNumber ?? ""}
              className="uppercase"
              onChange={(e) => {
                e.target.value = e.target.value.toUpperCase();
              }}
            />
          </div>

          <PhotoUpload
            name="aadhaarFrontUrl"
            label="Aadhaar Front"
            defaultUrl={profile.aadhaarFrontUrl ?? undefined}
            onUploaded={(url) => setPhoto("aadhaarFrontUrl", url)}
          />

          <PhotoUpload
            name="aadhaarBackUrl"
            label="Aadhaar Back"
            defaultUrl={profile.aadhaarBackUrl ?? undefined}
            onUploaded={(url) => setPhoto("aadhaarBackUrl", url)}
          />

          <PhotoUpload
            name="panCardUrl"
            label="PAN Card"
            defaultUrl={profile.panCardUrl ?? undefined}
            onUploaded={(url) => setPhoto("panCardUrl", url)}
          />

          <PhotoUpload
            name="selfiePhotoUrl"
            label="Selfie"
            defaultUrl={profile.selfiePhotoUrl ?? undefined}
            onUploaded={(url) => setPhoto("selfiePhotoUrl", url)}
          />
        </CardContent>
      </Card>

      {/* Permanent Address */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4 text-primary-600" /> Permanent Address
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="permanentAddressLine1">Address Line 1</Label>
            <Input
              id="permanentAddressLine1"
              name="permanentAddressLine1"
              defaultValue={profile.permanentAddressLine1 ?? ""}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="permanentAddressLine2">Address Line 2</Label>
            <Input
              id="permanentAddressLine2"
              name="permanentAddressLine2"
              defaultValue={profile.permanentAddressLine2 ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="permanentLandmark">Landmark</Label>
            <Input
              id="permanentLandmark"
              name="permanentLandmark"
              defaultValue={profile.permanentLandmark ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="permanentCity">City</Label>
            <Input
              id="permanentCity"
              name="permanentCity"
              defaultValue={profile.permanentCity ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="permanentState">State</Label>
            <Input
              id="permanentState"
              name="permanentState"
              defaultValue={profile.permanentState ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="permanentPincode">Pincode</Label>
            <Input
              id="permanentPincode"
              name="permanentPincode"
              pattern="\d{6}"
              maxLength={6}
              inputMode="numeric"
              defaultValue={profile.permanentPincode ?? ""}
            />
          </div>
        </CardContent>
      </Card>

      {/* Current Address (with same-as toggle) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4 text-primary-600" /> Current Address
          </CardTitle>
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={currentSameAsPermanent}
              onChange={(e) => setCurrentSameAsPermanent(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
            />
            Same as permanent
          </label>
        </CardHeader>
        {!currentSameAsPermanent && (
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="currentAddressLine1">Address Line 1</Label>
              <Input
                id="currentAddressLine1"
                name="currentAddressLine1"
                defaultValue={profile.currentAddressLine1 ?? ""}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="currentAddressLine2">Address Line 2</Label>
              <Input
                id="currentAddressLine2"
                name="currentAddressLine2"
                defaultValue={profile.currentAddressLine2 ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currentLandmark">Landmark</Label>
              <Input
                id="currentLandmark"
                name="currentLandmark"
                defaultValue={profile.currentLandmark ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currentCity">City</Label>
              <Input
                id="currentCity"
                name="currentCity"
                defaultValue={profile.currentCity ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currentState">State</Label>
              <Input
                id="currentState"
                name="currentState"
                defaultValue={profile.currentState ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currentPincode">Pincode</Label>
              <Input
                id="currentPincode"
                name="currentPincode"
                pattern="\d{6}"
                maxLength={6}
                inputMode="numeric"
                defaultValue={profile.currentPincode ?? ""}
              />
            </div>
          </CardContent>
        )}
      </Card>

      {/* Local Proof Documents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-primary-600" /> Local Proof Documents
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <PhotoUpload
            name="gasBillUrl"
            label="Gas Bill"
            documentMode
            defaultUrl={profile.gasBillUrl ?? undefined}
            onUploaded={(url) => setPhoto("gasBillUrl", url)}
          />
          <PhotoUpload
            name="electricityBillUrl"
            label="Electricity Bill"
            documentMode
            defaultUrl={profile.electricityBillUrl ?? undefined}
            onUploaded={(url) => setPhoto("electricityBillUrl", url)}
          />
          <PhotoUpload
            name="rentAgreementUrl"
            label="Rent Agreement"
            documentMode
            defaultUrl={profile.rentAgreementUrl ?? undefined}
            onUploaded={(url) => setPhoto("rentAgreementUrl", url)}
          />
          <PhotoUpload
            name="bankPassbookUrl"
            label="Bank Passbook"
            documentMode
            defaultUrl={profile.bankPassbookUrl ?? undefined}
            onUploaded={(url) => setPhoto("bankPassbookUrl", url)}
          />
        </CardContent>
      </Card>

      {/* Old Pendings — admin only */}
      <Card className={isAdmin ? "" : "opacity-60"}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            Old Pendings (Ledger)
            {!isAdmin && <Lock className="h-3.5 w-3.5 text-slate-400" />}
          </CardTitle>
          {!isAdmin && (
            <p className="text-xs text-slate-500">Only admins can edit these values.</p>
          )}
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="oldPendings">Old Pendings (₹)</Label>
            <Input
              id="oldPendings"
              name="oldPendings"
              type="number"
              step="0.01"
              min="0"
              disabled={!isAdmin}
              defaultValue={String(decimalToNumber(profile.oldPendings))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="clearedOldPendings">Cleared Old Pendings (₹)</Label>
            <Input
              id="clearedOldPendings"
              name="clearedOldPendings"
              type="number"
              step="0.01"
              min="0"
              disabled={!isAdmin}
              defaultValue={String(decimalToNumber(profile.clearedOldPendings))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Internal Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Internal Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            name="internalNotes"
            rows={4}
            defaultValue={profile.internalNotes ?? ""}
            placeholder="Notes for internal team only — not shown to customer."
          />
        </CardContent>
      </Card>

      {error && (
        <div className="inline-flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" /> {error}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/profiles/${profile.id}?mode=view`)}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
          ) : (
            <><Save className="h-4 w-4" /> Save Changes</>
          )}
        </Button>
      </div>
    </form>
  );
}
