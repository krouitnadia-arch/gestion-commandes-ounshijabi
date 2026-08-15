import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { hashPassword } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true, role: true, actif: true },
  });
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const body = await req.json();
  if (!body.name || !body.email || !body.password || !body.role) {
    return NextResponse.json({ error: "Champs manquants" }, { status: 400 });
  }

  const password = await hashPassword(body.password);

  try {
    const user = await prisma.user.create({
      data: { name: body.name, email: body.email, password, role: body.role },
      select: { id: true, name: true, email: true, role: true, actif: true },
    });
    return NextResponse.json(user);
  } catch (e: any) {
    return NextResponse.json({ error: "Cet e-mail est déjà utilisé" }, { status: 400 });
  }
}
