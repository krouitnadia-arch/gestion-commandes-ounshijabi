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
  await prisma.$executeRawUnsafe(
    `ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'EXPEDIEE';`
  );
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
  etapes.push("Colonnes stock verifiees");

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Vente" (
      "id" TEXT PRIMARY KEY,
      "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "lignes" JSONB NOT NULL,
      "total" DOUBLE PRECISION NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await prisma.$executeRawUnsafe(
    `ALTER TABLE "Vente" ADD COLUMN IF NOT EXISTS "clientNom" TEXT;`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "Vente" ADD COLUMN IF NOT EXISTS "clientTelephone" TEXT;`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "Vente" ADD COLUMN IF NOT EXISTS "avance" DOUBLE PRECISION NOT NULL DEFAULT 0;`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "Vente" ADD COLUMN IF NOT EXISTS "reste" DOUBLE PRECISION NOT NULL DEFAULT 0;`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "Vente" ADD COLUMN IF NOT EXISTS "paiement" TEXT;`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "Vente" ADD COLUMN IF NOT EXISTS "notes" TEXT;`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "Vente" ADD COLUMN IF NOT EXISTS "vendeur" TEXT;`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "Vente_date_idx" ON "Vente"("date");`
  );
  etapes.push("Table Ventes prete");

  return NextResponse.json({ succes: true, etapes });
}
