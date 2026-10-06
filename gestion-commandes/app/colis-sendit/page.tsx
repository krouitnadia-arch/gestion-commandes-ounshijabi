import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import Sidebar from "@/components/Sidebar";
import ColisSenditClient from "@/components/ColisSenditClient";

export default async function ColisSenditPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const autorises = ["ADMIN", "EMPLOYE", "EXPEDITION"];
  if (!autorises.includes(session.role)) redirect("/");

  return (
    <div className="app-shell">
      <Sidebar role={session.role} name={session.name} />
      <main className="app-main">
        <ColisSenditClient />
      </main>
    </div>
  );
}
