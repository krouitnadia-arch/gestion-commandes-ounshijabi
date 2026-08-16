import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { fetchWooOrders, wooOrderToLocal } from "@/lib/woocommerce";

const PREFIXE_IGNORE = "IGNORE:";

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  try {
    const debut = process.env.SYNC_DEBUT || "2026-08-01";
    const after = new Date(`${debut}T00:00:00Z`).toISOString();

    // Commandes supprimees ou fusionnees : on ne les reimporte plus.
    const marqueurs = await prisma.syncLog.findMany({
      where: { message: { startsWith: PREFIXE_IGNORE } },
      select: { message: true },
    });
    const ignores = new Set<number>();
    for (const m of marqueurs) {
      const valeur = Number((m.message || "").replace(PREFIXE_IGNORE, ""));
      if (!Number.isNaN(valeur)) ignores.add(valeur);
    }

    const wooOrders = await fetchWooOrders({ perPage: 100, after });
    let nouvelles = 0;

    for (const wo of wooOrders) {
      if (ignores.has(wo.id)) continue;

      const local = wooOrderToLocal(wo);
      const existing = await prisma.order.findUnique({ where: { wooId: wo.id } });

      if (!existing) {
        await prisma.order.create({ data: local });
        nouvelles++;
      } else {
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
      data: {
        nbNouvelles: nouvelles,
        succes: true,
        message: `${wooOrders.length} commandes verifiees depuis le ${debut}`,
      },
    });

    return NextResponse.json({ ok: true, nouvelles, total: wooOrders.length, depuis: debut });
  } catch (e: any) {
    await prisma.syncLog.create({
      data: { nbNouvelles: 0, succes: false, message: e.message },
    });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
