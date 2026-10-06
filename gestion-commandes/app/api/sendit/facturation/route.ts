import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BASE = "https://app.sendit.ma/api/v1";
const PAGES_MAX = 10;

async function connexion() {
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

async function lire(token: string, chemin: string) {
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

function nombre(valeur: any) {
  const n = Number(valeur);
  return Number.isFinite(n) ? n : 0;
}

function moisDe(date: any) {
  return String(date || "").slice(0, 7);
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const maintenant = new Date();
  const moisDefaut = `${maintenant.getFullYear()}-${String(maintenant.getMonth() + 1).padStart(2, "0")}`;
  const mois = req.nextUrl.searchParams.get("mois") || moisDefaut;

  try {
    const token = await connexion();

    // 1. La liste des factures, page par page, jusqu'a sortir du mois demande
    const entetes: any[] = [];
    let page = 1;
    let dernierePage = 1;
    let depasse = false;

    do {
      const reponse: any = await lire(token, `/invoices?page=${page}`);
      const liste = Array.isArray(reponse?.data) ? reponse.data : [];

      dernierePage = Number(reponse?.last_page ?? reponse?.data?.last_page) || 1;

      for (const f of liste) {
        const m = moisDe(f?.date);
        if (m > mois) continue;
        if (m < mois) {
          depasse = true;
          continue;
        }
        entetes.push(f);
      }

      page++;
    } while (!depasse && page <= dernierePage && page <= PAGES_MAX);

    // 2. Le detail de chacune, pour isoler articles / frais / commission
    const factures: any[] = [];

    for (const e of entetes) {
      const code = String(e?.code || "");
      if (!code) continue;

      let articles = 0;
      let fraisLivraison = 0;
      let autres = 0;
      let nbColis = 0;
      let commission = 0;
      const codesColis: string[] = [];

      try {
        const detail: any = await lire(token, `/invoices/${encodeURIComponent(code)}`);
        const d = detail?.data || {};
        commission = nombre(d?.transaction_fee);

        const items: any[] = Array.isArray(d?.items) ? d.items : [];

        for (const it of items) {
          const type = String(it?.type || "");
          const montant = nombre(it?.amount);
          const frais = nombre(it?.fee);

          if (type === "delivery") {
            if (String(it?.status || "").toUpperCase() === "DELIVERED") {
              articles += montant - frais;
              fraisLivraison += frais;
              nbColis++;
              if (it?.code) codesColis.push(String(it.code));
            }
          } else {
            // pickup, extra_payment et autres lignes de la facture
            autres += montant - frais;
          }
        }
      } catch {
        // si le detail est illisible, on garde au moins l'entete
      }

      factures.push({
        code,
        statut: String(e?.status || ""),
        date: e?.date || null,
        vire: nombre(e?.amount),
        articles: Math.round(articles),
        fraisLivraison: Math.round(fraisLivraison),
        commission,
        autres: Math.round(autres),
        nbColis,
        codesColis,
      });
    }

    const payees = factures.filter((f) => f.statut.toUpperCase() === "PAID");
    const attente = factures.filter((f) => f.statut.toUpperCase() !== "PAID");

    function cumul(liste: any[]) {
      return {
        nombre: liste.length,
        vire: liste.reduce((s, f) => s + f.vire, 0),
        articles: liste.reduce((s, f) => s + f.articles, 0),
        fraisLivraison: liste.reduce((s, f) => s + f.fraisLivraison, 0),
        commission: liste.reduce((s, f) => s + f.commission, 0),
        colis: liste.reduce((s, f) => s + f.nbColis, 0),
      };
    }

    return NextResponse.json({
      mois,
      factures,
      payees: cumul(payees),
      attente: cumul(attente),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Erreur Sendit" }, { status: 500 });
  }
}
