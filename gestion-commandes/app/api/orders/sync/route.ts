import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { fetchWooOrders, wooOrderToLocal } from "@/lib/woocommerce";

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  try {
    const wooOrders = await fetchWooOrders({ perPage: 100 });
    let nouvelles = 0;

    for (const wo of wooOrders) {
      const local = wooOrderToLocal(wo);
      const existing = await prisma.order.findUnique({ where: { wooId: wo.id } });

      if (!existing) {
        await prisma.order.create({ data: local });
        nouvelles++;
      } else {
        // On met à jour uniquement les informations "site" (jamais le statut
        // interne, ni l'indicateur d'appel/livraison choisis par l'équipe)
        await prisma.order.update({
          where: { wooId: wo.id },
          data: {
            clientNom: local.clientNom,
            clientTelephone: local.clientTelephone,
            clientAdresse: local.clientAdresse,
            clientVille: local.clientVille,
            produits: local.produits,
            total: local.total,
          },
        });
      }
    }

    await prisma.syncLog.create({
      data: { nbNouvelles: nouvelles, succes: true, message: `${wooOrders.length} commandes vérifiées` },
    });

    return NextResponse.json({ ok: true, nouvelles, total: wooOrders.length });
  } catch (e: any) {
    await prisma.syncLog.create({
      data: { nbNouvelles: 0, succes: false, message: e.message },
    });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
