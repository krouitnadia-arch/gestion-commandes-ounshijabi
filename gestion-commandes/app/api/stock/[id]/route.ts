import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

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

  if (body.nom !== undefined) data.nom = body.nom;
  if (body.reference !== undefined) data.reference = body.reference;
  if (body.categorie !== undefined) data.categorie = body.categorie;
  if (body.couleur !== undefined) data.couleur = body.couleur;
  if (body.taille !== undefined) data.taille = body.taille;
  if (body.seuilAlerte !== undefined) data.seuilAlerte = Number(body.seuilAlerte);
  if (body.prix !== undefined) data.prix = body.prix === null ? null : Number(body.prix);

  // ---------------------------------------------------------------
  // Site et Magasin sont desormais deux compteurs independants :
  // modifier l'un ne deplace plus rien vers l'autre, et rien n'est
  // envoye a ounshijabi.com.
  // ---------------------------------------------------------------
  if (body.quantiteMagasin !== undefined) {
    data.quantiteMagasin = Math.max(0, Number(body.quantiteMagasin) || 0);
  }

  if (body.quantite !== undefined) {
    data.quantite = Math.max(0, Number(body.quantite) || 0);
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
