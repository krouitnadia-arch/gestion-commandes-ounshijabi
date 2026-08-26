import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import Sidebar from "@/components/Sidebar";
import AccueilClient from "@/components/AccueilClient";

export default async function AccueilPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="app-shell">
      <Sidebar role={session.role} name={session.name} />
      <main className="app-main">
        <AccueilClient nom={session.name} role={session.role} />
      </main>
    </div>
  );
}
