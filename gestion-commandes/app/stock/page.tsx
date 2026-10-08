import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import Sidebar from "@/components/Sidebar";
import StockClient from "@/components/StockClient";

export default async function StockPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  // Tout le monde peut corriger la quantite du magasin.
  // Les prix, l'ajout, la suppression et l'import restent a l'administratrice.
  return (
    <div className="app-shell">
      <Sidebar role={session.role} name={session.name} />
      <main className="app-main">
        <StockClient role={session.role} />
      </main>
    </div>
  );
}
