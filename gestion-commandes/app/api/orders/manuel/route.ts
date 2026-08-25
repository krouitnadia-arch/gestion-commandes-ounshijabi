import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { deduireStock, restituerStock } from "@/lib/stockCommande";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const body = await req.json();

  if (!body.clientNom || !body.clientTelephone) {
    return NextResponse.json({ error: "Nom et telephone obligatoires" }, { status: 400 });
  }

  const entrees: any[] = Array.isArray(body.lignes) ? body.lignes : [];
  if (entrees.length === 0) {
    return NextResponse.json({ error: "Aucun article selectionne" }, { status: 400 });
  }

  // ---------------------------------------------------------------
  // Verification du stock AVANT toute ecriture : aucune commande ne
  // peut contenir un article en rupture.
  // ---------------------------------------------------------------
  const verifiees: { produit: any; quantite: number; montant: number }[] = [];

  for (const e of entrees) {
    const p = await prisma.product.findUnique({ where: { id: String(e.productId) } });
    if (!p) {
      return NextResponse.json({ error: "Article introuvable dans le stock" }, { status: 400 });
    }

    const quantite = Math.max(1, Number(e.quantite) || 1);
    const disponible = (p.quantite || 0) + (p.quantiteMagasin || 0);

    if (disponible <= 0) {
      return NextResponse.json(
        { error: `${p.nom} : stock epuise, commande impossible` },
        { status: 400 }
      );
    }

    if (disponible < quantite) {
      return NextResponse.json(
        { error: `${p.nom} : seulement ${disponible} piece(s) en stock` },
        { status: 400 }
      );
    }

    const montant =
      e.montant !== undefined && e.montant !== null && e.montant !== ""
        ? Number(e.montant)
        : (p.prix || 0) * quantite;

    verifiees.push({ produit: p, quantite, montant });
  }

  const produits: any[] = [];
  let total = 0;

  for (const v of verifiees) {
    total += v.montant;

    produits.push({
      productId: v.produit.id,
      nom: v.produit.nom,
      couleur: v.produit.couleur,
      taille: v.produit.taille,
      quantite: v.quantite,
      total: String(v.montant),
    });
  }

  const min = await prisma.order.aggregate({ _min: { wooId: true } });
  const wooId = Math.min(-1, (min._min.wooId ?? 0) - 1);

  const d = await deduireStock(produits);

  const order = await prisma.order.create({
    data: {
      wooId,
      numero: `IG-${Math.abs(wooId)}`,
      clientNom: body.clientNom,
      clientTelephone: body.clientTelephone,
      clientAdresse: body.clientAdresse || "",
      clientVille: body.clientVille || "",
      produits: produits as any,
      total,
      dateCommande: new Date(),
      notes: body.notes || null,
      stockDeduit: true,
    },
  });

  return NextResponse.json({ ok: true, order, avertissements: d.avertissements });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Identifiant manquant" }, { status: 400 });

  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });

  if (order.stockDeduit) {
    await restituerStock(order.produits);
  }

  await prisma.order.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
