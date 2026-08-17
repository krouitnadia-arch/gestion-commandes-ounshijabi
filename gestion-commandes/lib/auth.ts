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

export const ROLE_PATHS: Record<string, string[]> = {
  ADMIN: ["/commandes", "/expedition", "/magasin", "/stock", "/utilisateurs"],
  CONFIRMATION: ["/commandes"],
  EXPEDITION: ["/expedition"],
  STOCK: ["/magasin", "/stock"],
};

export function defaultPathForRole(role: string) {
  return ROLE_PATHS[role]?.[0] ?? "/commandes";
}
