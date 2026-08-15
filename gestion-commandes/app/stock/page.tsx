import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import Sidebar from "@/components/Sidebar";
import StockClient from "@/components/StockClient";

export default async function StockPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="app-shell">
      <Sidebar role={session.role} name={session.name} />
      <main className="app-main">
        <StockClient />
      </main>
    </div>
  );
}
