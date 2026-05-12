"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useWizard, type WizardData } from "./wizard-context";
import { INDIAN_STATES } from "@/lib/validations/india";

export function Step2Address({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const { data, update } = useWizard();
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (data.permanentPincode && !/^[1-9]\d{5}$/.test(data.permanentPincode))
      e.permanentPincode = "6 digits, can't start with 0";
    if (
      !data.currentSameAsPermanent &&
      data.currentPincode &&
      !/^[1-9]\d{5}$/.test(data.currentPincode)
    )
      e.currentPincode = "6 digits, can't start with 0";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleNext(ev: React.FormEvent) {
    ev.preventDefault();
    if (validate()) onNext();
  }

  return (
    <form onSubmit={handleNext} className="space-y-6">
      <AddressBlock
        title="Permanent Address"
        prefix="permanent"
        data={data}
        update={update}
        errors={errors}
      />

      <Card>
        <CardContent className="p-6">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={data.currentSameAsPermanent}
              onChange={(e) => update({ currentSameAsPermanent: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="font-medium text-slate-700">Current address is same as permanent</span>
          </label>
        </CardContent>
      </Card>

      {!data.currentSameAsPermanent && (
        <AddressBlock
          title="Current Address"
          prefix="current"
          data={data}
          update={update}
          errors={errors}
        />
      )}

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          ← Back
        </button>
        <button
          type="submit"
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary-600 px-4 text-sm font-medium text-white transition-colors hover:bg-primary-700"
        >
          Next: Documents →
        </button>
      </div>
    </form>
  );
}

function AddressBlock({
  title,
  prefix,
  data,
  update,
  errors,
}: {
  title: string;
  prefix: "permanent" | "current";
  data: WizardData;
  update: (p: Partial<WizardData>) => void;
  errors: Record<string, string>;
}) {
  const k = (suffix: string) => `${prefix}${suffix.charAt(0).toUpperCase()}${suffix.slice(1)}` as keyof WizardData;
  const get = (suffix: string) => (data[k(suffix)] as string) ?? "";
  const set = (suffix: string, value: string) => update({ [k(suffix)]: value });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor={`${prefix}AddressLine1`}>Address Line 1</Label>
          <Input
            id={`${prefix}AddressLine1`}
            value={get("addressLine1")}
            onChange={(e) => set("addressLine1", e.target.value)}
            placeholder="Flat / House / Building"
            maxLength={200}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor={`${prefix}AddressLine2`}>Address Line 2</Label>
          <Input
            id={`${prefix}AddressLine2`}
            value={get("addressLine2")}
            onChange={(e) => set("addressLine2", e.target.value)}
            placeholder="Street / Area / Locality"
            maxLength={200}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${prefix}Landmark`}>Landmark</Label>
          <Input
            id={`${prefix}Landmark`}
            value={get("landmark")}
            onChange={(e) => set("landmark", e.target.value)}
            placeholder="Near…"
            maxLength={100}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${prefix}City`}>City</Label>
          <Input
            id={`${prefix}City`}
            value={get("city")}
            onChange={(e) => set("city", e.target.value)}
            maxLength={80}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${prefix}State`}>State</Label>
          <Select
            id={`${prefix}State`}
            value={get("state")}
            onChange={(e) => set("state", e.target.value)}
          >
            <option value="">— Select state —</option>
            {INDIAN_STATES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${prefix}Pincode`}>Pincode</Label>
          <Input
            id={`${prefix}Pincode`}
            value={get("pincode")}
            onChange={(e) => set("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            maxLength={6}
            placeholder="500001"
          />
          {errors[`${prefix}Pincode`] && (
            <p className="text-xs text-red-600">{errors[`${prefix}Pincode`]}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
