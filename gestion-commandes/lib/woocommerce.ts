export type WooMeta = {
  key?: string;
  display_key?: string;
  value?: unknown;
  display_value?: unknown;
};

export type WooLineItem = {
  name: string;
  quantity: number;
  total: string;
  meta_data?: WooMeta[];
};

export type WooOrder = {
  id: number;
  number: string;
  status: string;
  date_created: string;
  total: string;
  billing: {
    first_name: string;
    last_name: string;
    phone: string;
    address_1: string;
    city: string;
  };
  line_items: WooLineItem[];
};

function getCredentials() {
  const url = process.env.WOOCOMMERCE_URL;
  const key = process.env.WOOCOMMERCE_CONSUMER_KEY;
  const secret = process.env.WOOCOMMERCE_CONSUMER_SECRET;
  if (!url || !key || !secret) {
    throw new Error("Variables WooCommerce manquantes");
  }
  return { url: url.replace(/\/$/, ""), key, secret };
}

export async function fetchWooOrders(opts?: { after?: string; perPage?: number }): Promise<WooOrder[]> {
  const { url, key, secret } = getCredentials();
  const auth = Buffer.from(`${key}:${secret}`).toString("base64");

  const params = new URLSearchParams({
    per_page: String(opts?.perPage ?? 50),
    orderby: "date",
    order: "desc",
  });
  if (opts?.after) params.set("after", opts.after);

  const res = await fetch(`${url}/wp-json/wc/v3/orders?${params.toString()}`, {
    headers: { Authorization: `Basic ${auth}` },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Erreur WooCommerce (${res.status}) : ${text}`);
  }

  return res.json();
}

function texteMeta(valeur: unknown): string {
  if (typeof valeur === "string") return valeur.trim();
  if (typeof valeur === "number") return String(valeur);
  return "";
}

function extraireVariantes(li: WooLineItem) {
  let couleur = "";
  let taille = "";
  const autres: { cle: string; valeur: string }[] = [];

  for (const meta of li.meta_data || []) {
    const brut = String(meta.display_key ?? meta.key ?? "");
    if (!brut || brut.startsWith("_")) continue;

    const cle = brut.toLowerCase();
    const valeur = texteMeta(meta.display_value ?? meta.value);
    if (!valeur) continue;

    if (cle.includes("couleur") || cle.includes("color") || cle.includes("لون")) {
      couleur = couleur || valeur;
    } else if (
      cle.includes("taille") ||
      cle.includes("size") ||
      cle.includes("pointure") ||
      cle.includes("مقاس")
    ) {
      taille = taille || valeur;
    } else {
      autres.push({ cle: brut, valeur });
    }
  }

  // Dans cette boutique, l'option de couleur porte le nom du modele
  // (exemple : "Nysma : Blanc"). Faute de cle explicite, la premiere
  // option restante est consideree comme la couleur.
  const options: string[] = [];
  for (const o of autres) {
    if (!couleur) {
      couleur = o.valeur;
    } else {
      options.push(`${o.cle} : ${o.valeur}`);
    }
  }

  return { couleur, taille, options };
}

export function wooOrderToLocal(order: WooOrder) {
  return {
    wooId: order.id,
    numero: order.number,
    clientNom: `${order.billing.first_name} ${order.billing.last_name}`.trim(),
    clientTelephone: order.billing.phone || "",
    clientAdresse: order.billing.address_1 || "",
    clientVille: order.billing.city || "",
    produits: order.line_items.map((li) => {
      const v = extraireVariantes(li);
      return {
        nom: li.name,
        quantite: li.quantity,
        total: li.total,
        couleur: v.couleur,
        taille: v.taille,
        options: v.options,
      };
    }),
    total: parseFloat(order.total || "0"),
    dateCommande: new Date(order.date_created),
  };
}
