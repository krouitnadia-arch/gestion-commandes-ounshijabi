const BASE = "https://app.sendit.ma/api/v1";

let cache: { token: string; expire: number } | null = null;

async function obtenirToken() {
  if (cache && cache.expire > Date.now()) return cache.token;

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

  cache = { token, expire: Date.now() + 30 * 60 * 1000 };
  return token;
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
    throw new Error(data?.message || `Erreur Sendit (${res.status})`);
  }
  return data;
}

// Certaines reponses sont paginees : on ramene toujours un tableau simple.
function extraireListe(reponse: any) {
  const d = reponse?.data;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  return [];
}

export async function listerDistricts() {
  return extraireListe(await appel("/districts"));
}

export async function listerVillesRamassage() {
  return extraireListe(await appel("/districts/pickup-cities"));
}

export async function creerColis(colis: Record<string, unknown>) {
  return appel("/deliveries", { method: "POST", body: JSON.stringify(colis) });
}
