const BASE = "https://app.sendit.ma/api/v1";

let cacheToken: { token: string; expire: number } | null = null;
let cacheDistricts: { liste: any[]; expire: number } | null = null;

async function obtenirToken() {
  if (cacheToken && cacheToken.expire > Date.now()) return cacheToken.token;

  const public_key = process.env.SENDIT_PUBLIC_KEY;
  const secret_key = process.env.SENDIT_SECRET_KEY;

  if (!public_key || !secret_key) {
    throw new Error("Cles Sendit manquantes (SENDIT_PUBLIC_KEY / SENDIT_SECRET_KEY)");
  }

  const res = await fetch(`${BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ public_key, secret_key }),
    cache: "no-store",
  });

  const data = await res.json().catch(() => null);
  const token = data?.data?.token;

  if (!res.ok || !token) {
    throw new Error(data?.message || "Echec de connexion a Sendit");
  }

  cacheToken = { token, expire: Date.now() + 30 * 60 * 1000 };
  return token;
}

function messageErreur(data: any, statut: number) {
  const base = data?.message || `Erreur Sendit (${statut})`;
  const source = data?.errors ?? data?.data;

  if (source && typeof source === "object") {
    const details = Object.entries(source)
      .map(([champ, msgs]) => `${champ}: ${Array.isArray(msgs) ? msgs.join(", ") : msgs}`)
      .join(" | ");
    if (details) return `${base} — ${details}`;
  }
  return base;
}

async function appel(chemin: string, options: RequestInit = {}) {
  const token = await obtenirToken();

  const res = await fetch(`${BASE}${chemin}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(messageErreur(data, res.status));
  }
  return data;
}

async function listerTout(chemin: string) {
  const tout: any[] = [];
  let page = 1;
  let dernierePage = 1;

  do {
    const separateur = chemin.includes("?") ? "&" : "?";
    const reponse = await appel(`${chemin}${separateur}page=${page}`);

    const liste = Array.isArray(reponse?.data)
      ? reponse.data
      : Array.isArray(reponse?.data?.data)
      ? reponse.data.data
      : [];

    tout.push(...liste);

    dernierePage = Number(reponse?.last_page ?? reponse?.data?.last_page) || 1;
    page++;
  } while (page <= dernierePage && page <= 100);

  return tout;
}

export async function listerDistricts() {
  if (cacheDistricts && cacheDistricts.expire > Date.now()) return cacheDistricts.liste;

  const liste = await listerTout("/districts");
  cacheDistricts = { liste, expire: Date.now() + 60 * 60 * 1000 };
  return liste;
}

export async function listerVillesRamassage() {
  return listerTout("/districts/pickup-cities");
}

export async function creerColis(colis: Record<string, unknown>) {
  return appel("/deliveries", { method: "POST", body: JSON.stringify(colis) });
}

export async function suivreColis(code: string) {
  return appel(`/deliveries/${encodeURIComponent(code)}`);
}

export async function modifierColis(code: string, colis: Record<string, unknown>) {
  return appel(`/deliveries/${encodeURIComponent(code)}`, {
    method: "PUT",
    body: JSON.stringify(colis),
  });
}

export async function supprimerColis(code: string) {
  return appel(`/deliveries/${encodeURIComponent(code)}`, { method: "DELETE" });
}
