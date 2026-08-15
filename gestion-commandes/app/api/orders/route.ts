import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const orders = await prisma.order.findMany({
    orderBy: { dateCommande: "desc" },
    take: 300,
  });

  return NextResponse.json(orders);
}
