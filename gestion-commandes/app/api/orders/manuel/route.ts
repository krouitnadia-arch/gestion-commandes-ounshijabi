import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const body = await req.json();
  if (!body.clientNom || !body.clientTelephone) {
    return NextResponse.json({ error: "Nom et telephone obligatoires" }, { status: 400 });
  }

  const min = await prisma.order.aggregate({ _min: { wooId: true } });
  const wooId = Math.min(-1, (min._min.wooId ?? 0) - 1);

  const quantite = Number(body.quantite) || 1;
  const total = Number(body.total) || 0;

  const order = await prisma.order.create({
    data: {
      wooId,
      numero: `IG-${Math.abs(wooId)}`,
      clientNom: body.clientNom,
      clientTelephone: body.clientTelephone,
      clientAdresse: body.clientAdresse || "",
      clientVille: body.clientVille || "",
      produits: [
        { nom: body.produit || "Produit", quantite, total: String(total) },
      ],
      total,
      dateCommande: new Date(),
      notes: body.notes || null,
    },
  });

  return NextResponse.json(order);
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Identifiant manquant" }, { status: 400 });

  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });

  if (order.wooId >= 0) {
    return NextResponse.json(
      { error: "Seules les commandes Instagram peuvent etre supprimees" },
      { status: 400 }
    );
  }

  await prisma.order.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
