import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Non exporte : un fichier route.ts n'accepte que les exports reconnus
// par Next.js (GET, POST, dynamic, maxDuration...).
const PHASES = ["ETUDE", "ECHANTILLON", "COUPE", "PRODUCTION", "FINIE"];

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const modeles = await prisma.modele.findMany({ orderBy: { date: "desc" }, take: 300 });
  return NextResponse.json(modeles);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const body = await req.json();
  const nom = String(body.nom || "").trim();

  if (!nom) return NextResponse.json({ error: "Indiquez le nom du modele" }, { status: 400 });

  const date = body.date ? new Date(String(body.date)) : new Date();

  const modele = await prisma.modele.create({
    data: {
      nom,
      atelier: body.atelier ? String(body.atelier).trim() : null,
      phase: PHASES.includes(body.phase) ? body.phase : "ETUDE",
      quantite: Math.max(0, Number(body.quantite) || 0),
      prixVente: Math.max(0, Number(body.prixVente) || 0),
      date: isNaN(date.getTime()) ? new Date() : date,
      lignes: [] as any,
      notes: body.notes || null,
    },
  });

  return NextResponse.json({ ok: true, modele });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const body = await req.json();
  const id = String(body.id || "");
  if (!id) return NextResponse.json({ error: "Identifiant manquant" }, { status: 400 });

  const data: Record<string, unknown> = {};

  if (typeof body.nom === "string" && body.nom.trim()) data.nom = body.nom.trim();
  if (typeof body.atelier === "string") data.atelier = body.atelier.trim() || null;
  if (typeof body.notes === "string") data.notes = body.notes;
  if (body.phase && PHASES.includes(body.phase)) data.phase = body.phase;

  if (body.quantite !== undefined) data.quantite = Math.max(0, Number(body.quantite) || 0);
  if (body.prixVente !== undefined) data.prixVente = Math.max(0, Number(body.prixVente) || 0);

  if (body.emballageUnitaire !== undefined) {
    data.emballageUnitaire = Math.max(0, Number(body.emballageUnitaire) || 0);
  }

  if (body.date) {
    const d = new Date(String(body.date));
    if (!isNaN(d.getTime())) data.date = d;
  }

  // Les lignes de charges directes : [{ libelle, montant }]
  if (Array.isArray(body.lignes)) {
    data.lignes = body.lignes
      .map((l: any) => ({
        libelle: String(l?.libelle || "").trim(),
        montant: Math.max(0, Number(l?.montant) || 0),
      }))
      .filter((l: any) => l.libelle) as any;
  }

  const modele = await prisma.modele.update({ where: { id }, data });
  return NextResponse.json({ ok: true, modele });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Identifiant manquant" }, { status: 400 });

  await prisma.modele.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
