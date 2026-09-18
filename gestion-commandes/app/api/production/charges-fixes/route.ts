import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const LIGNES_PAR_DEFAUT = [
  { libelle: "Loyer du magasin", montant: 0 },
  { libelle: "Salaires", montant: 0 },
  { libelle: "Wifi", montant: 0 },
  { libelle: "Abonnements", montant: 0 },
  { libelle: "Charges magasin", montant: 100, auto: "MAGASIN" },
];

function moisValide(m: string) {
  return /^\d{4}-\d{2}$/.test(m);
}

function bornes(mois: string) {
  const [annee, m] = mois.split("-").map(Number);
  const debut = new Date(Date.UTC(annee, m - 1, 1));
  const fin = new Date(Date.UTC(annee, m, 1));
  return { debut, fin };
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const mois = req.nextUrl.searchParams.get("mois") || "";
  if (!moisValide(mois)) {
    return NextResponse.json({ error: "Mois attendu au format AAAA-MM" }, { status: 400 });
  }

  let config = await prisma.chargeFixe.findUnique({ where: { mois } });

  if (!config) {
    config = await prisma.chargeFixe.create({
      data: { mois, lignes: LIGNES_PAR_DEFAUT as any, piecesEstimees: 400 },
    });
  }

  const { debut, fin } = bornes(mois);

  // Pieces reellement produites : seuls les modeles termines comptent
  const finis = await prisma.modele.findMany({
    where: { phase: "FINIE", date: { gte: debut, lt: fin } },
    select: { quantite: true },
  });

  const piecesReelles = finis.reduce((s, m) => s + (m.quantite || 0), 0);

  // Total reel des charges du magasin sur le mois
  const chargesMagasin = await prisma.charge.findMany({
    where: { date: { gte: debut, lt: fin } },
    select: { montant: true },
  });

  const magasinReel = chargesMagasin.reduce((s, c) => s + (c.montant || 0), 0);

  return NextResponse.json({
    ok: true,
    config,
    piecesReelles,
    nbModelesFinis: finis.length,
    magasinReel: Math.round(magasinReel),
  });
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const body = await req.json();
  const mois = String(body.mois || "");

  if (!moisValide(mois)) {
    return NextResponse.json({ error: "Mois attendu au format AAAA-MM" }, { status: 400 });
  }

  const lignes = Array.isArray(body.lignes)
    ? body.lignes
        .map((l: any) => ({
          libelle: String(l?.libelle || "").trim(),
          montant: Math.max(0, Number(l?.montant) || 0),
          auto: l?.auto || undefined,
        }))
        .filter((l: any) => l.libelle)
    : LIGNES_PAR_DEFAUT;

  const piecesEstimees = Math.max(1, Number(body.piecesEstimees) || 400);

  const config = await prisma.chargeFixe.upsert({
    where: { mois },
    update: { lignes: lignes as any, piecesEstimees },
    create: { mois, lignes: lignes as any, piecesEstimees },
  });

  return NextResponse.json({ ok: true, config });
}
