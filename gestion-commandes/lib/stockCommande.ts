import { prisma } from "./db";
import { majStockWoo } from "./woocommerceProduits";

// Retrouve la ligne de stock correspondant a une ligne de commande
async function trouverProduit(l: any) {
  if (l?.productId) {
    const p = await prisma.product.findUnique({ where: { id: String(l.productId) } });
    if (p) return p;
  }

  const cible = Number(l?.variationId) || Number(l?.produitId) || 0;
  if (cible > 0) {
    return prisma.product.findUnique({ where: { wooId: cible } });
  }

  return null;
}

// Remet les pieces d'une commande dans le stock
export async function restituerStock(produits: any) {
  const lignes: any[] = Array.isArray(produits) ? produits : [];
  const avertissements: string[] = [];
  let rendues = 0;

  for (const l of lignes) {
    const quantite = Number(l?.quantite) || 0;
    if (quantite <= 0) continue;

    const produit = await trouverProduit(l);

    if (!produit) {
      avertissements.push(`${l?.nom || "Article"} : ligne de stock introuvable, ajustez a la main`);
      continue;
    }

    const nouvelle = (produit.quantite || 0) + quantite;

    await prisma.product.update({
      where: { id: produit.id },
      data: { quantite: nouvelle },
    });
    rendues += quantite;

    if (produit.wooId) {
      try {
        await majStockWoo(produit.wooId, produit.parentId ?? null, nouvelle);
      } catch (e: any) {
        avertissements.push(`${produit.nom} : site non mis a jour (${e.message})`);
      }
    }
  }

  return { rendues, avertissements };
}

// Retire les pieces du stock (commandes Instagram)
export async function deduireStock(produits: any) {
  const lignes: any[] = Array.isArray(produits) ? produits : [];
  const avertissements: string[] = [];
  let retirees = 0;

  for (const l of lignes) {
    const quantite = Number(l?.quantite) || 0;
    if (quantite <= 0) continue;

    const produit = await trouverProduit(l);
    if (!produit) continue;

    const dispoMagasin = produit.quantiteMagasin || 0;
    const prisMagasin = Math.min(quantite, dispoMagasin);
    const prisSite = quantite - prisMagasin;

    const nouveauMagasin = dispoMagasin - prisMagasin;
    const nouveauSite = Math.max(0, (produit.quantite || 0) - prisSite);

    await prisma.product.update({
      where: { id: produit.id },
      data: { quantite: nouveauSite, quantiteMagasin: nouveauMagasin },
    });
    retirees += quantite;

    if (produit.wooId && prisSite > 0) {
      try {
        await majStockWoo(produit.wooId, produit.parentId ?? null, nouveauSite);
      } catch (e: any) {
        avertissements.push(`${produit.nom} : site non mis a jour (${e.message})`);
      }
    }
  }

  return { retirees, avertissements };
}
