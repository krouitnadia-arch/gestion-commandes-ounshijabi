import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import Sidebar from "@/components/Sidebar";
import ProductionClient from "@/components/ProductionClient";

export default async function ProductionPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  // Cette rubrique contient vos couts et vos marges : administratrice seulement
  if (session.role !== "ADMIN") redirect("/");

  return (
    <div className="app-shell">
      <Sidebar role={session.role} name={session.name} />
      <main className="app-main">
        <ProductionClient />
      </main>
    </div>
  );
}
