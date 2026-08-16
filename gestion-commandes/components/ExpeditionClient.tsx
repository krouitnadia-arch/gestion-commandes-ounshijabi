"use client";

import { useEffect, useState } from "react";
import { useLang } from "./LangProvider";
import StatusBadge from "./StatusBadge";
import { OrderStatus } from "@/lib/statusConfig";

type Produit = {
  nom: string;
  quantite: number;
  total: string;
  couleur?: string;
  taille?: string;
  options?: string[];
};

type Order = {
  id: string;
  wooId: number;
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

const listeNue = { listStyle: "none", margin: 0, padding: 0 } as const;

function Variante({
  valeur,
  couleurFond,
  couleurTexte,
}: {
  valeur?: string;
  couleurFond: string;
  couleurTexte: string;
}) {
  if (!valeur) return <span style={{ color: "#94a3b8" }}>—</span>;
  return (
    <span
      style={{
        display: "inline-block",
        background: couleurFond,
        color: couleurTexte,
        padding: "3px 9px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      {valeur}
    </span>
  );
}

export default function ExpeditionClient() {
  const { t, lang } = useLang();
  const L = (fr: string, ar: string) => (lang === "ar" ? ar : fr);

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [copie, setCopie] = useState<string | null>(null);

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

  function texteColis(order: Order) {
    const articles = (order.produits || []).map((p) => {
      const details = [p.couleur, p.taille].filter(Boolean).join(" / ");
      const suffixe = details ? ` (${details})` : "";
      return `- ${p.nom}${suffixe} x${p.quantite}`;
    });

    return [
      `${order.clientNom}`,
      `${order.clientTelephone}`,
      `${order.clientAdresse || ""}${order.clientVille ? `, ${order.clientVille}` : ""}`,
      "",
      ...articles,
      "",
      `Total : ${order.total}`,
      `Commande : ${order.numero}`,
    ].join("\n");
  }

  async function copier(order: Order) {
    try {
      await navigator.clipboard.writeText(texteColis(order));
      setCopie(order.id);
      setTimeout(() => setCopie(null), 2000);
    } catch {
      setCopie(null);
    }
  }

  const enAttente = orders.filter((o) => !o.saisiLivraison).length;

  return (
    <div>
      <div className="page-header">
        <h1>{t("expedition_title")}</h1>
      </div>

      {!loading && orders.length > 0 && (
        <p className="sync-msg">
          {L(
            `${enAttente} commande(s) restant a saisir sur Sendit`,
            `${enAttente} طلب/طلبات في انتظار الإدخال في سونديت`
          )}
        </p>
      )}

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
                <th>{L("Origine", "المصدر")}</th>
                <th>{t("col_client")}</th>
                <th>{t("col_phone")}</th>
                <th>{t("col_address")}</th>
                <th>{t("col_products")}</th>
                <th>{L("Couleur", "اللون")}</th>
                <th>{L("Taille", "المقاس")}</th>
                <th>{t("col_total")}</th>
                <th>{t("col_status")}</th>
                <th>{t("col_delivery_status")}</th>
                <th>{t("col_actions")}</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} style={{ opacity: o.saisiLivraison ? 0.55 : 1 }}>
                  <td>{o.numero}</td>
                  <td>
                    {o.wooId < 0 ? (
                      <Variante valeur="Instagram" couleurFond="#fae8ff" couleurTexte="#86198f" />
                    ) : (
                      <Variante valeur={L("Site web", "الموقع")} couleurFond="#dbeafe" couleurTexte="#1e40af" />
                    )}
                  </td>
                  <td>{o.clientNom}</td>
                  <td>{o.clientTelephone}</td>
                  <td>
                    {o.clientAdresse}
                    {o.clientVille ? `, ${o.clientVille}` : ""}
                  </td>
                  <td>
                    <ul style={listeNue}>
                      {o.produits?.map((p, i) => (
                        <li key={i} style={{ marginBottom: 6 }}>
                          {p.nom} × {p.quantite}
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td>
                    <ul style={listeNue}>
                      {o.produits?.map((p, i) => (
                        <li key={i} style={{ marginBottom: 6 }}>
                          <Variante valeur={p.couleur} couleurFond="#e0e7ff" couleurTexte="#3730a3" />
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td>
                    <ul style={listeNue}>
                      {o.produits?.map((p, i) => (
                        <li key={i} style={{ marginBottom: 6 }}>
                          <Variante valeur={p.taille} couleurFond="#fce7f3" couleurTexte="#9d174d" />
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
                  <td>
                    <button className="btn-link" onClick={() => copier(o)} type="button">
                      {copie === o.id ? L("Copie !", "تم النسخ!") : L("Copier", "نسخ")}
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
