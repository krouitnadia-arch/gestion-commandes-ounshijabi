import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import Sidebar from "@/components/Sidebar";
import RetoursClient from "@/components/RetoursClient";

export default async function RetoursPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="app-shell">
      <Sidebar role={session.role} name={session.name} />
      <main className="app-main">
        <RetoursClient />
      </main>
    </div>
  );
}
