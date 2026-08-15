import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import Sidebar from "@/components/Sidebar";
import UsersClient from "@/components/UsersClient";

export default async function UtilisateursPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/");

  return (
    <div className="app-shell">
      <Sidebar role={session.role} name={session.name} />
      <main className="app-main">
        <UsersClient />
      </main>
    </div>
  );
}
