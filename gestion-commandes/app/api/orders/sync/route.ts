import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { fetchWooOrders, wooOrderToLocal } from "@/lib/woocommerce";

const PREFIXE_IGNORE = "IGNORE:";

export const maxDuration = 60;

const STATUTS_ANNULES = ["cancelled", "refunded", "failed", "trash"];

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  try {
    const debut = process.env.SYNC_DEBUT || "2026-08-01";
    const after = new Date(`${debut}T00:00:00Z`).toISOString();

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
    let annulees = 0;
    const vues = new Set<number>();
    let plusAncienne: number | null = null;

    for (const wo of wooOrders) {
      vues.add(wo.id);

      const dateWoo = new Date(wo.date_created).getTime();
      if (plusAncienne === null || dateWoo < plusAncienne) plusAncienne = dateWoo;

      if (ignores.has(wo.id)) continue;

      const local = wooOrderToLocal(wo);
      const annuleeSurSite = STATUTS_ANNULES.includes(String(wo.status || "").toLowerCase());
      const existing = await prisma.order.findUnique({ where: { wooId: wo.id } });

      if (!existing) {
        await prisma.order.create({
          data: {
            ...local,
            stockDeduit: !annuleeSurSite,
            statut: annuleeSurSite ? "ANNULEE" : "NOUVELLE",
          },
        });
        nouvelles++;
      } else {
        // On conserve les articles ajoutes a la main dans l'application
        const anciennes: any[] = Array.isArray(existing.produits)
          ? (existing.produits as any[])
          : [];

        const manuelles = anciennes.filter(
          (l) => l && l.productId && !l.variationId && !l.produitId
        );

        const supplement = manuelles.reduce(
          (somme, l) => somme + (Number(l?.total) || 0),
          0
        );

        const data: Record<string, unknown> = {
          clientNom: local.clientNom,
          clientTelephone: local.clientTelephone,
          clientAdresse: local.clientAdresse,
          clientVille: local.clientVille,
          produits: [...local.produits, ...manuelles] as any,
          total: local.total + supplement,
        };

        if (annuleeSurSite && existing.statut !== "ANNULEE") {
          data.statut = "ANNULEE";
          data.stockDeduit = false;
          annulees++;
        }

        await prisma.order.update({ where: { wooId: wo.id }, data });
      }
    }

    if (plusAncienne !== null) {
      const locales = await prisma.order.findMany({
        where: {
          wooId: { gt: 0 },
          dateCommande: { gte: new Date(plusAncienne) },
          statut: { not: "ANNULEE" },
        },
      });

      for (const c of locales) {
        if (vues.has(c.wooId)) continue;
        if (ignores.has(c.wooId)) continue;

        await prisma.order.update({
          where: { id: c.id },
          data: { statut: "ANNULEE", stockDeduit: false },
        });
        annulees++;
      }
    }

    await prisma.syncLog.create({
      data: {
        nbNouvelles: nouvelles,
        succes: true,
        message: `${wooOrders.length} commandes verifiees, ${annulees} annulee(s)`,
      },
    });

    return NextResponse.json({ ok: true, nouvelles, annulees, total: wooOrders.length });
  } catch (e: any) {
    await prisma.syncLog.create({
      data: { nbNouvelles: 0, succes: false, message: e.message },
    });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
