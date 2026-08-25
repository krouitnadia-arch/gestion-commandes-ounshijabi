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
  fraisLivraison: number;
  statut: OrderStatus;
  saisiLivraison: boolean;
  senditCode: string | null;
  notes: string | null;
};

type District = {
  id: number;
  name: string;
  ville?: string;
  price?: string | number;
  delais?: string;
};

const listeNue = { listStyle: "none", margin: 0, padding: 0 } as const;
const petitBouton = { padding: "6px 12px", fontSize: 12 } as const;

const boutonEnvoi = {
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

const boutonMaj = {
  background: "#f59e0b",
  color: "white",
  border: "none",
  padding: "6px 10px",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 11,
  fontWeight: 700,
  whiteSpace: "nowrap",
  marginTop: 5,
} as const;

const boutonRenvoi = {
  background: "#b91c1c",
  color: "white",
  border: "none",
  padding: "6px 10px",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 11,
  fontWeight: 700,
  whiteSpace: "nowrap",
  marginTop: 5,
} as const;

const boutonTarif = {
  background: "#0369a1",
  color: "white",
  border: "none",
  padding: "4px 8px",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 10,
  fontWeight: 700,
  whiteSpace: "nowrap",
  marginTop: 4,
} as const;

const STATUTS: { [cle: string]: { fr: string; ar: string; fond: string; texte: string } } = {
  PENDING: { fr: "En attente", ar: "\u0641\u064A \u0627\u0644\u0627\u0646\u062A\u0638\u0627\u0631", fond: "#fef9c3", texte: "#854d0e" },
  PICKED_UP: { fr: "Ramasse", ar: "\u062A\u0645 \u0627\u0644\u0627\u0633\u062A\u0644\u0627\u0645", fond: "#dbeafe", texte: "#1e40af" },
  IN_TRANSIT: { fr: "En transit", ar: "\u0641\u064A \u0627\u0644\u0637\u0631\u064A\u0642", fond: "#dbeafe", texte: "#1e40af" },
  DELIVERING: { fr: "En livraison", ar: "\u0642\u064A\u062F \u0627\u0644\u062A\u0648\u0635\u064A\u0644", fond: "#e0e7ff", texte: "#3730a3" },
  DELIVERED: { fr: "Livre", ar: "\u062A\u0645 \u0627\u0644\u062A\u0633\u0644\u064A\u0645", fond: "#dcfce7", texte: "#166534" },
  RETURNED: { fr: "Retourne", ar: "\u0645\u064F\u0631\u062C\u0639", fond: "#fee2e2", texte: "#991b1b" },
  CANCELED: { fr: "Annule", ar: "\u0645\u0644\u063A\u0649", fond: "#fee2e2", texte: "#991b1b" },
  INCONNU: { fr: "Introuvable", ar: "\u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F", fond: "#fee2e2", texte: "#991b1b" },
};

function Variante(props: { valeur?: string; fond: string; texte: string }) {
  if (!props.valeur) return <span style={{ color: "#94a3b8" }}>-</span>;
  return (
    <span
      style={{
        display: "inline-block",
        background: props.fond,
        color: props.texte,
        padding: "3px 9px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      {props.valeur}
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
  const ar = lang === "ar";
  const L = (fr: string, arabe: string) => (ar ? arabe : fr);

  const [orders, setOrders] = useState<Order[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [statuts, setStatuts] = useState<{ [code: string]: string }>({});
  const [choix, setChoix] = useState<{ [id: string]: string }>({});
  const [zoneTexte, setZoneTexte] = useState<{ [id: string]: string }>({});
  const [fraisTexte, setFraisTexte] = useState<{ [id: string]: string }>({});
  const [loading, setLoading] = useState(true);
  const [suiviEnCours, setSuiviEnCours] = useState(false);
  const [action, setAction] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [filtreTexte, setFiltreTexte] = useState("");
  const [filtreColis, setFiltreColis] = useState("");
  const [filtreSuivi, setFiltreSuivi] = useState("");

  async function load() {
    const res: Response = await fetch("/api/orders");
    if (res.ok) {
      const all: Order[] = await res.json();
      setOrders(all.filter((o) => o.statut === "CONFIRMEE" || o.statut === "EXPEDIEE"));
    }
    setLoading(false);
  }

  async function chargerDistricts() {
    try {
      const res: Response = await fetch("/api/sendit");
      const data: any = await res.json();
      if (res.ok && Array.isArray(data.liste)) setDistricts(data.liste);
      else setMessage(data.error || "Zones Sendit indisponibles");
    } catch {
      setMessage("Zones Sendit indisponibles");
    }
  }

  async function chargerSuivi() {
    setSuiviEnCours(true);
    try {
      const res: Response = await fetch("/api/sendit/suivi");
      const data: any = await res.json();
      if (res.ok && data.statuts) setStatuts(data.statuts);
      if (res.ok && data.annulees && data.annulees.length > 0) {
        setMessage(L(`Commandes annulees : ${data.annulees.join(", ")}`, data.annulees.join(", ")));
        await load();
      }
    } catch {
      setStatuts({});
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
      const nouveaux: { [id: string]: string } = {};

      for (const o of orders) {
        if (suivant[o.id] === undefined) {
          const d = districtParDefaut(o.clientVille, districts);
          suivant[o.id] = d ? d.name : "";
          if (d) nouveaux[o.id] = String(d.id);
        }
      }

      if (Object.keys(nouveaux).length > 0) setChoix((c) => ({ ...nouveaux, ...c }));
      return suivant;
    });
  }, [districts, orders]);

  function choisirZone(orderId: string, valeur: string) {
    setZoneTexte((z) => ({ ...z, [orderId]: valeur }));
    const d = districts.find((x) => normaliser(x.name) === normaliser(valeur));
    setChoix((c) => ({ ...c, [orderId]: d ? String(d.id) : "" }));
  }

  function zoneChoisie(orderId: string) {
    const id = choix[orderId];
    if (!id) return null;
    return districts.find((d) => String(d.id) === id) || null;
  }

  async function modifier(order: Order, champ: string, valeur: string) {
    const corps: { [cle: string]: unknown } = {};
    corps[champ] =
      champ === "total" || champ === "fraisLivraison" ? Number(valeur) || 0 : valeur;

    await fetch(`/api/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corps),
    });

    setFraisTexte((f) => {
      const copie = { ...f };
      delete copie[order.id];
      return copie;
    });

    load();
  }

  async function utiliserTarifZone(order: Order) {
    const zone = zoneChoisie(order.id);
    if (!zone || zone.price === undefined || zone.price === null) return;
    await modifier(order, "fraisLivraison", String(zone.price));
  }

  async function envoyerSendit(order: Order, forcer: boolean) {
    const districtId = choix[order.id];
    if (!districtId) {
      setMessage(L("Zone de livraison non reconnue.", "\u0645\u0646\u0637\u0642\u0629 \u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641\u0629"));
      return;
    }

    if (forcer) {
      const ok = window.confirm(
        L("Creer un nouveau colis chez Sendit ?", "\u0625\u0646\u0634\u0627\u0621 \u0637\u0631\u062F \u062C\u062F\u064A\u062F \u061F")
      );
      if (!ok) return;
    }

    setAction(order.id);
    setMessage(null);

    try {
      const res: Response = await fetch("/api/sendit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id, districtId, forcer }),
      });
      const data: any = await res.json();

      if (res.ok) {
        setMessage(L(`Colis cree : ${data.code} - a encaisser ${data.montant}`, `${data.code}`));
        await load();
        chargerSuivi();
      } else {
        setMessage(data.error || "Erreur");
      }
    } catch (e: any) {
      setMessage(e?.message ?? "Erreur de connexion");
    } finally {
      setAction(null);
    }
  }

  async function majColis(order: Order) {
    const districtId = choix[order.id];
    if (!districtId) {
      setMessage(L("Zone de livraison non reconnue.", "\u0645\u0646\u0637\u0642\u0629 \u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641\u0629"));
      return;
    }

    setAction(order.id);
    setMessage(null);

    try {
      const res: Response = await fetch("/api/sendit", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id, districtId }),
      });
      const data: any = await res.json();

      if (res.ok) {
        setMessage(L(`Colis mis a jour - a encaisser ${data.montant}`, `${data.montant}`));
        await load();
        chargerSuivi();
      } else {
        setMessage(data.error || "Erreur");
      }
    } catch (e: any) {
      setMessage(e?.message ?? "Erreur de connexion");
    } finally {
      setAction(null);
    }
  }

  const ft = filtreTexte.toLowerCase().trim();

  const liste = orders.filter((o) => {
    if (filtreColis === "a-envoyer" && o.senditCode) return false;
    if (filtreColis === "envoyees" && !o.senditCode) return false;

    if (filtreSuivi) {
      const s = o.senditCode ? statuts[o.senditCode] : null;
      if (s !== filtreSuivi) return false;
    }

    if (!ft) return true;

    const texte = [
      o.numero,
      o.clientNom,
      o.clientTelephone,
      o.clientVille,
      o.clientAdresse,
      o.senditCode,
      ...(o.produits || []).map((p) => `${p.nom} ${p.couleur || ""} ${p.taille || ""}`),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return texte.includes(ft);
  });

  const aEnvoyer = orders.filter((o) => !o.senditCode).length;
  const envoyees = orders.filter((o) => o.senditCode).length;

  const statutsPresents = Array.from(
    new Set(
      orders.map((o) => (o.senditCode ? statuts[o.senditCode] : null)).filter(Boolean) as string[]
    )
  );

  return (
    <div>
      <div className="page-header">
        <h1>{t("expedition_title")}</h1>
        <button className="btn-primary" onClick={chargerSuivi} disabled={suiviEnCours}>
          {suiviEnCours ? L("Actualisation...", "\u062C\u0627\u0631\u064D") : L("Actualiser le suivi", "\u062A\u062D\u062F\u064A\u062B")}
        </button>
      </div>

      <datalist id="zones-sendit">
        {districts.map((d) => (
          <option key={d.id} value={d.name} />
        ))}
      </datalist>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        <input
          placeholder={L("Rechercher : numero, nom, telephone, code colis...", "\u0628\u062D\u062B")}
          value={filtreTexte}
          onChange={(e) => setFiltreTexte(e.target.value)}
          className="notes-input"
          style={{ width: 320 }}
        />
        <button
          type="button"
          className={filtreColis === "" ? "btn-primary" : "btn-secondary"}
          onClick={() => setFiltreColis("")}
          style={petitBouton}
        >
          {L("Toutes", "\u0627\u0644\u0643\u0644")} ({orders.length})
        </button>
        <button
          type="button"
          className={filtreColis === "a-envoyer" ? "btn-primary" : "btn-secondary"}
          onClick={() => setFiltreColis("a-envoyer")}
          style={petitBouton}
        >
          {L("A envoyer", "\u0644\u0644\u0625\u0631\u0633\u0627\u0644")} ({aEnvoyer})
        </button>
        <button
          type="button"
          className={filtreColis === "envoyees" ? "btn-primary" : "btn-secondary"}
          onClick={() => setFiltreColis("envoyees")}
          style={petitBouton}
        >
          {L("Envoyees", "\u0645\u0631\u0633\u0644\u0629")} ({envoyees})
        </button>
      </div>

      {statutsPresents.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          <button
            type="button"
            className={filtreSuivi === "" ? "btn-primary" : "btn-secondary"}
            onClick={() => setFiltreSuivi("")}
            style={petitBouton}
          >
            {L("Tous les suivis", "\u0643\u0644 \u0627\u0644\u062D\u0627\u0644\u0627\u062A")}
          </button>
          {statutsPresents.map((s) => {
            const info = STATUTS[s];
            const nb = orders.filter((o) => o.senditCode && statuts[o.senditCode] === s).length;
            return (
              <button
                key={s}
                type="button"
                className={filtreSuivi === s ? "btn-primary" : "btn-secondary"}
                onClick={() => setFiltreSuivi(s)}
                style={petitBouton}
              >
                {info ? L(info.fr, info.ar) : s} ({nb})
              </button>
            );
          })}
        </div>
      )}

      {message && <p className="sync-msg">{message}</p>}

      {loading ? (
        <p>...</p>
      ) : liste.length === 0 ? (
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
                <th>{L("Ville", "\u0627\u0644\u0645\u062F\u064A\u0646\u0629")}</th>
                <th>{t("col_products")}</th>
                <th>{L("Couleur", "\u0627\u0644\u0644\u0648\u0646")}</th>
                <th>{L("Taille", "\u0627\u0644\u0645\u0642\u0627\u0633")}</th>
                <th>{L("Total articles", "\u0645\u062C\u0645\u0648\u0639 \u0627\u0644\u0645\u0646\u062A\u062C\u0627\u062A")}</th>
                <th>{L("Frais livraison", "\u0631\u0633\u0648\u0645 \u0627\u0644\u062A\u0648\u0635\u064A\u0644")}</th>
                <th>{L("A encaisser", "\u0627\u0644\u0645\u0628\u0644\u063A")}</th>
                <th>{L("Note sur etiquette", "\u0645\u0644\u0627\u062D\u0638\u0629")}</th>
                <th>{L("Zone Sendit / Frais", "\u0627\u0644\u0645\u0646\u0637\u0642\u0629")}</th>
                <th>{L("Colis / Suivi", "\u0627\u0644\u0637\u0631\u062F")}</th>
              </tr>
            </thead>
            <tbody>
              {liste.map((o) => {
                const brut = o.senditCode ? statuts[o.senditCode] : null;
                const info = brut ? STATUTS[brut] : null;
                const occupe = action === o.id;
                const introuvable = brut === "INCONNU";
                const zone = zoneChoisie(o.id);

                const fraisAffiche =
                  fraisTexte[o.id] !== undefined ? fraisTexte[o.id] : String(o.fraisLivraison || 0);
                const aEncaisser = (o.total || 0) + (Number(fraisAffiche) || 0);

                return (
                  <tr key={o.id}>
                    <td>{o.numero}</td>
                    <td>
                      <input
                        defaultValue={o.clientNom}
                        onBlur={(e) => modifier(o, "clientNom", e.target.value)}
                        className="notes-input"
                        style={{ width: 130 }}
                      />
                    </td>
                    <td>
                      <input
                        defaultValue={o.clientTelephone}
                        onBlur={(e) => modifier(o, "clientTelephone", e.target.value)}
                        className="notes-input"
                        style={{ width: 120 }}
                      />
                    </td>
                    <td>
                      <input
                        defaultValue={o.clientAdresse || ""}
                        onBlur={(e) => modifier(o, "clientAdresse", e.target.value)}
                        className="notes-input"
                        style={{ width: 150 }}
                      />
                    </td>
                    <td>
                      <input
                        defaultValue={o.clientVille || ""}
                        onBlur={(e) => modifier(o, "clientVille", e.target.value)}
                        className="notes-input"
                        style={{ width: 105 }}
                      />
                    </td>
                    <td>
                      <ul style={listeNue}>
                        {o.produits?.map((p, i) => (
                          <li key={i} style={{ marginBottom: 6 }}>
                            {p.nom} x {p.quantite}
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td>
                      <ul style={listeNue}>
                        {o.produits?.map((p, i) => (
                          <li key={i} style={{ marginBottom: 6 }}>
                            <Variante valeur={p.couleur} fond="#e0e7ff" texte="#3730a3" />
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td>
                      <ul style={listeNue}>
                        {o.produits?.map((p, i) => (
                          <li key={i} style={{ marginBottom: 6 }}>
                            <Variante valeur={p.taille} fond="#fce7f3" texte="#9d174d" />
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td>
                      <input
                        type="number"
                        defaultValue={o.total}
                        onBlur={(e) => modifier(o, "total", e.target.value)}
                        className="notes-input"
                        style={{ width: 80, fontWeight: 700 }}
                      />
                    </td>
                    <td style={{ background: "#eff6ff" }}>
                      <input
                        type="number"
                        value={fraisAffiche}
                        onChange={(e) =>
                          setFraisTexte((f) => ({ ...f, [o.id]: e.target.value }))
                        }
                        onBlur={(e) => modifier(o, "fraisLivraison", e.target.value)}
                        className="notes-input"
                        style={{ width: 75, fontWeight: 700, color: "#0369a1" }}
                      />
                      {zone && zone.price !== undefined && (
                        <button type="button" style={boutonTarif} onClick={() => utiliserTarifZone(o)}>
                          {L(`Tarif Sendit ${zone.price}`, `${zone.price}`)}
                        </button>
                      )}
                    </td>
                    <td style={{ fontWeight: 700, color: "#166534" }}>{aEncaisser}</td>
                    <td>
                      <input
                        defaultValue={o.notes || ""}
                        onBlur={(e) => modifier(o, "notes", e.target.value)}
                        placeholder={L("Note pour le livreur", "\u0645\u0644\u0627\u062D\u0638\u0629")}
                        className="notes-input"
                        style={{ width: 150 }}
                      />
                    </td>
                    <td>
                      <input
                        list="zones-sendit"
                        value={zoneTexte[o.id] || ""}
                        onChange={(e) => choisirZone(o.id, e.target.value)}
                        placeholder={L("Tapez la ville", "\u0627\u0643\u062A\u0628 \u0627\u0644\u0645\u062F\u064A\u0646\u0629")}
                        className="notes-input"
                        style={{ width: 155 }}
                      />
                      {zone ? (
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#0369a1", marginTop: 4 }}>
                          {L("Frais Sendit", "\u0627\u0644\u0631\u0633\u0648\u0645")} : {zone.price ?? "-"}
                          {zone.delais ? ` | ${zone.delais}` : ""}
                        </div>
                      ) : (
                        <div style={{ fontSize: 10, color: "#b91c1c", marginTop: 3 }}>
                          {L("zone non reconnue", "\u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641\u0629")}
                        </div>
                      )}
                    </td>
                    <td>
                      {o.senditCode ? (
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 12 }}>{o.senditCode}</div>
                          {brut && (
                            <div style={{ marginTop: 4 }}>
                              <Variante
                                valeur={info ? L(info.fr, info.ar) : brut}
                                fond={info ? info.fond : "#e2e8f0"}
                                texte={info ? info.texte : "#475569"}
                              />
                            </div>
                          )}
                          {!introuvable && (
                            <button
                              type="button"
                              style={boutonMaj}
                              onClick={() => majColis(o)}
                              disabled={occupe}
                            >
                              {occupe ? "..." : L("Mettre a jour", "\u062A\u062D\u062F\u064A\u062B")}
                            </button>
                          )}
                          <button
                            type="button"
                            style={boutonRenvoi}
                            onClick={() => envoyerSendit(o, true)}
                            disabled={occupe}
                          >
                            {occupe ? "..." : L("Renvoyer a Sendit", "\u0625\u0639\u0627\u062F\u0629")}
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          style={boutonEnvoi}
                          onClick={() => envoyerSendit(o, false)}
                          disabled={occupe}
                        >
                          {occupe ? L("Envoi...", "\u062C\u0627\u0631\u064D") : L("Envoyer a Sendit", "\u0625\u0631\u0633\u0627\u0644")}
                        </button>
                      )}
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
