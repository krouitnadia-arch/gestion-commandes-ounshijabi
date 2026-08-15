import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { hashPassword } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.role !== undefined) data.role = body.role;
  if (body.actif !== undefined) data.actif = body.actif;
  if (body.password) data.password = await hashPassword(body.password);

  const user = await prisma.user.update({
    where: { id: params.id },
    data,
    select: { id: true, name: true, email: true, role: true, actif: true },
  });
  return NextResponse.json(user);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }
  if (session.userId === params.id) {
    return NextResponse.json({ error: "Impossible de supprimer votre propre compte" }, { status: 400 });
  }

  await prisma.user.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
