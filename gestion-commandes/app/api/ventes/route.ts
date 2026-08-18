import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { majStockWoo } from "@/lib/woocommerceProduits";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const ventes = await prisma.vente.findMany({ orderBy: { date: "desc" }, take: 300 });
  return NextResponse.json(ventes);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const body = await req.json();
  const entrees: any[] = Array.isArray(body.lignes) ? body.lignes : [];

  if (entrees.length === 0) {
    return NextResponse.json({ error: "Aucun article dans la vente" }, { status: 400 });
  }

  const lignes: any[] = [];
  const avertissements: string[] = [];
  let total = 0;

  for (const e of entrees) {
    const produit = await prisma.product.findUnique({ where: { id: String(e.productId) } });
    if (!produit) continue;

    const quantite = Math.max(1, Number(e.quantite) || 1);

    const montant =
      e.montant !== undefined && e.montant !== null && e.montant !== ""
        ? Number(e.montant)
        : (produit.prix || 0) * quantite;

    total += montant;

    // On puise d'abord dans le stock magasin, puis dans le stock site
    const dispoMagasin = produit.quantiteMagasin || 0;
    const prisMagasin = Math.min(quantite, dispoMagasin);
    const prisSite = quantite - prisMagasin;

    const nouveauMagasin = dispoMagasin - prisMagasin;
    const nouveauSite = Math.max(0, (produit.quantite || 0) - prisSite);

    await prisma.product.update({
      where: { id: produit.id },
      data: { quantite: nouveauSite, quantiteMagasin: nouveauMagasin },
    });

    lignes.push({
      productId: produit.id,
      nom: produit.nom,
      couleur: produit.couleur,
      taille: produit.taille,
      quantite,
      montant,
      prisMagasin,
      prisSite,
    });

    if (produit.wooId && prisSite > 0) {
      try {
        await majStockWoo(produit.wooId, produit.parentId ?? null, nouveauSite);
      } catch (err: any) {
        avertissements.push(`${produit.nom} : stock du site non mis a jour (${err.message})`);
      }
    }
  }

  if (lignes.length === 0) {
    return NextResponse.json({ error: "Articles introuvables" }, { status: 400 });
  }

  const avance = Math.max(0, Number(body.avance) || 0);
  const reste = Math.max(0, total - avance);

  const vente = await prisma.vente.create({
    data: {
      clientNom: body.clientNom || null,
      clientTelephone: body.clientTelephone || null,
      lignes: lignes as any,
      total,
      avance,
      reste,
      paiement: body.paiement || null,
      notes: body.notes || null,
      vendeur: session.name,
    },
  });

  return NextResponse.json({ ok: true, vente, avertissements });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Identifiant manquant" }, { status: 400 });

  const vente = await prisma.vente.findUnique({ where: { id } });
  if (!vente) return NextResponse.json({ error: "Vente introuvable" }, { status: 404 });

  const lignes: any[] = Array.isArray(vente.lignes) ? (vente.lignes as any[]) : [];

  for (const l of lignes) {
    const produit = await prisma.product.findUnique({ where: { id: String(l.productId) } });
    if (!produit) continue;

    const rendreMagasin = Number(l.prisMagasin) || 0;
    const rendreSite = Number(l.prisSite) || Number(l.quantite) || 0;

    const nouveauSite = (produit.quantite || 0) + rendreSite;
    const nouveauMagasin = (produit.quantiteMagasin || 0) + rendreMagasin;

    await prisma.product.update({
      where: { id: produit.id },
      data: { quantite: nouveauSite, quantiteMagasin: nouveauMagasin },
    });

    if (produit.wooId && rendreSite > 0) {
      try {
        await majStockWoo(produit.wooId, produit.parentId ?? null, nouveauSite);
      } catch {
        // le stock local est remis meme si le site refuse
      }
    }
  }

  await prisma.vente.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
