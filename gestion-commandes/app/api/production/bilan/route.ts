import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

function moisValide(m: string) {
  return /^\d{4}-\d{2}$/.test(m);
}

function bornes(mois: string) {
  const [annee, m] = mois.split("-").map(Number);
  return {
    debut: new Date(Date.UTC(annee, m - 1, 1)),
    fin: new Date(Date.UTC(annee, m, 1)),
  };
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const mois = req.nextUrl.searchParams.get("mois") || "";
  if (!moisValide(mois)) {
    return NextResponse.json({ error: "Mois attendu au format AAAA-MM" }, { status: 400 });
  }

  const { debut, fin } = bornes(mois);

  // Ce qui est reellement entre : commandes livrees + ventes magasin
  const livrees = await prisma.order.findMany({
    where: { statut: "LIVREE", dateCommande: { gte: debut, lt: fin } },
    select: { total: true },
  });

  const ventes = await prisma.vente.findMany({
    where: { date: { gte: debut, lt: fin } },
    select: { total: true },
  });

  const retours = await prisma.retour.findMany({
    where: { date: { gte: debut, lt: fin } },
    select: { total: true },
  });

  const caLivraisons = livrees.reduce((s, o) => s + (o.total || 0), 0);
  const caMagasin = ventes.reduce((s, v) => s + (v.total || 0), 0);
  const totalRetours = retours.reduce((s, r) => s + (r.total || 0), 0);
  const caNet = caLivraisons + caMagasin - totalRetours;

  // Ce qui est reellement sorti : charges fixes du mois
  const config = await prisma.chargeFixe.findUnique({ where: { mois } });
  const lignesFixes: any[] = Array.isArray(config?.lignes) ? (config?.lignes as any[]) : [];
  const chargesFixes = lignesFixes.reduce((s, l) => s + (Number(l?.montant) || 0), 0);

  // Et les charges directes des modeles termines ce mois-ci
  const finis = await prisma.modele.findMany({
    where: { phase: "FINIE", date: { gte: debut, lt: fin } },
  });

  let coutsDirects = 0;
  const contributions: any[] = [];

  for (const m of finis) {
    const lignes: any[] = Array.isArray(m.lignes) ? (m.lignes as any[]) : [];
    const direct = lignes.reduce((s, l) => s + (Number(l?.montant) || 0), 0);
    const emballage = (m.emballageUnitaire || 0) * (m.quantite || 0);
    const totalDirect = direct + emballage;

    coutsDirects += totalDirect;

    contributions.push({
      id: m.id,
      nom: m.nom,
      quantite: m.quantite || 0,
      totalDirect: Math.round(totalDirect),
      prixVente: m.prixVente || 0,
      caPotentiel: Math.round((m.prixVente || 0) * (m.quantite || 0)),
    });
  }

  const resultat = caNet - chargesFixes - coutsDirects;

  return NextResponse.json({
    ok: true,
    mois,
    caLivraisons: Math.round(caLivraisons),
    caMagasin: Math.round(caMagasin),
    retours: Math.round(totalRetours),
    caNet: Math.round(caNet),
    chargesFixes: Math.round(chargesFixes),
    coutsDirects: Math.round(coutsDirects),
    resultat: Math.round(resultat),
    nbLivrees: livrees.length,
    nbVentes: ventes.length,
    contributions,
  });
}
