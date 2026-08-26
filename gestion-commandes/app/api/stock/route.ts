import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

// Tout le monde peut consulter le stock
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const produits = await prisma.product.findMany({ orderBy: { nom: "asc" } });
  return NextResponse.json(produits);
}

// Seule l'administratrice peut creer un article
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  if (session.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Seule l'administratrice peut modifier le stock" },
      { status: 403 }
    );
  }

  const body = await req.json();
  if (!body.nom) return NextResponse.json({ error: "Nom requis" }, { status: 400 });

  const produit = await prisma.product.create({
    data: {
      nom: String(body.nom).trim(),
      reference: body.reference || null,
      categorie: body.categorie || "Autres articles",
      couleur: body.couleur ? String(body.couleur).trim() : null,
      taille: body.taille ? String(body.taille).trim() : "Standard",
      quantite: Number(body.quantite) || 0,
      quantiteMagasin: Number(body.quantiteMagasin) || 0,
      seuilAlerte: Number(body.seuilAlerte) || 5,
      prix: body.prix ? Number(body.prix) : null,
    },
  });

  return NextResponse.json(produit);
}
