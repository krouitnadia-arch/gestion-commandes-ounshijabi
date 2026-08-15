import { NextRequest, NextResponse } from "next/server";
import { verifyLogin } from "@/lib/auth";
import { createSessionToken, setSessionCookie } from "@/lib/session";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Champs manquants" }, { status: 400 });
  }

  const user = await verifyLogin(email, password);
  if (!user) {
    return NextResponse.json({ error: "Identifiants invalides" }, { status: 401 });
  }

  const token = await createSessionToken({
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role as any,
  });
  await setSessionCookie(token);

  return NextResponse.json({ ok: true, role: user.role });
}
