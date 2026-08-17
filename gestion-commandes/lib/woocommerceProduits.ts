export type ProduitImporte = {
  wooId: number;
  parentId: number | null;
  sku: string | null;
  nom: string;
  categorie: string | null;
  couleur: string | null;
  taille: string | null;
  quantite: number;
  prix: number | null;
};

function identifiants() {
  const url = process.env.WOOCOMMERCE_URL;
  const key = process.env.WOOCOMMERCE_CONSUMER_KEY;
  const secret = process.env.WOOCOMMERCE_CONSUMER_SECRET;

  if (!url || !key || !secret) {
    throw new Error("Variables WooCommerce manquantes");
  }

  return {
    base: url.replace(/\/$/, "") + "/wp-json/wc/v3",
    auth: Buffer.from(`${key}:${secret}`).toString("base64"),
  };
}

async function appelWoo(chemin: string, options: RequestInit = {}) {
  const { base, auth } = identifiants();

  const res = await fetch(`${base}${chemin}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${auth}`,
    },
    cache: "no-store",
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.message || `Erreur WooCommerce (${res.status})`);
  }
  return data;
}

// Repere la couleur et la taille parmi les attributs d'une variante.
function lireVariantes(attributs: any[]) {
  let couleur: string | null = null;
  let taille: string | null = null;
  const autres: string[] = [];

  for (const a of attributs || []) {
    const cle = String(a?.name || "").toLowerCase();
    const valeur = String(a?.option || "").trim();
    if (!valeur) continue;

    if (cle.includes("couleur") || cle.includes("color")) couleur = valeur;
    else if (cle.includes("taille") || cle.includes("size") || cle.includes("pointure")) taille = valeur;
    else autres.push(valeur);
  }

  if (!couleur && autres.length > 0) couleur = autres[0];
  return { couleur, taille };
}

// Importe un lot de produits. Retourne la page suivante, ou null si termine.
export async function importerProduits(pageDebut: number, nbPages: number) {
  const resultat: ProduitImporte[] = [];
  let page = pageDebut;
  let termine = false;

  for (let i = 0; i < nbPages; i++) {
    const produits = await appelWoo(`/products?per_page=20&page=${page}&status=publish`);

    if (!Array.isArray(produits) || produits.length === 0) {
      termine = true;
      break;
    }

    for (const p of produits) {
      const categorie =
        Array.isArray(p.categories) && p.categories.length > 0 ? p.categories[0].name : null;

      if (p.type === "variable") {
        const variations = await appelWoo(`/products/${p.id}/variations?per_page=100`);

        for (const v of variations || []) {
          const info = lireVariantes(v.attributes);
          resultat.push({
            wooId: v.id,
            parentId: p.id,
            sku: v.sku || null,
            nom: p.name,
            categorie,
            couleur: info.couleur,
            taille: info.taille,
            quantite: Number(v.stock_quantity) || 0,
            prix: v.price ? Number(v.price) : null,
          });
        }
      } else {
        resultat.push({
          wooId: p.id,
          parentId: null,
          sku: p.sku || null,
          nom: p.name,
          categorie,
          couleur: null,
          taille: null,
          quantite: Number(p.stock_quantity) || 0,
          prix: p.price ? Number(p.price) : null,
        });
      }
    }

    page++;
  }

  return { produits: resultat, pageSuivante: termine ? null : page };
}

// Renvoie la quantite vers ounshijabi.com
export async function majStockWoo(wooId: number, parentId: number | null, quantite: number) {
  const chemin = parentId
    ? `/products/${parentId}/variations/${wooId}`
    : `/products/${wooId}`;

  return appelWoo(chemin, {
    method: "PUT",
    body: JSON.stringify({ manage_stock: true, stock_quantity: quantite }),
  });
}

export async function importerUnProduit(productId: number) {
  const p = await appelWoo(`/products/${productId}`);
  const resultat: ProduitImporte[] = [];

  const categorie =
    Array.isArray(p.categories) && p.categories.length > 0 ? p.categories[0].name : null;

  if (p.type === "variable") {
    const variations = await appelWoo(`/products/${p.id}/variations?per_page=100`);

    for (const v of variations || []) {
      const info = lireVariantes(v.attributes);
      resultat.push({
        wooId: v.id,
        parentId: p.id,
        sku: v.sku || null,
        nom: p.name,
        categorie,
        couleur: info.couleur,
        taille: info.taille,
        quantite: Number(v.stock_quantity) || 0,
        prix: v.price ? Number(v.price) : null,
      });
    }
  } else {
    resultat.push({
      wooId: p.id,
      parentId: null,
      sku: p.sku || null,
      nom: p.name,
      categorie,
      couleur: null,
      taille: null,
      quantite: Number(p.stock_quantity) || 0,
      prix: p.price ? Number(p.price) : null,
    });
  }

  return resultat;
}
