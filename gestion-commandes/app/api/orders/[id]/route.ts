import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { STATUS_LIST } from "@/lib/statusConfig";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (body.statut) {
    if (!STATUS_LIST.includes(body.statut)) {
      return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
    }
    data.statut = body.statut;
  }

  if (typeof body.notes === "string") data.notes = body.notes;
  if (typeof body.saisiLivraison === "boolean") data.saisiLivraison = body.saisiLivraison;

  if (body.total !== undefined) {
    const total = Number(body.total);
    if (!Number.isNaN(total) && total >= 0) data.total = total;
  }

  if (body.marquerAppele) {
    data.appele = true;
    data.appeleA = new Date();
    data.appelePar = session.name;
    if (!body.statut) data.statut = "APPELE";
  }

  const order = await prisma.order.update({ where: { id: params.id }, data });
  return NextResponse.json(order);
}
