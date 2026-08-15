import { cookies } from "next/headers";
import {
  createSessionToken,
  verifySessionToken,
  MAX_AGE_SECONDS,
  type SessionData,
} from "./jwt";

const COOKIE_NAME = "session";

export async function setSessionCookie(token: string) {
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionData | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export { createSessionToken, verifySessionToken, COOKIE_NAME };
export type { SessionData };
