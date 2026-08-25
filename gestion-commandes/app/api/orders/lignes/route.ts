import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { deduireStock, restituerStock } from "@/lib/stockCommande";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const body = await req.json();

  const order = await prisma.order.findUnique({ where: { id: String(body.orderId) } });
  if (!order) return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });

  const produit = await prisma.product.findUnique({ where: { id: String(body.productId) } });
  if (!produit) return NextResponse.json({ error: "Article introuvable" }, { status: 404 });

  const quantite = Math.max(1, Number(body.quantite) || 1);

  // Un article en rupture ne peut pas etre ajoute a une commande
  const disponible = (produit.quantite || 0) + (produit.quantiteMagasin || 0);

  if (disponible <= 0) {
    return NextResponse.json(
      { error: `${produit.nom} : stock epuise, ajout impossible` },
      { status: 400 }
    );
  }

  if (disponible < quantite) {
    return NextResponse.json(
      { error: `${produit.nom} : seulement ${disponible} piece(s) en stock` },
      { status: 400 }
    );
  }

  const montant =
    body.montant !== undefined && body.montant !== null && body.montant !== ""
      ? Number(body.montant)
      : (produit.prix || 0) * quantite;

  const ligne = {
    productId: produit.id,
    nom: produit.nom,
    couleur: produit.couleur,
    taille: produit.taille,
    quantite,
    total: String(montant),
  };

  const d = await deduireStock([ligne]);

  const lignes: any[] = Array.isArray(order.produits) ? (order.produits as any[]) : [];
  lignes.push(ligne);

  const maj = await prisma.order.update({
    where: { id: order.id },
    data: {
      produits: lignes as any,
      total: (order.total || 0) + montant,
      stockDeduit: true,
    },
  });

  return NextResponse.json({ ok: true, order: maj, avertissements: d.avertissements });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const orderId = req.nextUrl.searchParams.get("orderId");
  const index = Number(req.nextUrl.searchParams.get("index"));

  if (!orderId || Number.isNaN(index)) {
    return NextResponse.json({ error: "Parametres manquants" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });

  const lignes: any[] = Array.isArray(order.produits) ? (order.produits as any[]) : [];
  if (index < 0 || index >= lignes.length) {
    return NextResponse.json({ error: "Ligne introuvable" }, { status: 400 });
  }

  const ligne = lignes[index];

  if (order.stockDeduit) {
    await restituerStock([ligne]);
  }

  const montant = Number(ligne?.total) || 0;
  lignes.splice(index, 1);

  const maj = await prisma.order.update({
    where: { id: order.id },
    data: {
      produits: lignes as any,
      total: Math.max(0, (order.total || 0) - montant),
    },
  });

  return NextResponse.json({ ok: true, order: maj });
}
