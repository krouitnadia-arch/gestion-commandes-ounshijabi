import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

export const maxDuration = 30;

// Qui a le droit de toucher a la quantite du magasin
const PEUVENT_MODIFIER_QUANTITE = ["ADMIN", "EMPLOYE", "STOCK"];

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const admin = session.role === "ADMIN";

  if (!admin && !PEUVENT_MODIFIER_QUANTITE.includes(session.role)) {
    return NextResponse.json(
      { error: "Vous n'avez pas le droit de modifier le stock" },
      { status: 403 }
    );
  }

  const produit = await prisma.product.findUnique({ where: { id: params.id } });
  if (!produit) return NextResponse.json({ error: "Article introuvable" }, { status: 404 });

  const body = await req.json();
  const data: Record<string, unknown> = {};

  // ---------------------------------------------------------------
  // Site et Magasin sont deux compteurs independants : modifier l'un
  // ne deplace rien vers l'autre, et rien n'est envoye au site.
  // ---------------------------------------------------------------
  if (body.quantiteMagasin !== undefined) {
    data.quantiteMagasin = Math.max(0, Number(body.quantiteMagasin) || 0);
  }

  // Tout le reste reste reserve a l'administratrice
  if (admin) {
    if (body.nom !== undefined) data.nom = body.nom;
    if (body.reference !== undefined) data.reference = body.reference;
    if (body.categorie !== undefined) data.categorie = body.categorie;
    if (body.couleur !== undefined) data.couleur = body.couleur;
    if (body.taille !== undefined) data.taille = body.taille;
    if (body.seuilAlerte !== undefined) data.seuilAlerte = Number(body.seuilAlerte);
    if (body.prix !== undefined) data.prix = body.prix === null ? null : Number(body.prix);
    if (body.quantite !== undefined) data.quantite = Math.max(0, Number(body.quantite) || 0);
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Aucune modification autorisee" }, { status: 403 });
  }

  const maj = await prisma.product.update({ where: { id: params.id }, data });

  return NextResponse.json({ ...maj, avertissement: null });
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
