"use client";

import { useEffect, useRef, useState, FormEvent } from "react";
import { useLang } from "./LangProvider";
import StatusBadge from "./StatusBadge";
import { STATUS_CONFIG, STATUS_LIST, OrderStatus } from "@/lib/statusConfig";
import { toWhatsAppNumber } from "@/lib/whatsapp";
import { messageConfirmation } from "@/lib/messageWhatsapp";

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
  dateCommande: string;
  statut: OrderStatus;
  appele: boolean;
  saisiLivraison: boolean;
  notes: string | null;
};

const INTERVALLE_MS = 120000;

const FORMULAIRE_VIDE = {
  clientNom: "",
  clientTelephone: "",
  clientVille: "",
  clientAdresse: "",
  produit: "",
  couleur: "",
  taille: "",
  quantite: "1",
  total: "",
};

const listeNue = { listStyle: "none", margin: 0, padding: 0 } as const;

const boutonConfirmer = {
  background: "#25D366",
  color: "white",
  border: "none",
  padding: "8px 14px",
  borderRadius: 8,
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 700,
  whiteSpace: "nowrap",
} as const;

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

export default function OrdersClient() {
  const { t, lang } = useLang();
  const L = (fr: string, ar: string) => (lang === "ar" ? ar : fr);

  const [onglet, setOnglet] = useState<"web" | "instagram">("web");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [derniereSync, setDerniereSync] = useState<Date | null>(null);
  const [form, setForm] = useState(FORMULAIRE_VIDE);
  const [formErreur, setFormErreur] = useState<string | null>(null);
  const enCours = useRef(false);

  async function loadOrders() {
    const res = await fetch("/api/orders");
    if (res.ok) setOrders(await res.json());
    setLoading(false);
  }

  async function synchroniser(silencieux: boolean) {
    if (enCours.current) return;
    enCours.current = true;
    if (!silencieux) setSyncing(true);

    try {
      const res = await fetch("/api/orders/sync", { method: "POST" });
      const data = await res.json();

      if (res.ok) {
        setDerniereSync(new Date());
        if (!silencieux || data.nouvelles > 0) {
          setSyncMsg(
            L(
              `Synchronise : ${data.nouvelles} nouvelle(s) commande(s)`,
              `تمت المزامنة: ${data.nouvelles} طلب جديد`
            )
          );
        }
        await loadOrders();
      } else {
        setSyncMsg(data.error || "Erreur");
      }
    } catch (e: any) {
      setSyncMsg(e?.message ?? "Erreur de connexion");
    } finally {
      enCours.current = false;
      setSyncing(false);
    }
  }

  useEffect(() => {
    loadOrders();
    synchroniser(true);

    const minuteur = setInterval(() => {
      if (document.visibilityState === "visible") synchroniser(true);
    }, INTERVALLE_MS);

    return () => clearInterval(minuteur);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function marquerAppele(order: Order) {
    await fetch(`/api/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ marquerAppele: true }),
    });
  }

  async function envoyerConfirmation(order: Order) {
    const numero = toWhatsAppNumber(order.clientTelephone);
    const texte = encodeURIComponent(messageConfirmation(order));
    await marquerAppele(order);
    window.open(`https://wa.me/${numero}?text=${texte}`, "_blank");
    loadOrders();
  }

  async function handleCall(order: Order) {
    const numero = toWhatsAppNumber(order.clientTelephone);
    await marquerAppele(order);
    window.open(`https://wa.me/${numero}`, "_blank");
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

  async function ajouterCommande(e: FormEvent) {
    e.preventDefault();
    setFormErreur(null);

    const res = await fetch("/api/orders/manuel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      setForm(FORMULAIRE_VIDE);
      loadOrders();
    } else {
      const data = await res.json();
      setFormErreur(data.error || "Erreur");
    }
  }

  async function supprimerCommande(order: Order) {
    await fetch(`/api/orders/manuel?id=${order.id}`, { method: "DELETE" });
    loadOrders();
  }

  const commandesWeb = orders.filter((o) => o.wooId > 0);
  const commandesInstagram = orders.filter((o) => o.wooId < 0);
  const liste = onglet === "web" ? commandesWeb : commandesInstagram;

  return (
    <div>
      <div className="page-header">
        <h1>{t("orders_title")}</h1>
        {onglet === "web" && (
          <button className="btn-primary" onClick={() => synchroniser(false)} disabled={syncing}>
            {syncing ? t("orders_syncing") : t("orders_sync")}
          </button>
        )}
      </div>

      <div className="lang-switcher" style={{ marginBottom: 16 }}>
        <button
          type="button"
          className={onglet === "web" ? "active" : ""}
          onClick={() => setOnglet("web")}
          style={{ padding: "8px 16px", fontSize: 14 }}
        >
          {L("Commandes site web", "طلبات الموقع")} ({commandesWeb.length})
        </button>
        <button
          type="button"
          className={onglet === "instagram" ? "active" : ""}
          onClick={() => setOnglet("instagram")}
          style={{ padding: "8px 16px", fontSize: 14 }}
        >
          {L("Commandes Instagram", "طلبات إنستغرام")} ({commandesInstagram.length})
        </button>
      </div>

      {onglet === "web" && (
        <>
          <p className="sync-msg">
            {L("Synchronisation automatique activee", "المزامنة التلقائية مفعلة")}
            {derniereSync
              ? ` — ${L("derniere mise a jour", "اخر تحديث")} ${derniereSync.toLocaleTimeString(
                  lang === "ar" ? "ar" : "fr-FR"
                )}`
              : ""}
          </p>
          {syncMsg && <p className="sync-msg">{syncMsg}</p>}
        </>
      )}

      {onglet === "instagram" && (
        <>
          <form onSubmit={ajouterCommande} className="stock-form">
            <input
              placeholder={L("Nom du client *", "اسم الزبون *")}
              value={form.clientNom}
              onChange={(e) => setForm({ ...form, clientNom: e.target.value })}
              required
            />
            <input
              placeholder={L("Telephone *", "الهاتف *")}
              value={form.clientTelephone}
              onChange={(e) => setForm({ ...form, clientTelephone: e.target.value })}
              required
            />
            <input
              placeholder={L("Ville", "المدينة")}
              value={form.clientVille}
              onChange={(e) => setForm({ ...form, clientVille: e.target.value })}
            />
            <input
              placeholder={L("Adresse", "العنوان")}
              value={form.clientAdresse}
              onChange={(e) => setForm({ ...form, clientAdresse: e.target.value })}
            />
            <input
              placeholder={L("Produit", "المنتج")}
              value={form.produit}
              onChange={(e) => setForm({ ...form, produit: e.target.value })}
            />
            <input
              placeholder={L("Couleur", "اللون")}
              value={form.couleur}
              onChange={(e) => setForm({ ...form, couleur: e.target.value })}
            />
            <input
              placeholder={L("Taille", "المقاس")}
              value={form.taille}
              onChange={(e) => setForm({ ...form, taille: e.target.value })}
            />
            <input
              type="number"
              placeholder={L("Quantite", "الكمية")}
              value={form.quantite}
              onChange={(e) => setForm({ ...form, quantite: e.target.value })}
            />
            <input
              type="number"
              placeholder={L("Total", "المجموع")}
              value={form.total}
              onChange={(e) => setForm({ ...form, total: e.target.value })}
            />
            <button type="submit" className="btn-primary">
              {L("Ajouter la commande", "إضافة الطلب")}
            </button>
          </form>
          {formErreur && <p className="error">{formErreur}</p>}
        </>
      )}

      {loading ? (
        <p>…</p>
      ) : liste.length === 0 ? (
        <p className="empty">{t("orders_empty")}</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {onglet === "web" && <th>{L("Confirmation", "التأكيد")}</th>}
                <th>{t("col_number")}</th>
                <th>{t("col_client")}</th>
                <th>{t("col_phone")}</th>
                <th>{t("col_address")}</th>
                <th>{t("col_products")}</th>
                <th>{L("Couleur", "اللون")}</th>
                <th>{L("Taille", "المقاس")}</th>
                <th>{t("col_total")}</th>
                <th>{t("col_date")}</th>
                <th>{t("col_status")}</th>
                <th>{t("col_notes")}</th>
                {onglet === "instagram" && <th>{t("col_actions")}</th>}
              </tr>
            </thead>
            <tbody>
              {liste.map((o) => (
                <tr key={o.id} style={{ backgroundColor: STATUS_CONFIG[o.statut].bg + "55" }}>
                  {onglet === "web" && (
                    <td>
                      <button type="button" style={boutonConfirmer} onClick={() => envoyerConfirmation(o)}>
                        {L("Confirmer", "تأكيد")}
                      </button>
                    </td>
                  )}
                  <td>{o.numero}</td>
                  <td>{o.clientNom}</td>
                  <td>
                    <button className="phone-btn" onClick={() => handleCall(o)} type="button">
                      {o.clientTelephone}
                    </button>
                  </td>
                  <td>
                    {o.clientAdresse}
                    {o.clientVille ? `, ${o.clientVille}` : ""}
                  </td>
                  <td>
                    <ul style={listeNue}>
                      {o.produits?.map((p, i) => (
                        <li key={i} style={{ marginBottom: 6 }}>
                          {p.nom} × {p.quantite}
                          {p.options && p.options.length > 0 && (
                            <div style={{ fontSize: 11, color: "#64748b" }}>{p.options.join(" · ")}</div>
                          )}
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
                  {onglet === "instagram" && (
                    <td>
                      <button className="btn-link danger" onClick={() => supprimerCommande(o)} type="button">
                        {t("delete")}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
