import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { majStockWoo } from "@/lib/woocommerceProduits";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const body = await req.json();
  const ids: string[] = Array.isArray(body.ids) ? body.ids : [];

  if (ids.length === 0) {
    return NextResponse.json({ error: "Aucune variante indiquee" }, { status: 400 });
  }

  const produits = await prisma.product.findMany({ where: { id: { in: ids } } });
  const avertissements: string[] = [];
  let fusionnees = 0;

  for (const p of produits) {
    const total = (p.quantite || 0) + (p.quantiteMagasin || 0);

    if ((p.quantiteMagasin || 0) === 0) continue;

    await prisma.product.update({
      where: { id: p.id },
      data: { quantite: total, quantiteMagasin: 0 },
    });
    fusionnees++;

    if (p.wooId) {
      try {
        await majStockWoo(p.wooId, p.parentId ?? null, total);
      } catch (e: any) {
        avertissements.push(`${p.nom} : ${e.message}`);
      }
    }
  }

  return NextResponse.json({ ok: true, fusionnees, avertissements });
}
