import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.nom !== undefined) data.nom = body.nom;
  if (body.reference !== undefined) data.reference = body.reference;
  if (body.quantite !== undefined) data.quantite = Number(body.quantite);
  if (body.seuilAlerte !== undefined) data.seuilAlerte = Number(body.seuilAlerte);
  if (body.prix !== undefined) data.prix = body.prix === null ? null : Number(body.prix);

  const produit = await prisma.product.update({ where: { id: params.id }, data });
  return NextResponse.json(produit);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  await prisma.product.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
