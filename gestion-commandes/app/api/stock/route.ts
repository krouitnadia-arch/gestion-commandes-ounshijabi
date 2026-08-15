import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const produits = await prisma.product.findMany({ orderBy: { nom: "asc" } });
  return NextResponse.json(produits);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await req.json();
  if (!body.nom) return NextResponse.json({ error: "Nom requis" }, { status: 400 });

  const produit = await prisma.product.create({
    data: {
      nom: body.nom,
      reference: body.reference || null,
      quantite: Number(body.quantite) || 0,
      seuilAlerte: Number(body.seuilAlerte) || 5,
      prix: body.prix ? Number(body.prix) : null,
    },
  });

  return NextResponse.json(produit);
}
