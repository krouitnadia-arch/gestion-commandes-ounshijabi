import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { majStockWoo } from "@/lib/woocommerceProduits";

export const maxDuration = 30;

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  if (session.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Seule l'administratrice peut modifier le stock" },
      { status: 403 }
    );
  }

  const produit = await prisma.product.findUnique({ where: { id: params.id } });
  if (!produit) return NextResponse.json({ error: "Article introuvable" }, { status: 404 });

  const body = await req.json();
  const data: Record<string, unknown> = {};
  let siteChange = false;

  if (body.nom !== undefined) data.nom = body.nom;
  if (body.reference !== undefined) data.reference = body.reference;
  if (body.categorie !== undefined) data.categorie = body.categorie;
  if (body.couleur !== undefined) data.couleur = body.couleur;
  if (body.taille !== undefined) data.taille = body.taille;
  if (body.seuilAlerte !== undefined) data.seuilAlerte = Number(body.seuilAlerte);
  if (body.prix !== undefined) data.prix = body.prix === null ? null : Number(body.prix);

  const totalPhysique = (produit.quantite || 0) + (produit.quantiteMagasin || 0);

  // Fusion : tout revient sur le site
  if (body.fusionner === true) {
    data.quantite = totalPhysique;
    data.quantiteMagasin = 0;
    siteChange = true;
  }
  // Repartition : on deplace des pieces entre magasin et site, total inchange
  else if (body.quantiteMagasin !== undefined) {
    const souhaite = Math.max(0, Number(body.quantiteMagasin) || 0);
    const magasin = Math.min(souhaite, totalPhysique);
    data.quantiteMagasin = magasin;
    data.quantite = totalPhysique - magasin;
    siteChange = true;
  }
  // Modification directe du stock site (reception de marchandise)
  else if (body.quantite !== undefined) {
    data.quantite = Math.max(0, Number(body.quantite) || 0);
    siteChange = true;
  }

  const maj = await prisma.product.update({ where: { id: params.id }, data });

  let avertissement: string | null = null;

  if (siteChange && maj.wooId) {
    try {
      await majStockWoo(maj.wooId, maj.parentId ?? null, maj.quantite);
    } catch (e: any) {
      avertissement = `Stock du site non mis a jour : ${e.message}`;
    }
  }

  return NextResponse.json({ ...maj, avertissement });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  if (session.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Seule l'administratrice peut supprimer un article" },
      { status: 403 }
    );
  }

  await prisma.product.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
