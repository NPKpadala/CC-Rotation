"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createProfile } from "@/actions/profile.actions";

export function ProfileCreateForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);

    startTransition(async () => {
      const r = await createProfile(fd);
      if (!r.success) {
        setError(r.error ?? "Failed");
        toast.error(r.error ?? "Failed");
        return;
      }
      toast.success("Profile created");
      if (r.data?.id) router.push(`/profiles/${r.data.id}`);
      else router.push("/profiles");
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Customer Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name *</Label>
            <Input id="name" name="name" required minLength={2} maxLength={100} placeholder="Ravi Kumar" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mobile">Mobile (10 digits) *</Label>
            <Input id="mobile" name="mobile" required pattern="[1-9]\d{9}" inputMode="numeric" maxLength={10} placeholder="9876543210" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="alternativeNumber">Alternative Number</Label>
            <Input id="alternativeNumber" name="alternativeNumber" inputMode="numeric" maxLength={10} placeholder="Optional" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" placeholder="ravi@example.com" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="internalNotes">Internal Notes</Label>
            <Textarea id="internalNotes" name="internalNotes" rows={3} placeholder="Anything the team should know about this customer..." />
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : "Create Profile"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
