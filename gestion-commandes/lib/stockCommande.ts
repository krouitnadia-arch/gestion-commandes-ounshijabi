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

// Calcule les pieces qui doivent revenir au stock quand une commande est
// annulee ou supprimee.
//
// - Une commande deja annulee ou deja retournee ne rend rien : c'est deja fait.
// - Si un retour partiel a ete enregistre, seules les pieces restantes
//   reviennent au stock.
export async function lignesARestituer(order: any) {
  if (order?.statut === "ANNULEE" || order?.statut === "RETOURNEE") return [];

  const lignes: any[] = Array.isArray(order?.produits) ? (order.produits as any[]) : [];
  if (lignes.length === 0) return [];

  const dejaRendu: { [index: number]: number } = {};

  try {
    const retours = await prisma.retour.findMany({ where: { orderId: String(order.id) } });

    for (const r of retours) {
      const l: any[] = Array.isArray(r.lignes) ? (r.lignes as any[]) : [];
      for (const x of l) {
        const i = Number(x?.index);
        if (Number.isNaN(i)) continue;
        dejaRendu[i] = (dejaRendu[i] || 0) + (Number(x?.quantite) || 0);
      }
    }
  } catch {
    // si la table des retours n'est pas encore prete, on rend tout
  }

  const resultat: any[] = [];

  lignes.forEach((l, i) => {
    const restant = (Number(l?.quantite) || 0) - (dejaRendu[i] || 0);
    if (restant > 0) resultat.push({ ...l, quantite: restant });
  });

  return resultat;
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
