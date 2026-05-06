"use client";
import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { profileSchema, type ProfileInput } from "@/lib/validations";
import { createProfile } from "@/app/actions/profiles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus } from "lucide-react";

export default function ProfileForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, control, formState: { errors } } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: { isActive: true, cardDetails: [{ cardName: "", cardType: "VISA", cardNumber: "", expiry: "" }], bankDetails: { bankName: "", accountNumber: "", ifsc: "" } },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "cardDetails" });

  async function onSubmit(data: ProfileInput) {
    setSubmitting(true);
    try {
      const res = await createProfile(data);
      toast.success("Profile created");
      router.push(`/users/${res.id}`);
    } catch (e: any) {
      toast.error(e?.message || "Failed");
    } finally { setSubmitting(false); }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Personal Details</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div><Label>Full Name</Label><Input {...register("fullName")} />{errors.fullName && <p className="text-xs text-destructive mt-1">{errors.fullName.message}</p>}</div>
          <div><Label>Mobile</Label><Input {...register("mobile")} />{errors.mobile && <p className="text-xs text-destructive mt-1">{errors.mobile.message}</p>}</div>
          <div><Label>PAN</Label><Input {...register("pan")} className="uppercase" />{errors.pan && <p className="text-xs text-destructive mt-1">{errors.pan.message}</p>}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Card Details</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={() => append({ cardName: "", cardType: "VISA", cardNumber: "", expiry: "" })}><Plus className="h-4 w-4"/>Add Card</Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {fields.map((f, i) => (
            <div key={f.id} className="grid gap-3 md:grid-cols-5 items-end border rounded-md p-3">
              <div><Label>Card Name</Label><Input {...register(`cardDetails.${i}.cardName`)} /></div>
              <div><Label>Type</Label><Input {...register(`cardDetails.${i}.cardType`)} /></div>
              <div className="md:col-span-2"><Label>Card Number (stored masked)</Label><Input {...register(`cardDetails.${i}.cardNumber`)} placeholder="12-19 digits" /></div>
              <div className="flex gap-2">
                <div className="flex-1"><Label>Expiry</Label><Input {...register(`cardDetails.${i}.expiry`)} placeholder="MM/YY" /></div>
                {fields.length > 1 && <Button type="button" variant="ghost" size="icon" onClick={() => remove(i)}><Trash2 className="h-4 w-4 text-destructive"/></Button>}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Bank Details</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div><Label>Bank Name</Label><Input {...register("bankDetails.bankName")} /></div>
          <div><Label>Account Number</Label><Input {...register("bankDetails.accountNumber")} /></div>
          <div><Label>IFSC</Label><Input {...register("bankDetails.ifsc")} className="uppercase" /></div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit" disabled={submitting}>{submitting ? "Saving..." : "Create Profile"}</Button>
      </div>
    </form>
  );
}
