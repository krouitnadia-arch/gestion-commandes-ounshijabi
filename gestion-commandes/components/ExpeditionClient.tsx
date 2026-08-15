"use client";

import { useEffect, useState } from "react";
import { useLang } from "./LangProvider";
import StatusBadge from "./StatusBadge";
import { OrderStatus } from "@/lib/statusConfig";

type Produit = { nom: string; quantite: number; total: string };

type Order = {
  id: string;
  numero: string;
  clientNom: string;
  clientTelephone: string;
  clientAdresse: string | null;
  clientVille: string | null;
  produits: Produit[];
  total: number;
  statut: OrderStatus;
  saisiLivraison: boolean;
};

export default function ExpeditionClient() {
  const { t, lang } = useLang();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/orders");
    if (res.ok) {
      const all: Order[] = await res.json();
      setOrders(all.filter((o) => o.statut === "CONFIRMEE"));
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleLivraison(order: Order) {
    await fetch(`/api/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ saisiLivraison: !order.saisiLivraison }),
    });
    load();
  }

  return (
    <div>
      <div className="page-header">
        <h1>{t("expedition_title")}</h1>
      </div>

      {loading ? (
        <p>…</p>
      ) : orders.length === 0 ? (
        <p className="empty">{t("expedition_empty")}</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t("col_number")}</th>
                <th>{t("col_client")}</th>
                <th>{t("col_phone")}</th>
                <th>{t("col_address")}</th>
                <th>{t("col_products")}</th>
                <th>{t("col_total")}</th>
                <th>{t("col_status")}</th>
                <th>{t("col_delivery_status")}</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>{o.numero}</td>
                  <td>{o.clientNom}</td>
                  <td>{o.clientTelephone}</td>
                  <td>
                    {o.clientAdresse}
                    {o.clientVille ? `, ${o.clientVille}` : ""}
                  </td>
                  <td>
                    <ul className="products-list">
                      {o.produits?.map((p, i) => (
                        <li key={i}>
                          {p.nom} × {p.quantite}
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td>{o.total}</td>
                  <td>
                    <StatusBadge statut={o.statut} />
                  </td>
                  <td>
                    <button
                      className={o.saisiLivraison ? "toggle-yes" : "toggle-no"}
                      onClick={() => toggleLivraison(o)}
                      type="button"
                    >
                      {o.saisiLivraison ? t("delivery_yes") : t("delivery_no")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
