import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import Sidebar from "@/components/Sidebar";
import OrdersClient from "@/components/OrdersClient";

export default async function CommandesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="app-shell">
      <Sidebar role={session.role} name={session.name} />
      <main className="app-main">
        <OrdersClient />
      </main>
    </div>
  );
}
