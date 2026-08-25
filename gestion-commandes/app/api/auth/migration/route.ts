import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const session = await getSession();
  const cle = req.nextUrl.searchParams.get("cle");

  const autorise =
    (session && session.role === "ADMIN") || (cle && cle === process.env.SESSION_SECRET);

  if (!autorise) {
    return NextResponse.json(
      { erreur: "Connectez-vous a l'application avec le compte administrateur, puis rouvrez cette adresse." },
      { status: 401 }
    );
  }

  const etapes: string[] = [];

  await prisma.$executeRawUnsafe(`ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "senditCode" TEXT;`);
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "senditDistrictId" INTEGER;`
  );
  await prisma.$executeRawUnsafe(`ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "senditEtat" JSONB;`);
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "stockDeduit" BOOLEAN NOT NULL DEFAULT false;`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "fraisLivraison" DOUBLE PRECISION NOT NULL DEFAULT 0;`
  );
  await prisma.$executeRawUnsafe(`ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'EXPEDIEE';`);
  await prisma.$executeRawUnsafe(`ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'RETOURNEE';`);
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "Order_dateCommande_idx" ON "Order"("dateCommande");`
  );
  etapes.push("Colonnes commandes verifiees (dont senditEtat et senditDistrictId)");

  await prisma.$executeRawUnsafe(`ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "parentId" INTEGER;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "sku" TEXT;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "categorie" TEXT;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "couleur" TEXT;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "taille" TEXT;`);
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "quantiteMagasin" INTEGER NOT NULL DEFAULT 0;`
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
  await prisma.$executeRawUnsafe(`ALTER TABLE "Vente" ADD COLUMN IF NOT EXISTS "clientNom" TEXT;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "Vente" ADD COLUMN IF NOT EXISTS "clientTelephone" TEXT;`);
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "Vente" ADD COLUMN IF NOT EXISTS "avance" DOUBLE PRECISION NOT NULL DEFAULT 0;`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "Vente" ADD COLUMN IF NOT EXISTS "reste" DOUBLE PRECISION NOT NULL DEFAULT 0;`
  );
  await prisma.$executeRawUnsafe(`ALTER TABLE "Vente" ADD COLUMN IF NOT EXISTS "paiement" TEXT;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "Vente" ADD COLUMN IF NOT EXISTS "notes" TEXT;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "Vente" ADD COLUMN IF NOT EXISTS "vendeur" TEXT;`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Vente_date_idx" ON "Vente"("date");`);
  etapes.push("Table Ventes prete");

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Retour" (
      "id" TEXT PRIMARY KEY,
      "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "orderId" TEXT,
      "numero" TEXT,
      "senditCode" TEXT,
      "clientNom" TEXT,
      "lignes" JSONB NOT NULL,
      "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "complet" BOOLEAN NOT NULL DEFAULT true,
      "notes" TEXT,
      "agent" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Retour_date_idx" ON "Retour"("date");`);
  etapes.push("Table Retours prete");

  return NextResponse.json({ succes: true, etapes });
}
