import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { majStockWoo } from "@/lib/woocommerceProduits";

export const maxDuration = 30;

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (body.nom !== undefined) data.nom = body.nom;
  if (body.reference !== undefined) data.reference = body.reference;
  if (body.categorie !== undefined) data.categorie = body.categorie;
  if (body.couleur !== undefined) data.couleur = body.couleur;
  if (body.taille !== undefined) data.taille = body.taille;
  if (body.quantite !== undefined) data.quantite = Number(body.quantite);
  if (body.seuilAlerte !== undefined) data.seuilAlerte = Number(body.seuilAlerte);
  if (body.prix !== undefined) data.prix = body.prix === null ? null : Number(body.prix);

  const produit = await prisma.product.update({ where: { id: params.id }, data });

  let avertissement: string | null = null;

  // Si la quantite a change, on la renvoie vers ounshijabi.com
  if (body.quantite !== undefined && produit.wooId) {
    try {
      await majStockWoo(produit.wooId, produit.parentId ?? null, produit.quantite);
    } catch (e: any) {
      avertissement = `Stock non mis a jour sur le site : ${e.message}`;
    }
  }

  return NextResponse.json({ ...produit, avertissement });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  await prisma.product.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
