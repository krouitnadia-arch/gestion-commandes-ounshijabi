import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BASE = "https://app.sendit.ma/api/v1";
const PAGES_MAX = 10;

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

function nombre(valeur: any) {
  const n = Number(valeur);
  return Number.isFinite(n) ? n : 0;
}

async function connexionSendit() {
  const public_key = process.env.SENDIT_PUBLIC_KEY;
  const secret_key = process.env.SENDIT_SECRET_KEY;
  if (!public_key || !secret_key) throw new Error("Cles Sendit manquantes");

  const res = await fetch(`${BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ public_key, secret_key }),
    cache: "no-store",
  });

  const data = await res.json().catch(() => null);
  const token = data?.data?.token;
  if (!token) throw new Error(data?.message || "Connexion Sendit refusee");
  return token;
}

async function lireSendit(token: string, chemin: string) {
  const res = await fetch(`${BASE}${chemin}`, {
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message || `Erreur Sendit (${res.status})`);
  return data;
}

// Montant des articles encaisses ce mois-ci, frais de livraison exclus
async function encaissementsDuMois(mois: string) {
  const token = await connexionSendit();

  const entetes: any[] = [];
  let page = 1;
  let dernierePage = 1;
  let depasse = false;

  do {
    const reponse: any = await lireSendit(token, `/invoices?page=${page}`);
    const liste = Array.isArray(reponse?.data) ? reponse.data : [];
    dernierePage = Number(reponse?.last_page ?? reponse?.data?.last_page) || 1;

    for (const f of liste) {
      const m = String(f?.date || "").slice(0, 7);
      if (m > mois) continue;
      if (m < mois) {
        depasse = true;
        continue;
      }
      if (String(f?.status || "").toUpperCase() === "PAID") entetes.push(f);
    }

    page++;
  } while (!depasse && page <= dernierePage && page <= PAGES_MAX);

  let articles = 0;
  let fraisLivraison = 0;
  let vire = 0;
  let colis = 0;

  for (const e of entetes) {
    vire += nombre(e?.amount);

    const code = String(e?.code || "");
    if (!code) continue;

    const detail: any = await lireSendit(token, `/invoices/${encodeURIComponent(code)}`);
    const items: any[] = Array.isArray(detail?.data?.items) ? detail.data.items : [];

    for (const it of items) {
      if (String(it?.type || "") !== "delivery") continue;
      if (String(it?.status || "").toUpperCase() !== "DELIVERED") continue;

      articles += nombre(it?.amount) - nombre(it?.fee);
      fraisLivraison += nombre(it?.fee);
      colis++;
    }
  }

  return {
    articles: Math.round(articles),
    fraisLivraison: Math.round(fraisLivraison),
    vire: Math.round(vire),
    colis,
    factures: entetes.length,
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

  // Le chiffre d'affaires reel vient des factures Sendit payees.
  // Les retours n'en sont pas deduits : un colis retourne n'est jamais paye.
  let caSendit = 0;
  let fraisSendit = 0;
  let vireSendit = 0;
  let colisSendit = 0;
  let facturesSendit = 0;
  let senditErreur: string | null = null;

  try {
    const e = await encaissementsDuMois(mois);
    caSendit = e.articles;
    fraisSendit = e.fraisLivraison;
    vireSendit = e.vire;
    colisSendit = e.colis;
    facturesSendit = e.factures;
  } catch (err: any) {
    senditErreur = err?.message ?? "Facturation Sendit indisponible";
  }

  const caNet = caSendit + caMagasin;

  const config = await prisma.chargeFixe.findUnique({ where: { mois } });
  const lignesFixes: any[] = Array.isArray(config?.lignes) ? (config?.lignes as any[]) : [];
  const chargesFixes = lignesFixes.reduce((s, l) => s + (Number(l?.montant) || 0), 0);

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
    caSendit,
    fraisSendit,
    vireSendit,
    colisSendit,
    facturesSendit,
    senditErreur,
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
