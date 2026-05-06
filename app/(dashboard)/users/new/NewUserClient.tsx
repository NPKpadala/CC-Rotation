"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { userCreateSchema } from "@/lib/validations";
import { createUser } from "@/app/actions/users";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

type FormData = z.infer<typeof userCreateSchema>;

export default function NewUserClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(userCreateSchema), defaultValues: { role: "EMPLOYEE" } });

  async function onSubmit(d: FormData) {
    setLoading(true);
    try { await createUser(d); toast.success("User created"); router.push("/users"); }
    catch (e: any) { toast.error(e?.message || "Failed"); }
    finally { setLoading(false); }
  }
  return (
    <Card><CardContent className="pt-6">
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <div><Label>Name</Label><Input {...register("name")} />{errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}</div>
        <div><Label>Email</Label><Input type="email" {...register("email")} /></div>
        <div><Label>Password</Label><Input type="password" {...register("password")} /></div>
        <div><Label>Phone</Label><Input {...register("phone")} /></div>
        <div><Label>Role</Label><Select {...register("role")}><option value="EMPLOYEE">EMPLOYEE</option><option value="ADMIN">ADMIN</option></Select></div>
        <Button type="submit" disabled={loading} className="w-full">{loading ? "Creating..." : "Create User"}</Button>
      </form>
    </CardContent></Card>
  );
}
