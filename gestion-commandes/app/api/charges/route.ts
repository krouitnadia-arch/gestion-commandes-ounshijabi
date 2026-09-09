import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const charges = await prisma.charge.findMany({ orderBy: { date: "desc" }, take: 300 });
  return NextResponse.json(charges);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const body = await req.json();
  const libelle = String(body.libelle || "").trim();
  const montant = Number(body.montant);

  if (!libelle) {
    return NextResponse.json({ error: "Indiquez l'intitule de la charge" }, { status: 400 });
  }

  if (Number.isNaN(montant) || montant <= 0) {
    return NextResponse.json({ error: "Indiquez un montant superieur a zero" }, { status: 400 });
  }

  // La date peut etre choisie, sinon c'est aujourd'hui
  const date = body.date ? new Date(String(body.date)) : new Date();

  const charge = await prisma.charge.create({
    data: {
      libelle,
      montant,
      date: isNaN(date.getTime()) ? new Date() : date,
      notes: body.notes || null,
      agent: session.name,
    },
  });

  return NextResponse.json({ ok: true, charge });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Identifiant manquant" }, { status: 400 });

  await prisma.charge.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
