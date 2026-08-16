
Route setup · TS
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
 
export const dynamic = "force-dynamic";
export const maxDuration = 60;
 
// Page d'installation à visiter UNE SEULE FOIS :
// https://votre-app.vercel.app/api/auth/setup?cle=LE_SESSION_SECRET
//
// Elle crée les tables de la base de données et le compte administrateur.
// Une fois l'installation faite, cette page peut être supprimée du projet.
 
export async function GET(req: NextRequest) {
  const cle = req.nextUrl.searchParams.get("cle");
  if (!cle || cle !== process.env.SESSION_SECRET) {
    return NextResponse.json(
      { erreur: "Clé invalide. Ajoutez ?cle=VOTRE_SESSION_SECRET à l'adresse." },
      { status: 401 }
    );
  }
 
  const etapes: string[] = [];
 
  try {
    // 1. Types énumérés
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "Role" AS ENUM ('ADMIN','CONFIRMATION','EXPEDITION','STOCK');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "OrderStatus" AS ENUM ('NOUVELLE','APPELE','CONFIRMEE','ANNULEE','REPORTEE','RETRAIT_MAGASIN');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);
    etapes.push("Types de statuts créés");
 
    // 2. Table des utilisateurs
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "User" (
        "id" TEXT PRIMARY KEY,
        "name" TEXT NOT NULL,
        "email" TEXT NOT NULL UNIQUE,
        "password" TEXT NOT NULL,
        "role" "Role" NOT NULL DEFAULT 'CONFIRMATION',
        "actif" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    etapes.push("Table Utilisateurs créée");
 
    // 3. Table des commandes
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Order" (
        "id" TEXT PRIMARY KEY,
        "wooId" INTEGER NOT NULL UNIQUE,
        "numero" TEXT NOT NULL,
        "clientNom" TEXT NOT NULL,
        "clientTelephone" TEXT NOT NULL,
        "clientAdresse" TEXT,
        "clientVille" TEXT,
        "produits" JSONB NOT NULL,
        "total" DOUBLE PRECISION NOT NULL,
        "dateCommande" TIMESTAMP(3) NOT NULL,
        "statut" "OrderStatus" NOT NULL DEFAULT 'NOUVELLE',
        "appele" BOOLEAN NOT NULL DEFAULT false,
        "appeleA" TIMESTAMP(3),
        "appelePar" TEXT,
        "saisiLivraison" BOOLEAN NOT NULL DEFAULT false,
        "notes" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "Order_statut_idx" ON "Order"("statut");`
    );
    etapes.push("Table Commandes créée");
 
    // 4. Table des produits (stock)
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Product" (
        "id" TEXT PRIMARY KEY,
        "wooId" INTEGER UNIQUE,
        "nom" TEXT NOT NULL,
        "reference" TEXT,
        "quantite" INTEGER NOT NULL DEFAULT 0,
        "seuilAlerte" INTEGER NOT NULL DEFAULT 5,
        "prix" DOUBLE PRECISION,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    etapes.push("Table Stock créée");
 
    // 5. Journal des synchronisations
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "SyncLog" (
        "id" TEXT PRIMARY KEY,
        "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "nbNouvelles" INTEGER NOT NULL DEFAULT 0,
        "succes" BOOLEAN NOT NULL DEFAULT true,
        "message" TEXT
      );
    `);
    etapes.push("Journal de synchronisation créé");
 
    // 6. Compte administrateur
    const existant = await prisma.user.findUnique({
      where: { email: "admin@ounshijabi.com" },
    });
 
    let motDePasse: string | null = null;
 
    if (!existant) {
      motDePasse = "admin1234";
      await prisma.user.create({
        data: {
          name: "Administrateur",
          email: "admin@ounshijabi.com",
          password: await bcrypt.hash(motDePasse, 10),
          role: "ADMIN",
        },
      });
      etapes.push("Compte administrateur créé");
    } else {
      etapes.push("Compte administrateur déjà existant (inchangé)");
    }
 
    return NextResponse.json({
      succes: true,
      message: "Installation terminée avec succès.",
      etapes,
      connexion: motDePasse
        ? {
            email: "admin@ounshijabi.com",
            motDePasse,
            note: "Changez ce mot de passe après la première connexion.",
          }
        : "Utilisez le compte administrateur déjà existant.",
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        succes: false,
        etapesReussies: etapes,
        erreur: e?.message ?? String(e),
      },
      { status: 500 }
    );
  }
}
 

