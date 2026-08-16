import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const cle = req.nextUrl.searchParams.get("cle");
  if (!cle || cle !== process.env.SESSION_SECRET) {
    return NextResponse.json({ erreur: "Cle invalide." }, { status: 401 });
  }

  await prisma.$executeRawUnsafe(
    `ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "senditCode" TEXT;`
  );

  return NextResponse.json({ succes: true, message: "Colonne senditCode ajoutee." });
}
