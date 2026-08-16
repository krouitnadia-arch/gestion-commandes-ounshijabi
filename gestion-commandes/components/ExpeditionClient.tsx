"use client";

import { useEffect, useState } from "react";
import { useLang } from "./LangProvider";
import { OrderStatus } from "@/lib/statusConfig";

type Produit = {
  nom: string;
  quantite: number;
  total: string;
  couleur?: string;
  taille?: string;
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
  senditCode: string | null;
};

type District = { id: number; name: string };

const listeNue = { listStyle: "none", margin: 0, padding: 0 } as const;

const boutonSendit = {
  background: "#4b508f",
  color: "white",
  border: "none",
  padding: "8px 12px",
  borderRadius: 8,
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 700,
  whiteSpace: "nowrap",
} as const;

// Traduction des statuts renvoyes par Sendit
const STATUTS: Record<string, { fr: string; ar: string; fond: string; texte: string }> = {
  PENDING: { fr: "En attente", ar: "في الانتظار", fond: "#fef9c3", texte: "#854d0e" },
  PICKED_UP: { fr: "Ramasse", ar: "تم الاستلام", fond: "#dbeafe", texte: "#1e40af" },
  IN_TRANSIT: { fr: "En transit", ar: "في الطريق", fond: "#dbeafe", texte: "#1e40af" },
  DELIVERING: { fr: "En livraison", ar: "قيد التوصيل", fond: "#e0e7ff", texte: "#3730a3" },
  DELIVERED: { fr: "Livre", ar: "تم التسليم", fond: "#dcfce7", texte: "#166534" },
  RETURNED: { fr: "Retourne", ar: "مُرجع", fond: "#fee2e2", texte: "#991b1b" },
  CANCELED: { fr: "Annule", ar: "ملغى", fond: "#fee2e2", texte: "#991b1b" },
  REFUSED: { fr: "Refuse", ar: "مرفوض", fond: "#fee2e2", texte: "#991b1b" },
};

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

