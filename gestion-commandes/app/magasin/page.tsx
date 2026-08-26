import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import Sidebar from "@/components/Sidebar";
import MagasinClient from "@/components/MagasinClient";

export default async function MagasinPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  // L'onglet Stock du magasin suit la meme regle que la rubrique Stock :
  // consultation seule pour tout le monde sauf l'administratrice.
  const lectureSeule = session.role !== "ADMIN";

  return (
    <div className="app-shell">
      <Sidebar role={session.role} name={session.name} />
      <main className="app-main">
        <MagasinClient lectureSeule={lectureSeule} />
      </main>
    </div>
  );
}
