import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { importerUnProduit } from "@/lib/woocommerceProduits";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  const cle = req.nextUrl.searchParams.get("cle");
  if (!cle || cle !== process.env.SESSION_SECRET) {
    return NextResponse.json({ erreur: "Cle invalide" }, { status: 401 });
  }

  const corps: any = await req.json().catch(() => null);

  // Si WooCommerce envoie une variante, on remonte au produit parent
  const parent = Number(corps?.parent_id || 0);
  const id = parent > 0 ? parent : Number(corps?.id || 0);

  if (!id) {
    return NextResponse.json({ ok: true, ignore: true });
  }

  try {
    const lignes = await importerUnProduit(id);

    for (const p of lignes) {
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

    return NextResponse.json({ ok: true, produit: id, majs: lignes.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