function normaliser(texte: string) {
  return (texte || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function districtParDefaut(ville: string | null, districts: District[]) {
  const v = normaliser(ville || "");
  if (!v) return null;
  return (
    districts.find((d) => normaliser(d.name) === v) ||
    districts.find((d) => normaliser(d.name).startsWith(v)) ||
    null
  );
}

export default function ExpeditionClient() {
  const { t, lang } = useLang();
  const L = (fr: string, ar: string) => (lang === "ar" ? ar : fr);

  const [orders, setOrders] = useState<Order[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [statuts, setStatuts] = useState<Record<string, string>>({});
  const [choix, setChoix] = useState<Record<string, string>>({});
  const [zoneTexte, setZoneTexte] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [suiviEnCours, setSuiviEnCours] = useState(false);
  const [envoi, setEnvoi] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [copie, setCopie] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/orders");
    if (res.ok) {
      const all: Order[] = await res.json();
      setOrders(all.filter((o) => o.statut === "CONFIRMEE"));
    }
    setLoading(false);
  }

  async function chargerDistricts() {
    try {
      const res = await fetch("/api/sendit");
      const data = await res.json();
      if (res.ok && Array.isArray(data.liste)) setDistricts(data.liste);
      else setMessage(data.error || "Zones Sendit indisponibles");
    } catch {
      setMessage("Zones Sendit indisponibles");
    }
  }

  async function chargerSuivi() {
    setSuiviEnCours(true);
    try {
      const res = await fetch("/api/sendit/suivi");
      const data = await res.json();
      if (res.ok && data.statuts) setStatuts(data.statuts);
    } catch {
      // suivi indisponible : on n'affiche rien de plus
    } finally {
      setSuiviEnCours(false);
    }
  }

  useEffect(() => {
    load();
    chargerDistricts();
    chargerSuivi();
  }, []);

  useEffect(() => {
    if (districts.length === 0 || orders.length === 0) return;

    setZoneTexte((actuel) => {
      const suivant = { ...actuel };
      const nouveauxChoix: Record<string, string> = {};

      for (const o of orders) {
        if (suivant[o.id] === undefined) {
          const d = districtParDefaut(o.clientVille, districts);
          suivant[o.id] = d ? d.name : "";
          if (d) nouveauxChoix[o.id] = String(d.id);
        }
      }

      if (Object.keys(nouveauxChoix).length > 0) {
        setChoix((c) => ({ ...nouveauxChoix, ...c }));
      }
      return suivant;
    });
  }, [districts, orders]);

  function choisirZone(orderId: string, valeur: string) {
    setZoneTexte((z) => ({ ...z, [orderId]: valeur }));
    const d = districts.find((x) => normaliser(x.name) === normaliser(valeur));
    setChoix((c) => ({ ...c, [orderId]: d ? String(d.id) : "" }));
  }

  async function majTotal(order: Order, valeur: string) {
    const total = Number(valeur);
    if (Number.isNaN(total) || total === order.total) return;

    await fetch(`/api/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ total }),
    });
    load();
  }

  async function toggleLivraison(order: Order) {
    await fetch(`/api/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ saisiLivraison: !order.saisiLivraison }),
    });
    load();
  }

  async function envoyerSendit(order: Order) {
    const districtId = choix[order.id];
    if (!districtId) {
      setMessage(L("Zone de livraison non reconnue.", "منطقة التوصيل غير معروفة."));
      return;
    }

    setEnvoi(order.id);
    setMessage(null);

    try {
      const res = await fetch("/api/sendit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id, districtId }),
      });
      const data = await res.json();

      if (res.ok) {
        setMessage(L(`Colis cree : ${data.code}`, `تم إنشاء الطرد: ${data.code}`));
        await load();
        chargerSuivi();
      } else {
        setMessage(data.error || "Erreur");
      }
    } catch (e: any) {
      setMessage(e?.message ?? "Erreur de connexion");
    } finally {
      setEnvoi(null);
    }
  }

  function texteColis(order: Order) {
    const articles = (order.produits || []).map((p) => {
      const details = [p.couleur, p.taille].filter(Boolean).join(" / ");
      return `- ${p.nom}${details ? ` (${details})` : ""} x${p.quantite}`;
    });

    return [
      order.clientNom,
      order.clientTelephone,
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

  const enAttente = orders.filter((o) => !o.senditCode).length;

  return (
    <div>
      <div className="page-header">
        <h1>{t("expedition_title")}</h1>
        <button className="btn-primary" onClick={chargerSuivi} disabled={suiviEnCours}>
          {suiviEnCours
            ? L("Actualisation…", "جارٍ التحديث…")
            : L("Actualiser le suivi", "تحديث التتبع")}
        </button>
      </div>

      <datalist id="zones-sendit">
        {districts.map((d) => (
          <option key={d.id} value={d.name} />
        ))}
      </datalist>

      {!loading && orders.length > 0 && (
        <p className="sync-msg">
          {L(
            `${enAttente} commande(s) restant a envoyer a Sendit`,
            `${enAttente} طلب في انتظار الإرسال إلى سونديت`
          )}
          {districts.length > 0 ? ` — ${districts.length} zones Sendit` : ""}
        </p>
      )}
      {message && <p className="sync-msg">{message}</p>}

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
                <th>{L("Zone Sendit", "منطقة سونديت")}</th>
                <th>{L("Colis / Suivi", "الطرد / التتبع")}</th>
                <th>{t("col_delivery_status")}</th>
                <th>{t("col_actions")}</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const brut = o.senditCode ? statuts[o.senditCode] : null;
                const info = brut ? STATUTS[brut] : null;

                return (
                  <tr key={o.id} style={{ opacity: o.senditCode ? 0.75 : 1 }}>
                    <td>{o.numero}</td>
                    <td>
                      {o.wooId < 0 ? (
                        <Variante valeur="Instagram" couleurFond="#fae8ff" couleurTexte="#86198f" />
                      ) : (
                        <Variante
                          valeur={L("Site web", "الموقع")}
                          couleurFond="#dbeafe"
                          couleurTexte="#1e40af"
                        />
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
                    <td>
                      <input
                        type="number"
                        defaultValue={o.total}
                        onBlur={(e) => majTotal(o, e.target.value)}
                        disabled={!!o.senditCode}
                        className="notes-input"
                        style={{ width: 85, fontWeight: 700 }}
                      />
                    </td>
                    <td>
                      <input
                        list="zones-sendit"
                        value={zoneTexte[o.id] || ""}
                        onChange={(e) => choisirZone(o.id, e.target.value)}
                        placeholder={L("Tapez la ville…", "اكتب المدينة…")}
                        disabled={!!o.senditCode}
                        className="notes-input"
                        style={{ width: 175 }}
                      />
                      {!o.senditCode && !choix[o.id] && (
                        <div style={{ fontSize: 10, color: "#b91c1c", marginTop: 3 }}>
                          {L("zone non reconnue", "منطقة غير معروفة")}
                        </div>
                      )}
                    </td>
                    <td>
                      {o.senditCode ? (
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 4 }}>
                            {o.senditCode}
                          </div>
                          {brut && (
                            <Variante
                              valeur={info ? L(info.fr, info.ar) : brut}
                              couleurFond={info ? info.fond : "#e2e8f0"}
                              couleurTexte={info ? info.texte : "#475569"}
                            />
                          )}
                        </div>
                      ) : (
                        <button
                          type="button"
                          style={boutonSendit}
                          onClick={() => envoyerSendit(o)}
                          disabled={envoi === o.id}
                        >
                          {envoi === o.id
                            ? L("Envoi…", "جارٍ الإرسال…")
                            : L("Envoyer a Sendit", "إرسال إلى سونديت")}
                        </button>
                      )}
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
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
