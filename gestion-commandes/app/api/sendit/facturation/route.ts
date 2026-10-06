import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BASE = "https://app.sendit.ma/api/v1";

// Adresses plausibles pour la facturation : on les essaie toutes
const PISTES = [
  "/invoices",
  "/invoice",
  "/payments",
  "/payment",
  "/billing",
  "/billings",
  "/transactions",
  "/statements",
  "/wallet",
  "/balance",
  "/factures",
  "/paiements",
  "/transfers",
  "/withdrawals",
];

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

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  let token = "";
  try {
    token = await connexion();
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Erreur Sendit" }, { status: 500 });
  }

  // ?chemin=/invoices : on interroge une seule adresse et on renvoie tout
  const seul = req.nextUrl.searchParams.get("chemin");
  const liste = seul ? [seul] : PISTES;

  const resultats: any[] = [];

  for (const chemin of liste) {
    try {
      const res = await fetch(`${BASE}${chemin}`, {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      const texte = await res.text();

      resultats.push({
        chemin,
        http: res.status,
        trouve: res.status !== 404 && res.status !== 405,
        apercu: seul ? texte.slice(0, 6000) : texte.slice(0, 220),
      });
    } catch (e: any) {
      resultats.push({ chemin, http: 0, trouve: false, apercu: String(e?.message || e) });
    }
  }

  return NextResponse.json({ resultats });
}
