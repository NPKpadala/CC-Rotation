"use client";

import { useEffect, useState, useTransition } from "react";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { PhotoUpload } from "@/components/shared/PhotoUpload";
import { useWizard } from "./wizard-context";
import { checkDuplicateMobile } from "@/actions/profile.actions";

export function Step1Identity({ onNext }: { onNext: () => void }) {
  const { data, update } = useWizard();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dupCheck, setDupCheck] = useState<{ name: string } | null>(null);
  const [isCheckingDup, startDupCheck] = useTransition();

  // Debounced duplicate-mobile check
  useEffect(() => {
    if (!/^[6-9]\d{9}$/.test(data.mobile)) {
      setDupCheck(null);
      return;
    }
    const timer = setTimeout(() => {
      startDupCheck(async () => {
        const r = await checkDuplicateMobile(data.mobile);
        setDupCheck(r.exists && r.existingProfile ? { name: r.existingProfile.name } : null);
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [data.mobile]);

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (data.name.trim().length < 2) e.name = "Name must be at least 2 characters";
    if (!/^[6-9]\d{9}$/.test(data.mobile)) e.mobile = "10 digits, must start with 6-9";
    if (data.alternativeNumber && !/^[6-9]\d{9}$/.test(data.alternativeNumber))
      e.alternativeNumber = "Alt mobile must be 10 digits starting with 6-9";
    if (data.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email)) e.email = "Invalid email";
    if (data.aadhaarNumber && !/^\d{12}$/.test(data.aadhaarNumber)) e.aadhaarNumber = "Must be 12 digits";
    if (data.panNumber && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(data.panNumber.toUpperCase()))
      e.panNumber = "Format: ABCDE1234F";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleNext(e: React.FormEvent) {
    e.preventDefault();
    if (validate()) onNext();
  }

  return (
    <form onSubmit={handleNext} className="space-y-6">
      <Card>
        <CardContent className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <PhotoUpload
              name="selfiePhotoUrl"
              label="Customer Photo (helps employees recognize repeat customers)"
              defaultUrl={data.selfiePhotoUrl}
              onUploaded={(url) => update({ selfiePhotoUrl: url })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Full Name *</Label>
            <Input
              id="name"
              autoFocus
              value={data.name}
              onChange={(e) => update({ name: e.target.value })}
              placeholder="Ravi Kumar"
              maxLength={100}
              required
            />
            {errors.name && <p className="text-xs text-red-600">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="mobile">Mobile Number *</Label>
            <Input
              id="mobile"
              value={data.mobile}
              onChange={(e) => update({ mobile: e.target.value.replace(/\D/g, "").slice(0, 10) })}
              inputMode="numeric"
              maxLength={10}
              placeholder="9876543210"
              required
            />
            {errors.mobile && <p className="text-xs text-red-600">{errors.mobile}</p>}

            {isCheckingDup && (
              <p className="inline-flex items-center gap-1 text-xs text-slate-500">
                <Loader2 className="h-3 w-3 animate-spin" /> Checking…
              </p>
            )}
            {dupCheck && !isCheckingDup && (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
                <p className="inline-flex items-start gap-2 text-xs text-amber-800">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                  <span>
                    This mobile already belongs to <strong>{dupCheck.name}</strong>. You can continue if this is a
                    different person.
                  </span>
                </p>
              </div>
            )}
            {!dupCheck && /^[6-9]\d{9}$/.test(data.mobile) && !isCheckingDup && (
              <p className="inline-flex items-center gap-1 text-xs text-green-600">
                <CheckCircle2 className="h-3 w-3" /> Mobile is unique
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="alternativeNumber">Alternative Number</Label>
            <Input
              id="alternativeNumber"
              value={data.alternativeNumber}
              onChange={(e) =>
                update({ alternativeNumber: e.target.value.replace(/\D/g, "").slice(0, 10) })
              }
              inputMode="numeric"
              maxLength={10}
              placeholder="Optional"
            />
            {errors.alternativeNumber && <p className="text-xs text-red-600">{errors.alternativeNumber}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={data.email}
              onChange={(e) => update({ email: e.target.value })}
              placeholder="ravi@example.com"
            />
            {errors.email && <p className="text-xs text-red-600">{errors.email}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="dateOfBirth">Date of Birth</Label>
            <Input
              id="dateOfBirth"
              type="date"
              value={data.dateOfBirth}
              onChange={(e) => update({ dateOfBirth: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="occupation">Occupation</Label>
            <Input
              id="occupation"
              value={data.occupation}
              onChange={(e) => update({ occupation: e.target.value })}
              placeholder="e.g. Business owner, Salaried"
              maxLength={80}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="aadhaarNumber">Aadhaar Number</Label>
            <Input
              id="aadhaarNumber"
              value={data.aadhaarNumber}
              onChange={(e) => update({ aadhaarNumber: e.target.value.replace(/\D/g, "").slice(0, 12) })}
              inputMode="numeric"
              maxLength={12}
              placeholder="12 digits"
            />
            {errors.aadhaarNumber && <p className="text-xs text-red-600">{errors.aadhaarNumber}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="panNumber">PAN Number</Label>
            <Input
              id="panNumber"
              value={data.panNumber}
              onChange={(e) => update({ panNumber: e.target.value.toUpperCase().slice(0, 10) })}
              maxLength={10}
              placeholder="ABCDE1234F"
              className="uppercase"
            />
            {errors.panNumber && <p className="text-xs text-red-600">{errors.panNumber}</p>}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end">
        <button
          type="submit"
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary-600 px-4 text-sm font-medium text-white transition-colors hover:bg-primary-700"
        >
          Next: Address →
        </button>
      </div>
    </form>
  );
}
