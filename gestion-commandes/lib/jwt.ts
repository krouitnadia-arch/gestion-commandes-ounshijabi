import { SignJWT, jwtVerify } from "jose";

export type SessionData = {
  userId: string;
  name: string;
  email: string;
  role: "ADMIN" | "CONFIRMATION" | "EXPEDITION" | "STOCK";
};

const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 jours

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET manquant dans les variables d'environnement");
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(data: SessionData) {
  return await new SignJWT({ ...data })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifySessionToken(token: string): Promise<SessionData | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload as unknown as SessionData;
  } catch {
    return null;
  }
}

export { MAX_AGE_SECONDS };
