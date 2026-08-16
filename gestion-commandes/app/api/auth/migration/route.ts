import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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
  etapes.push("Statut EXPEDIEE verifie");

  await prisma.$executeRawUnsafe(
    `ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "parentId" INTEGER;`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "sku" TEXT;`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "categorie" TEXT;`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "couleur" TEXT;`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "taille" TEXT;`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "Product_categorie_idx" ON "Product"("categorie");`
  );
  etapes.push("Colonnes stock ajoutees");

  return NextResponse.json({ succes: true, etapes });
}
