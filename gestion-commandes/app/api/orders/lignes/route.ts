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

  // L'article ajoute a la main sort du stock MAGASIN
  const disponible = produit.quantiteMagasin || 0;

  if (disponible <= 0) {
    return NextResponse.json(
      { error: `${produit.nom} : aucune piece au magasin, ajout impossible` },
      { status: 400 }
    );
  }

  if (disponible < quantite) {
    return NextResponse.json(
      { error: `${produit.nom} : seulement ${disponible} piece(s) au magasin` },
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
    },
  });

  return NextResponse.json({ ok: true, order: maj, avertissements: d.avertissements });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const orderId = req.nextUrl.searchParams.get("orderId");
  const index = Number(req.nextUrl.searchParams.get("index"));

  // quantite absente = on retire la ligne entiere
  const brut = req.nextUrl.searchParams.get("quantite");
  const quantiteDemandee = brut === null || brut === "" ? null : Math.max(1, Number(brut) || 1);

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

  const quantiteLigne = Math.max(1, Number(ligne?.quantite) || 1);
  const montantLigne = Number(ligne?.total) || 0;
  const prixUnitaire = montantLigne / quantiteLigne;

  // Combien de pieces on enleve reellement
  const retirees =
    quantiteDemandee === null ? quantiteLigne : Math.min(quantiteDemandee, quantiteLigne);

  const montantRetire = Math.round(prixUnitaire * retirees);
  const reste = quantiteLigne - retirees;

  // Une ligne qui porte un productId est sortie de notre stock magasin :
  // elle y retourne. Une ligne venue du site n'a jamais touche nos
  // compteurs : on affiche le rappel pour la remettre a la main sur le site.
  const venueDuMagasin = Boolean(ligne?.productId);

  const avertissements: string[] = [];
  const data: any = {};

  if (venueDuMagasin) {
    await restituerStock([{ ...ligne, quantite: retirees }]);
  } else {
    data.stockARemettre = true;
    avertissements.push(
      `Pensez a remettre ${retirees} piece(s) de ${ligne?.nom || "cet article"} en stock sur le site`
    );
  }

  if (reste > 0) {
    lignes[index] = {
      ...ligne,
      quantite: reste,
      total: String(Math.round(prixUnitaire * reste)),
    };
  } else {
    lignes.splice(index, 1);
  }

  data.produits = lignes as any;
  data.total = Math.max(0, (order.total || 0) - montantRetire);

  const maj = await prisma.order.update({
    where: { id: order.id },
    data,
  });

  return NextResponse.json({ ok: true, order: maj, retirees, reste, avertissements });
}
