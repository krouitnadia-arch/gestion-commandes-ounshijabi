import bcrypt from "bcryptjs";
import { prisma } from "./db";

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyLogin(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.actif) return null;
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return null;
  return user;
}

// EMPLOYE : acces complet aux commandes, a l'expedition, aux retours et au
// magasin. Le stock est consultable mais non modifiable (verrouille cote
// serveur dans les routes /api/stock).
export const ROLE_PATHS: Record<string, string[]> = {
  ADMIN: ["/commandes", "/expedition", "/retours", "/magasin", "/stock", "/utilisateurs"],
  EMPLOYE: ["/commandes", "/expedition", "/retours", "/magasin", "/stock"],
  CONFIRMATION: ["/commandes"],
  EXPEDITION: ["/expedition", "/retours"],
  STOCK: ["/magasin", "/stock", "/retours"],
};

// Seule l'administratrice peut modifier le stock a la main
export function peutModifierStock(role: string) {
  return role === "ADMIN";
}

// Le tableau de bord n'est visible que par l'administratrice
export function peutVoirTableauBord(role: string) {
  return role === "ADMIN";
}

export function defaultPathForRole(role: string) {
  return ROLE_PATHS[role]?.[0] ?? "/commandes";
}
