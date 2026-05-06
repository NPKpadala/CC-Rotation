import { redirect } from "next/navigation";
import { getSessionSafe } from "@/lib/rbac";

export default async function Home() {
  const s = await getSessionSafe();
  redirect(s ? "/dashboard" : "/login");
}
