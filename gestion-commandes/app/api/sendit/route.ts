import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { listerDistricts, listerVillesRamassage, creerColis } from "@/lib/sendit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const type = req.nextUrl.searchParams.get("type");

  try {
    const liste =
      type === "ramassage" ? await listerVillesRamassage() : await listerDistricts();
    return NextResponse.json({ ok: true, nombre: liste.length, liste });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const body = await req.json();
  const orderId = body.orderId;
  const districtId = Number(body.districtId);

  if (!orderId || !districtId) {
    return NextResponse.json({ error: "Commande ou ville manquante" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });

  if (order.senditCode) {
    return NextResponse.json({ error: `Colis deja cree (${order.senditCode})` }, { status: 400 });
  }

  const produits = Array.isArray(order.produits) ? (order.produits as any[]) : [];

  // Sendit refuse le champ "products" : on decrit les articles dans le commentaire.
  const resume = produits
    .map((p) => {
      const details = [p?.couleur, p?.taille].filter(Boolean).join(" ");
      const quantite = Number(p?.quantite) || 1;
      return `${p?.nom || "Article"}${details ? ` (${details})` : ""} x${quantite}`;
    })
    .join(", ");

  const commentaire = [order.notes, resume].filter(Boolean).join(" | ").slice(0, 250);

  const adresse = [order.clientAdresse, order.clientVille].filter(Boolean).join(", ").trim();
  const telephone = (order.clientTelephone || "").replace(/\D/g, "");
  const ramassage = Number(process.env.SENDIT_PICKUP_DISTRICT_ID);

  const colis: Record<string, unknown> = {
    pickup_district_id: ramassage,
    district_id: districtId,
    name: (order.clientNom || "Client").trim(),
    amount: Math.max(0, Math.round(order.total || 0)),
    address: adresse || "-",
    phone: telephone,
    comment: commentaire || "-",
    reference: order.numero,
    allow_open: 0,
    allow_try: 0,
    products_from_stock: 0,
    option_exchange: 0,
  };

  try {
    const reponse = await creerColis(colis);
    const code = reponse?.data?.code || null;

    await prisma.order.update({
      where: { id: order.id },
      data: { senditCode: code, saisiLivraison: true },
    });

    return NextResponse.json({ ok: true, code });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
