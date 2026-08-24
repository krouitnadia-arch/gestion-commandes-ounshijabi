import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { statutColis } from "@/lib/sendit";
import { restituerStock } from "@/lib/stockCommande";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const commandes = await prisma.order.findMany({
    where: { senditCode: { not: null } },
    orderBy: { updatedAt: "desc" },
    take: 40,
  });

  const statuts: { [code: string]: string } = {};
  const annulees: string[] = [];

  for (const c of commandes) {
    const code = c.senditCode as string;
    const r = await statutColis(code);

    statuts[code] = r.statut;

    // Le colis n'existe plus chez Sendit : la commande est annulee
    if (r.supprime) {
      if (c.stockDeduit) {
        await restituerStock(c.produits);
      }

      await prisma.order.update({
        where: { id: c.id },
        data: {
          statut: "ANNULEE",
          senditCode: null,
          saisiLivraison: false,
          stockDeduit: false,
        },
      });

      annulees.push(c.numero);
    }
  }

  return NextResponse.json({ ok: true, statuts, annulees });
}
