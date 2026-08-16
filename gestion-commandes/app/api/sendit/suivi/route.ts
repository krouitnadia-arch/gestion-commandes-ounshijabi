import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { suivreColis } from "@/lib/sendit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const commandes = await prisma.order.findMany({
    where: { senditCode: { not: null } },
    select: { senditCode: true },
    orderBy: { updatedAt: "desc" },
    take: 40,
  });

  const statuts: Record<string, string> = {};

  for (const c of commandes) {
    const code = c.senditCode as string;
    try {
      const reponse = await suivreColis(code);
      statuts[code] = reponse?.data?.status || "INCONNU";
    } catch {
      statuts[code] = "INCONNU";
    }
  }

  return NextResponse.json({ ok: true, statuts });
}
