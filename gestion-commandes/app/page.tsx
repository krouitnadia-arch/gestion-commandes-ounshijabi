import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { defaultPathForRole } from "@/lib/auth";

export default async function HomePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  redirect(defaultPathForRole(session.role));
}
