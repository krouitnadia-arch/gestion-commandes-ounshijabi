import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import Sidebar from "@/components/Sidebar";
import ExpeditionClient from "@/components/ExpeditionClient";

export default async function ExpeditionPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="app-shell">
      <Sidebar role={session.role} name={session.name} />
      <main className="app-main">
        <ExpeditionClient />
      </main>
    </div>
  );
}
