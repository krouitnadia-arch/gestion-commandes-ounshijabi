// Récupération des commandes depuis le site WooCommerce (ounshijabi.com)
// Documentation officielle : https://developer.woocommerce.com/docs/apis/rest-api/

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
  line_items: { name: string; quantity: number; total: string }[];
};

function getCredentials() {
  const url = process.env.WOOCOMMERCE_URL;
  const key = process.env.WOOCOMMERCE_CONSUMER_KEY;
  const secret = process.env.WOOCOMMERCE_CONSUMER_SECRET;
  if (!url || !key || !secret) {
    throw new Error(
      "Variables WOOCOMMERCE_URL / WOOCOMMERCE_CONSUMER_KEY / WOOCOMMERCE_CONSUMER_SECRET manquantes"
    );
  }
  return { url: url.replace(/\/$/, ""), key, secret };
}

// Récupère les commandes récentes depuis WooCommerce.
// Par défaut on récupère toutes les commandes non-brouillon des 30 derniers jours,
// triées par date décroissante. Ajustez `status` si besoin (ex: "processing,on-hold").
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

export function wooOrderToLocal(order: WooOrder) {
  return {
    wooId: order.id,
    numero: order.number,
    clientNom: `${order.billing.first_name} ${order.billing.last_name}`.trim(),
    clientTelephone: order.billing.phone || "",
    clientAdresse: order.billing.address_1 || "",
    clientVille: order.billing.city || "",
    produits: order.line_items.map((li) => ({
      nom: li.name,
      quantite: li.quantity,
      total: li.total,
    })),
    total: parseFloat(order.total || "0"),
    dateCommande: new Date(order.date_created),
  };
}

