"use client";

import { useEffect, useState } from "react";
import { useLang } from "./LangProvider";
import StatusBadge from "./StatusBadge";
import { STATUS_CONFIG, STATUS_LIST, OrderStatus } from "@/lib/statusConfig";
import { toWhatsAppNumber } from "@/lib/whatsapp";

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
  dateCommande: string;
  statut: OrderStatus;
  appele: boolean;
  saisiLivraison: boolean;
  notes: string | null;
};

export default function OrdersClient() {
  const { t, lang } = useLang();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  async function loadOrders() {
    setLoading(true);
    const res = await fetch("/api/orders");
    if (res.ok) setOrders(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    loadOrders();
  }, []);

  async function handleSync() {
    setSyncing(true);
    setSyncMsg(null);
    const res = await fetch("/api/orders/sync", { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      setSyncMsg(
        lang === "ar"
          ? `تمت المزامنة: ${data.nouvelles} طلب جديد`
          : `Synchronisé : ${data.nouvelles} nouvelle(s) commande(s)`
      );
      await loadOrders();
    } else {
      setSyncMsg(data.error || "Erreur");
    }
    setSyncing(false);
  }

  async function handleCall(order: Order) {
    const number = toWhatsAppNumber(order.clientTelephone);
    // Marque la commande comme "appelée" avant d'ouvrir WhatsApp
    await fetch(`/api/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ marquerAppele: true }),
    });
    window.open(`https://wa.me/${number}`, "_blank");
    loadOrders();
  }

  async function handleStatusChange(order: Order, statut: OrderStatus) {
    await fetch(`/api/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statut }),
    });
    loadOrders();
  }

  async function handleNotesBlur(order: Order, notes: string) {
    if (notes === (order.notes || "")) return;
    await fetch(`/api/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
  }

  return (
    <div>
      <div className="page-header">
        <h1>{t("orders_title")}</h1>
        <button className="btn-primary" onClick={handleSync} disabled={syncing}>
          {syncing ? t("orders_syncing") : t("orders_sync")}
        </button>
      </div>
      {syncMsg && <p className="sync-msg">{syncMsg}</p>}

      {loading ? (
        <p>…</p>
      ) : orders.length === 0 ? (
        <p className="empty">{t("orders_empty")}</p>
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
                <th>{t("col_date")}</th>
                <th>{t("col_status")}</th>
                <th>{t("col_notes")}</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} style={{ backgroundColor: STATUS_CONFIG[o.statut].bg + "55" }}>
                  <td>{o.numero}</td>
                  <td>{o.clientNom}</td>
                  <td>
                    <button className="phone-btn" onClick={() => handleCall(o)} type="button">
                      {o.clientTelephone} · {t("call_button")}
                    </button>
                  </td>
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
                  <td>{new Date(o.dateCommande).toLocaleDateString(lang === "ar" ? "ar" : "fr-FR")}</td>
                  <td>
                    <StatusBadge statut={o.statut} />
                    <select
                      value={o.statut}
                      onChange={(e) => handleStatusChange(o, e.target.value as OrderStatus)}
                      aria-label={t("status_change")}
                    >
                      {STATUS_LIST.map((s) => (
                        <option key={s} value={s}>
                          {lang === "ar" ? STATUS_CONFIG[s].labelAr : STATUS_CONFIG[s].labelFr}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      defaultValue={o.notes || ""}
                      onBlur={(e) => handleNotesBlur(o, e.target.value)}
                      className="notes-input"
                    />
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
