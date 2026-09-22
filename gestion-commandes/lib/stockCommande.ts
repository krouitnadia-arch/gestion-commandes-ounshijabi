import { prisma } from "./db";
import { STATUTS_STOCK_RENDU } from "./statusConfig";

// ---------------------------------------------------------------------
// L'application n'ecrit plus rien sur ounshijabi.com : le stock du site
// se gere sur le site. Tous les mouvements ci-dessous ne touchent que le
// stock MAGASIN, qui appartient a l'application.
// ---------------------------------------------------------------------

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

// Pieces qui restent a remettre, en tenant compte des retours deja saisis
export async function lignesARestituer(order: any) {
  if (STATUTS_STOCK_RENDU.includes(String(order?.statut))) return [];

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
    // si la table des retours n'est pas encore prete, on compte tout
  }

  const resultat: any[] = [];

  lignes.forEach((l, i) => {
    const restant = (Number(l?.quantite) || 0) - (dejaRendu[i] || 0);
    if (restant > 0) resultat.push({ ...l, quantite: restant });
  });

  return resultat;
}

// Remet des pieces dans le stock MAGASIN (retours)
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

    await prisma.product.update({
      where: { id: produit.id },
      data: { quantiteMagasin: (produit.quantiteMagasin || 0) + quantite },
    });

    rendues += quantite;
  }

  return { rendues, avertissements };
}

// Retire des pieces du stock MAGASIN (ventes boutique, commandes Instagram)
export async function deduireStock(produits: any) {
  const lignes: any[] = Array.isArray(produits) ? produits : [];
  const avertissements: string[] = [];
  let retirees = 0;

  for (const l of lignes) {
    const quantite = Number(l?.quantite) || 0;
    if (quantite <= 0) continue;

    const produit = await trouverProduit(l);
    if (!produit) continue;

    const disponible = produit.quantiteMagasin || 0;

    if (disponible < quantite) {
      avertissements.push(
        `${produit.nom} : seulement ${disponible} piece(s) au magasin, stock mis a zero`
      );
    }

    await prisma.product.update({
      where: { id: produit.id },
      data: { quantiteMagasin: Math.max(0, disponible - quantite) },
    });

    retirees += Math.min(quantite, disponible);
  }

  return { retirees, avertissements };
}
