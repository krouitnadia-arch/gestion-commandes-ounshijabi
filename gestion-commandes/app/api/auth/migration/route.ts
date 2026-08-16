import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const cle = req.nextUrl.searchParams.get("cle");
  if (!cle || cle !== process.env.SESSION_SECRET) {
    return NextResponse.json({ erreur: "Cle invalide." }, { status: 401 });
  }

  const etapes: string[] = [];

  await prisma.$executeRawUnsafe(
    `ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "senditCode" TEXT;`
  );
  etapes.push("Colonne senditCode verifiee");

  await prisma.$executeRawUnsafe(
    `ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'EXPEDIEE';`
  );
  etapes.push("Statut EXPEDIEE ajoute");

  return NextResponse.json({ succes: true, etapes });
}
