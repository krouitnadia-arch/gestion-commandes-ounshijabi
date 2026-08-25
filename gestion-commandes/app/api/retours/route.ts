import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { majStockWoo } from "@/lib/woocommerceProduits";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Retrouve la ligne de stock correspondant a une ligne de commande
async function trouverProduit(l: any) {
  if (l?.productId) {
    const p = await prisma.product.findUnique({ where: { id: String(l.productId) } });
    if (p) return p;
  }

  const cible = Number(l?.variationId) || Number(l?.produitId) || 0;
  if (cible > 0) {
    return prisma.product.findUnique({ where: { wooId: cible } });
  }

  return null;
}

// GET sans parametre : la liste des retours
// GET ?recherche=CODE : les commandes correspondant au code du colis
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const recherche = (req.nextUrl.searchParams.get("recherche") || "").trim();

  if (recherche) {
    const commandes = await prisma.order.findMany({
      where: {
        OR: [
          { senditCode: { contains: recherche, mode: "insensitive" } },
          { numero: { contains: recherche, mode: "insensitive" } },
          { clientNom: { contains: recherche, mode: "insensitive" } },
          { clientTelephone: { contains: recherche } },
        ],
      },
      orderBy: { dateCommande: "desc" },
      take: 20,
    });

    return NextResponse.json({ commandes });
  }

  const retours = await prisma.retour.findMany({ orderBy: { date: "desc" }, take: 200 });
  return NextResponse.json(retours);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const body = await req.json();
  const entrees: any[] = Array.isArray(body.lignes) ? body.lignes : [];

  if (!body.orderId || entrees.length === 0) {
    return NextResponse.json({ error: "Aucun article selectionne" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({ where: { id: String(body.orderId) } });
  if (!order) return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });

  const produits: any[] = Array.isArray(order.produits) ? (order.produits as any[]) : [];
  const avertissements: string[] = [];
  const lignesRetour: any[] = [];
  let total = 0;
  let piecesRetournees = 0;

  for (const e of entrees) {
    const index = Number(e.index);
    const p = produits[index];
    if (!p) continue;

    const quantiteCommande = Math.max(1, Number(p.quantite) || 1);
    const quantite = Math.min(Math.max(1, Number(e.quantite) || 1), quantiteCommande);

    const montantLigne = Number(p.total) || 0;
    const montant = (montantLigne / quantiteCommande) * quantite;

    const destination = e.destination === "MAGASIN" ? "MAGASIN" : "SITE";

    total += montant;
    piecesRetournees += quantite;

    const produit = await trouverProduit(p);

    if (!produit) {
      avertissements.push(`${p?.nom || "Article"} : ligne de stock introuvable, ajustez a la main`);
    } else if (destination === "MAGASIN") {
      await prisma.product.update({
        where: { id: produit.id },
        data: { quantiteMagasin: (produit.quantiteMagasin || 0) + quantite },
      });
    } else {
      const nouvelle = (produit.quantite || 0) + quantite;
      await prisma.product.update({
        where: { id: produit.id },
        data: { quantite: nouvelle },
      });

      if (produit.wooId) {
        try {
          await majStockWoo(produit.wooId, produit.parentId ?? null, nouvelle);
        } catch (err: any) {
          avertissements.push(`${produit.nom} : site non mis a jour (${err.message})`);
        }
      }
    }

    lignesRetour.push({
      index,
      productId: produit ? produit.id : null,
      nom: p.nom,
      couleur: p.couleur || null,
      taille: p.taille || null,
      quantite,
      montant,
      destination,
    });
  }

  if (lignesRetour.length === 0) {
    return NextResponse.json({ error: "Aucun article valide" }, { status: 400 });
  }

  const piecesCommande = produits.reduce(
    (somme, p) => somme + (Math.max(1, Number(p?.quantite) || 1)),
    0
  );
  const complet = piecesRetournees >= piecesCommande;

  const retour = await prisma.retour.create({
    data: {
      orderId: order.id,
      numero: order.numero,
      senditCode: order.senditCode || null,
      clientNom: order.clientNom,
      lignes: lignesRetour as any,
      total,
      complet,
      notes: body.notes || null,
      agent: session.name,
    },
  });

  if (complet) {
    await prisma.order.update({
      where: { id: order.id },
      data: { statut: "RETOURNEE" },
    });
  }

  return NextResponse.json({ ok: true, retour, avertissements });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Identifiant manquant" }, { status: 400 });

  const retour = await prisma.retour.findUnique({ where: { id } });
  if (!retour) return NextResponse.json({ error: "Retour introuvable" }, { status: 404 });

  const lignes: any[] = Array.isArray(retour.lignes) ? (retour.lignes as any[]) : [];

  for (const l of lignes) {
    if (!l.productId) continue;

    const produit = await prisma.product.findUnique({ where: { id: String(l.productId) } });
    if (!produit) continue;

    const quantite = Number(l.quantite) || 0;

    if (l.destination === "MAGASIN") {
      await prisma.product.update({
        where: { id: produit.id },
        data: { quantiteMagasin: Math.max(0, (produit.quantiteMagasin || 0) - quantite) },
      });
    } else {
      const nouvelle = Math.max(0, (produit.quantite || 0) - quantite);
      await prisma.product.update({
        where: { id: produit.id },
        data: { quantite: nouvelle },
      });

      if (produit.wooId) {
        try {
          await majStockWoo(produit.wooId, produit.parentId ?? null, nouvelle);
        } catch {
          // le stock local est corrige meme si le site refuse
        }
      }
    }
  }

  if (retour.orderId && retour.complet) {
    const order = await prisma.order.findUnique({ where: { id: retour.orderId } });
    if (order && order.statut === "RETOURNEE") {
      await prisma.order.update({
        where: { id: order.id },
        data: { statut: "EXPEDIEE" },
      });
    }
  }

  await prisma.retour.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
