import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { restituerStock } from "@/lib/stockCommande";

export const maxDuration = 60;

const PREFIXE_IGNORE = "IGNORE:";

async function marquerIgnore(wooId: number) {
  if (wooId <= 0) return;
  await prisma.syncLog.create({
    data: { nbNouvelles: 0, succes: true, message: `${PREFIXE_IGNORE}${wooId}` },
  });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Identifiant manquant" }, { status: 400 });

  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });

  const avertissements: string[] = [];

  // Les pieces reviennent au stock avant la suppression
  if (order.stockDeduit) {
    const r = await restituerStock(order.produits);
    avertissements.push(...r.avertissements);
    if (r.rendues > 0) avertissements.push(`${r.rendues} piece(s) remise(s) au stock`);
  }

  await marquerIgnore(order.wooId);
  await prisma.order.delete({ where: { id } });

  return NextResponse.json({
    ok: true,
    avertissement: avertissements.length > 0 ? avertissements.join(" | ") : null,
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const body = await req.json();
  const ids: string[] = Array.isArray(body.ids) ? body.ids : [];

  if (ids.length < 2) {
    return NextResponse.json({ error: "Au moins deux commandes sont necessaires" }, { status: 400 });
  }

  const commandes = await prisma.order.findMany({ where: { id: { in: ids } } });
  if (commandes.length < 2) {
    return NextResponse.json({ error: "Commandes introuvables" }, { status: 404 });
  }

  const triees = [...commandes].sort(
    (a, b) => new Date(b.dateCommande).getTime() - new Date(a.dateCommande).getTime()
  );

  const principale = triees[0];
  const autres = triees.slice(1);

  const tousProduits = triees.flatMap((c) =>
    Array.isArray(c.produits) ? (c.produits as any[]) : []
  );
  const total = triees.reduce((somme, c) => somme + (c.total || 0), 0);
  const numero = triees.map((c) => c.numero).join(" + ");
  const notes = triees.map((c) => c.notes).filter(Boolean).join(" | ") || null;

  await marquerIgnore(principale.wooId);

  const fusionnee = await prisma.order.update({
    where: { id: principale.id },
    data: { produits: tousProduits as any, total, numero, notes },
  });

  for (const c of autres) {
    await marquerIgnore(c.wooId);
    await prisma.order.delete({ where: { id: c.id } });
  }

  return NextResponse.json({ ok: true, commande: fusionnee });
}
