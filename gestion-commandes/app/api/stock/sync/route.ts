import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { importerProduits } from "@/lib/woocommerceProduits";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  if (session.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Seule l'administratrice peut importer le stock" },
      { status: 403 }
    );
  }

  const page = Number(req.nextUrl.searchParams.get("page")) || 1;

  try {
    const lot = await importerProduits(page, 3);

    for (const p of lot.produits) {
      await prisma.product.upsert({
        where: { wooId: p.wooId },
        update: {
          parentId: p.parentId,
          sku: p.sku,
          nom: p.nom,
          categorie: p.categorie,
          couleur: p.couleur,
          taille: p.taille,
          quantite: p.quantite,
          prix: p.prix,
        },
        create: {
          wooId: p.wooId,
          parentId: p.parentId,
          sku: p.sku,
          nom: p.nom,
          categorie: p.categorie,
          couleur: p.couleur,
          taille: p.taille,
          quantite: p.quantite,
          prix: p.prix,
        },
      });
    }

    return NextResponse.json({
      ok: true,
      importes: lot.produits.length,
      pageSuivante: lot.pageSuivante,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
