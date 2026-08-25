"use client";

import { useEffect, useRef, useState, FormEvent, Fragment } from "react";
import { useLang } from "./LangProvider";
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

type ArticleStock = {
  id: string;
  nom: string;
  couleur: string | null;
  taille: string | null;
  quantite: number;
  quantiteMagasin: number;
  prix: number | null;
  wooId: number | null;
};

type Ligne = {
  productId: string;
  nom: string;
  couleur: string | null;
  taille: string | null;
  quantite: number;
  montant: number;
};

type Groupe = { commandes: Order[]; date: number };

const INTERVALLE_MS = 120000;
const FENETRE_MS = 24 * 60 * 60 * 1000;

const listeNue = { listStyle: "none", margin: 0, padding: 0 } as const;
const petitBouton = { padding: "6px 12px", fontSize: 12 } as const;

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

const boutonFusion = {
  background: "#f59e0b",
  color: "white",
  border: "none",
  padding: "6px 10px",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 11,
  fontWeight: 700,
  whiteSpace: "nowrap",
  marginBottom: 4,
} as const;

const boutonAjout = {
  background: "#0369a1",
  color: "white",
  border: "none",
  padding: "5px 9px",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 11,
  fontWeight: 700,
  whiteSpace: "nowrap",
  marginTop: 4,
} as const;

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

function normaliserTelephone(tel: string) {
  const chiffres = (tel || "").replace(/\D/g, "");
  return chiffres.slice(-9);
}

function grouper(liste: Order[]): Groupe[] {
  const parTelephone = new Map<string, Order[]>();

  for (const o of liste) {
    const cle = normaliserTelephone(o.clientTelephone) || o.id;
    if (!parTelephone.has(cle)) parTelephone.set(cle, []);
    parTelephone.get(cle)!.push(o);
  }

  const groupes: Groupe[] = [];

  parTelephone.forEach((commandes) => {
    const triees = [...commandes].sort(
      (a, b) => new Date(b.dateCommande).getTime() - new Date(a.dateCommande).getTime()
    );

    let courant: Order[] = [];
    for (const o of triees) {
      if (courant.length === 0) {
        courant = [o];
        continue;
      }
      const precedent = courant[courant.length - 1];
      const ecart =
        new Date(precedent.dateCommande).getTime() - new Date(o.dateCommande).getTime();

      if (ecart <= FENETRE_MS) courant.push(o);
      else {
        groupes.push({ commandes: courant, date: new Date(courant[0].dateCommande).getTime() });
        courant = [o];
      }
    }
    if (courant.length > 0) {
      groupes.push({ commandes: courant, date: new Date(courant[0].dateCommande).getTime() });
    }
  });

  groupes.sort((a, b) => b.date - a.date);
  return groupes;
}

export default function OrdersClient() {
  const { t, lang } = useLang();
  const ar = lang === "ar";
  const L = (fr: string, arabe: string) => (ar ? arabe : fr);

  const [onglet, setOnglet] = useState<"web" | "instagram">("web");
  const [orders, setOrders] = useState<Order[]>([]);
  const [articles, setArticles] = useState<ArticleStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [derniereSync, setDerniereSync] = useState<Date | null>(null);

  const [filtreTexte, setFiltreTexte] = useState("");
  const [filtreStatut, setFiltreStatut] = useState("");
  const [filtrePeriode, setFiltrePeriode] = useState("");

  const [ajoutPour, setAjoutPour] = useState<string | null>(null);
  const [rechercheAjout, setRechercheAjout] = useState("");

  const [clientNom, setClientNom] = useState("");
  const [clientTelephone, setClientTelephone] = useState("");
  const [clientVille, setClientVille] = useState("");
  const [clientAdresse, setClientAdresse] = useState("");
  const [recherche, setRecherche] = useState("");
  const [panier, setPanier] = useState<Ligne[]>([]);

  const enCours = useRef(false);

  async function loadOrders() {
    const res: Response = await fetch("/api/orders");
    if (res.ok) setOrders(await res.json());
    setLoading(false);
  }

  async function loadArticles() {
    const res: Response = await fetch("/api/stock");
    if (res.ok) setArticles(await res.json());
  }

  async function synchroniser(silencieux: boolean) {
    if (enCours.current) return;
    enCours.current = true;
    if (!silencieux) setSyncing(true);

    try {
      const res: Response = await fetch("/api/orders/sync", { method: "POST" });
      const data: any = await res.json();

      if (res.ok) {
        setDerniereSync(new Date());
        if (!silencieux || data.nouvelles > 0 || data.annulees > 0) {
          setMessage(
            L(
              `${data.nouvelles} nouvelle(s), ${data.annulees || 0} annul\u00E9e(s)`,
              `${data.nouvelles} / ${data.annulees || 0}`
            )
          );
        }
        await loadOrders();
      } else {
        setMessage(data.error || "Erreur");
      }
    } catch (e: any) {
      setMessage(e?.message ?? "Erreur de connexion");
    } finally {
      enCours.current = false;
      setSyncing(false);
    }
  }

  useEffect(() => {
    loadOrders();
    loadArticles();
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
    const res: Response = await fetch(`/api/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statut }),
    });

    const data: any = await res.json();
    if (data?.avertissement) setMessage(data.avertissement);

    loadOrders();
    loadArticles();
  }

  async function handleNotesBlur(order: Order, notes: string) {
    if (notes === (order.notes || "")) return;
    await fetch(`/api/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
  }

  async function ajouterArticleCommande(order: Order, a: ArticleStock) {
    const res: Response = await fetch("/api/orders/lignes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: order.id, productId: a.id, quantite: 1 }),
    });

    const data: any = await res.json();

    if (res.ok) {
      setMessage(L(`${a.nom} ajout\u00E9 \u00E0 la commande ${order.numero}`, a.nom));
      if (data?.avertissements?.length > 0) setMessage(data.avertissements.join(" | "));
      setRechercheAjout("");
      setAjoutPour(null);
      loadOrders();
      loadArticles();
    } else {
      setMessage(data?.error || "Erreur");
    }
  }

  async function retirerArticleCommande(order: Order, index: number) {
    const ok = window.confirm(
      L("Retirer cet article de la commande ? Il reviendra au stock.", "\u062D\u0630\u0641 \u061F")
    );
    if (!ok) return;

    await fetch(`/api/orders/lignes?orderId=${order.id}&index=${index}`, { method: "DELETE" });
    loadOrders();
    loadArticles();
  }

  function ajouterAuPanier(a: ArticleStock) {
    const existe = panier.find((l) => l.productId === a.id);

    if (existe) {
      setPanier(
        panier.map((l) =>
          l.productId === a.id
            ? { ...l, quantite: l.quantite + 1, montant: l.montant + (a.prix || 0) }
            : l
        )
      );
    } else {
      setPanier([
        ...panier,
        {
          productId: a.id,
          nom: a.nom,
          couleur: a.couleur,
          taille: a.taille,
          quantite: 1,
          montant: a.prix || 0,
        },
      ]);
    }
    setRecherche("");
  }

  function majLigne(productId: string, champ: "quantite" | "montant", valeur: string) {
    setPanier(
      panier.map((l) => (l.productId === productId ? { ...l, [champ]: Number(valeur) || 0 } : l))
    );
  }

  async function ajouterCommande(e: FormEvent) {
    e.preventDefault();
    if (panier.length === 0) return;

    const res: Response = await fetch("/api/orders/manuel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientNom,
        clientTelephone,
        clientVille,
        clientAdresse,
        lignes: panier.map((l) => ({
          productId: l.productId,
          quantite: l.quantite,
          montant: l.montant,
        })),
      }),
    });

    const data: any = await res.json();

    if (res.ok) {
      setMessage(
        L("Commande ajout\u00E9e, stock d\u00E9duit", "\u062A\u0645\u062A \u0627\u0644\u0625\u0636\u0627\u0641\u0629")
      );
      if (data && data.avertissements && data.avertissements.length > 0) {
        setMessage(data.avertissements.join(" | "));
      }
      setPanier([]);
      setClientNom("");
      setClientTelephone("");
      setClientVille("");
      setClientAdresse("");
      loadOrders();
      loadArticles();
    } else {
      setMessage(data?.error || "Erreur");
    }
  }

  async function supprimerCommande(order: Order) {
    const ok = window.confirm(
      L(
        `Supprimer la commande ${order.numero} ? Les pi\u00E8ces reviendront au stock.`,
        "\u062D\u0630\u0641 \u061F"
      )
    );
    if (!ok) return;

    const res: Response = await fetch(`/api/orders/gestion?id=${order.id}`, { method: "DELETE" });
    const data: any = await res.json();
    if (data?.avertissement) setMessage(data.avertissement);

    loadOrders();
    loadArticles();
  }

  async function fusionner(groupe: Groupe) {
    const ok = window.confirm(
      L(`Fusionner ces ${groupe.commandes.length} commandes ?`, "\u062F\u0645\u062C \u061F")
    );
    if (!ok) return;

    await fetch("/api/orders/gestion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: groupe.commandes.map((c) => c.id) }),
    });
    loadOrders();
  }

  const commandesWeb = orders.filter((o) => o.wooId > 0);
  const commandesInstagram = orders.filter((o) => o.wooId < 0);
  const base = onglet === "web" ? commandesWeb : commandesInstagram;

  const ft = filtreTexte.toLowerCase().trim();
  const maintenant = Date.now();
  const seuil =
    filtrePeriode === "jour"
      ? maintenant - 24 * 60 * 60 * 1000
      : filtrePeriode === "7"
      ? maintenant - 7 * 24 * 60 * 60 * 1000
      : filtrePeriode === "30"
      ? maintenant - 30 * 24 * 60 * 60 * 1000
      : 0;

  const liste = base.filter((o) => {
    if (filtreStatut && o.statut !== filtreStatut) return false;
    if (seuil && new Date(o.dateCommande).getTime() < seuil) return false;
    if (!ft) return true;

    const texte = [
      o.numero,
      o.clientNom,
      o.clientTelephone,
      o.clientVille,
      o.clientAdresse,
      ...(o.produits || []).map((p) => `${p.nom} ${p.couleur || ""} ${p.taille || ""}`),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return texte.includes(ft);
  });

  const groupes = grouper(liste);
  const rangees = groupes.flatMap((g) =>
    g.commandes.map((o, i) => ({ o, g, premier: i === 0, multiple: g.commandes.length > 1 }))
  );

  const r = recherche.toLowerCase().trim();
  const resultats =
    r.length < 2
      ? []
      : articles
          .filter((a) => {
            const texte = [a.nom, a.couleur, a.taille].filter(Boolean).join(" ").toLowerCase();
            return texte.includes(r);
          })
          .slice(0, 15);

  const ra = rechercheAjout.toLowerCase().trim();
  const resultatsAjout =
    ra.length < 2
      ? []
      : articles
          .filter((a) => {
            const texte = [a.nom, a.couleur, a.taille].filter(Boolean).join(" ").toLowerCase();
            return texte.includes(ra);
          })
          .slice(0, 12);

  const totalPanier = panier.reduce((s, l) => s + (l.montant || 0), 0);
  const nbColonnes = onglet === "web" ? 13 : 12;

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

      <div className="lang-switcher" style={{ marginBottom: 14 }}>
        <button
          type="button"
          className={onglet === "web" ? "active" : ""}
          onClick={() => setOnglet("web")}
          style={{ padding: "8px 16px", fontSize: 14 }}
        >
          {L("Commandes site web", "\u0637\u0644\u0628\u0627\u062A \u0627\u0644\u0645\u0648\u0642\u0639")} ({commandesWeb.length})
        </button>
        <button
          type="button"
          className={onglet === "instagram" ? "active" : ""}
          onClick={() => setOnglet("instagram")}
          style={{ padding: "8px 16px", fontSize: 14 }}
        >
          Instagram ({commandesInstagram.length})
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        <input
          placeholder={L(
            "Rechercher : num\u00E9ro, nom, t\u00E9l\u00E9phone, article...",
            "\u0628\u062D\u062B"
          )}
          value={filtreTexte}
          onChange={(e) => setFiltreTexte(e.target.value)}
          className="notes-input"
          style={{ width: 320 }}
        />
        <button
          type="button"
          className={filtrePeriode === "" ? "btn-primary" : "btn-secondary"}
          onClick={() => setFiltrePeriode("")}
          style={petitBouton}
        >
          {L("Tout", "\u0627\u0644\u0643\u0644")}
        </button>
        <button
          type="button"
          className={filtrePeriode === "jour" ? "btn-primary" : "btn-secondary"}
          onClick={() => setFiltrePeriode("jour")}
          style={petitBouton}
        >
          {L("Aujourd'hui", "\u0627\u0644\u064A\u0648\u0645")}
        </button>
        <button
          type="button"
          className={filtrePeriode === "7" ? "btn-primary" : "btn-secondary"}
          onClick={() => setFiltrePeriode("7")}
          style={petitBouton}
        >
          {L("7 jours", "7")}
        </button>
        <button
          type="button"
          className={filtrePeriode === "30" ? "btn-primary" : "btn-secondary"}
          onClick={() => setFiltrePeriode("30")}
          style={petitBouton}
        >
          {L("30 jours", "30")}
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        <button
          type="button"
          className={filtreStatut === "" ? "btn-primary" : "btn-secondary"}
          onClick={() => setFiltreStatut("")}
          style={petitBouton}
        >
          {L("Tous les statuts", "\u0643\u0644 \u0627\u0644\u062D\u0627\u0644\u0627\u062A")} ({base.length})
        </button>
        {STATUS_LIST.map((s) => {
          const nb = base.filter((o) => o.statut === s).length;
          if (nb === 0) return null;
          return (
            <button
              key={s}
              type="button"
              className={filtreStatut === s ? "btn-primary" : "btn-secondary"}
              onClick={() => setFiltreStatut(s)}
              style={petitBouton}
            >
              {ar ? STATUS_CONFIG[s].labelAr : STATUS_CONFIG[s].labelFr} ({nb})
            </button>
          );
        })}
      </div>

      {onglet === "web" && (
        <p className="sync-msg">
          {L(
            "Synchronisation automatique activ\u00E9e",
            "\u0645\u0632\u0627\u0645\u0646\u0629 \u062A\u0644\u0642\u0627\u0626\u064A\u0629"
          )}
          {derniereSync ? ` - ${derniereSync.toLocaleTimeString(ar ? "ar" : "fr-FR")}` : ""}
        </p>
      )}
      {message && <p className="sync-msg">{message}</p>}

      {onglet === "instagram" && (
        <form onSubmit={ajouterCommande} style={{ marginBottom: 18 }}>
          <div className="stock-form" style={{ flexDirection: "column", alignItems: "stretch" }}>
            <input
              placeholder={L("Rechercher un article dans le stock...", "\u0628\u062D\u062B")}
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              style={{ width: "100%" }}
            />

            {resultats.length > 0 && (
              <div
                style={{
                  border: "1px solid #efe1e2",
                  borderRadius: 8,
                  maxHeight: 220,
                  overflowY: "auto",
                  background: "white",
                }}
              >
                {resultats.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => ajouterAuPanier(a)}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "start",
                      border: "none",
                      borderBottom: "1px solid #fdf6f7",
                      background: "transparent",
                      padding: "8px 10px",
                      cursor: "pointer",
                      fontSize: 13,
                    }}
                  >
                    <strong>{a.nom}</strong>
                    {a.couleur ? " - " + a.couleur : ""}
                    {a.taille ? " - " + a.taille : ""}
                    {" | stock "}
                    <span style={{ color: a.quantite > 0 ? "#166534" : "#b91c1c" }}>
                      {a.quantite}
                    </span>
                    {a.prix ? " | " + a.prix : ""}
                  </button>
                ))}
              </div>
            )}
          </div>

          {panier.length > 0 && (
            <div className="table-wrap" style={{ marginBottom: 12 }}>
              <table>
                <thead>
                  <tr>
                    <th>{t("col_products")}</th>
                    <th>{L("Couleur", "\u0627\u0644\u0644\u0648\u0646")}</th>
                    <th>{L("Taille", "\u0627\u0644\u0645\u0642\u0627\u0633")}</th>
                    <th>{L("Quantit\u00E9", "\u0627\u0644\u0643\u0645\u064A\u0629")}</th>
                    <th>{L("Montant", "\u0627\u0644\u0645\u0628\u0644\u063A")}</th>
                    <th>{t("col_actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {panier.map((l) => (
                    <tr key={l.productId}>
                      <td>{l.nom}</td>
                      <td>
                        <Variante valeur={l.couleur || undefined} fond="#e0e7ff" texte="#3730a3" />
                      </td>
                      <td>
                        <Variante valeur={l.taille || undefined} fond="#fce7f3" texte="#9d174d" />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={l.quantite}
                          onChange={(e) => majLigne(l.productId, "quantite", e.target.value)}
                          className="notes-input"
                          style={{ width: 65 }}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={l.montant}
                          onChange={(e) => majLigne(l.productId, "montant", e.target.value)}
                          className="notes-input"
                          style={{ width: 85, fontWeight: 700 }}
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn-link danger"
                          onClick={() =>
                            setPanier(panier.filter((x) => x.productId !== l.productId))
                          }
                        >
                          {t("delete")}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="stock-form">
            <input
              placeholder={L("Nom de la cliente *", "\u0627\u0633\u0645 \u0627\u0644\u0632\u0628\u0648\u0646\u0629")}
              value={clientNom}
              onChange={(e) => setClientNom(e.target.value)}
              required
            />
            <input
              placeholder={L("T\u00E9l\u00E9phone *", "\u0627\u0644\u0647\u0627\u062A\u0641")}
              value={clientTelephone}
              onChange={(e) => setClientTelephone(e.target.value)}
              required
            />
            <input
              placeholder={L("Ville", "\u0627\u0644\u0645\u062F\u064A\u0646\u0629")}
              value={clientVille}
              onChange={(e) => setClientVille(e.target.value)}
            />
            <input
              placeholder={L("Adresse", "\u0627\u0644\u0639\u0646\u0648\u0627\u0646")}
              value={clientAdresse}
              onChange={(e) => setClientAdresse(e.target.value)}
            />
            <div style={{ display: "flex", alignItems: "center", fontWeight: 700 }}>
              {L("Total", "\u0627\u0644\u0645\u062C\u0645\u0648\u0639")} : {totalPanier}
            </div>
            <button type="submit" className="btn-primary" disabled={panier.length === 0}>
              {L("Ajouter la commande", "\u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0637\u0644\u0628")}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p>...</p>
      ) : rangees.length === 0 ? (
        <p className="empty">{t("orders_empty")}</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t("col_status")}</th>
                <th>{t("col_number")}</th>
                <th>{t("col_client")}</th>
                <th>{t("col_phone")}</th>
                <th>{t("col_address")}</th>
                <th>{t("col_products")}</th>
                <th>{L("Couleur", "\u0627\u0644\u0644\u0648\u0646")}</th>
                <th>{L("Taille", "\u0627\u0644\u0645\u0642\u0627\u0633")}</th>
                <th>{t("col_total")}</th>
                <th>{t("col_date")}</th>
                <th>{t("col_notes")}</th>
                {onglet === "web" && (
                  <th>{L("Confirmation", "\u0627\u0644\u062A\u0623\u0643\u064A\u062F")}</th>
                )}
                <th>{t("col_actions")}</th>
              </tr>
            </thead>
            <tbody>
              {rangees.map(({ o, g, premier, multiple }) => (
                <Fragment key={o.id}>
                  <tr
                    style={{
                      backgroundColor: STATUS_CONFIG[o.statut].bg + "55",
                      borderInlineStart: multiple ? "4px solid #f59e0b" : undefined,
                    }}
                  >
                    <td>
                      <div
                        style={{
                          display: "inline-block",
                          padding: "7px 14px",
                          borderRadius: 999,
                          fontSize: 12,
                          fontWeight: 800,
                          whiteSpace: "nowrap",
                          background: STATUS_CONFIG[o.statut].bg,
                          color: STATUS_CONFIG[o.statut].color,
                          border: `1px solid ${STATUS_CONFIG[o.statut].color}33`,
                        }}
                      >
                        {ar ? STATUS_CONFIG[o.statut].labelAr : STATUS_CONFIG[o.statut].labelFr}
                      </div>
                      <select
                        value={o.statut}
                        onChange={(e) => handleStatusChange(o, e.target.value as OrderStatus)}
                        style={{ display: "block", marginTop: 6, fontSize: 12 }}
                      >
                        {STATUS_LIST.map((s) => (
                          <option key={s} value={s}>
                            {ar ? STATUS_CONFIG[s].labelAr : STATUS_CONFIG[s].labelFr}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      {o.numero}
                      {multiple && premier && (
                        <div style={{ fontSize: 10, color: "#b45309", fontWeight: 700, marginTop: 4 }}>
                          {L(
                            `${g.commandes.length} commandes - m\u00EAme num\u00E9ro`,
                            `${g.commandes.length}`
                          )}
                        </div>
                      )}
                    </td>
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
                            {p.nom} x {p.quantite}
                            <button
                              type="button"
                              className="btn-link danger"
                              onClick={() => retirerArticleCommande(o, i)}
                              style={{ marginInlineStart: 6, fontSize: 11 }}
                            >
                              x
                            </button>
                          </li>
                        ))}
                      </ul>
                      <button
                        type="button"
                        style={boutonAjout}
                        onClick={() => {
                          setAjoutPour(ajoutPour === o.id ? null : o.id);
                          setRechercheAjout("");
                        }}
                      >
                        {L("+ Ajouter un article", "+ \u0625\u0636\u0627\u0641\u0629")}
                      </button>
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
                    <td>{o.total}</td>
                    <td>{new Date(o.dateCommande).toLocaleDateString(ar ? "ar" : "fr-FR")}</td>
                    <td>
                      <input
                        defaultValue={o.notes || ""}
                        onBlur={(e) => handleNotesBlur(o, e.target.value)}
                        className="notes-input"
                      />
                    </td>
                    {onglet === "web" && (
                      <td>
                        <button
                          type="button"
                          style={boutonConfirmer}
                          onClick={() => envoyerConfirmation(o)}
                        >
                          {L("Message WhatsApp", "\u062A\u0623\u0643\u064A\u062F")}
                        </button>
                      </td>
                    )}
                    <td style={{ whiteSpace: "nowrap" }}>
                      {multiple && premier && (
                        <button type="button" style={boutonFusion} onClick={() => fusionner(g)}>
                          {L(`Fusionner (${g.commandes.length})`, "\u062F\u0645\u062C")}
                        </button>
                      )}
                      <button
                        className="btn-link danger"
                        onClick={() => supprimerCommande(o)}
                        type="button"
                      >
                        {t("delete")}
                      </button>
                    </td>
                  </tr>

                  {ajoutPour === o.id && (
                    <tr style={{ background: "#fdf6f7" }}>
                      <td colSpan={nbColonnes}>
                        <div style={{ padding: "6px 0" }}>
                          <input
                            autoFocus
                            placeholder={L(
                              "Rechercher un article \u00E0 ajouter (site ou autres articles)...",
                              "\u0628\u062D\u062B"
                            )}
                            value={rechercheAjout}
                            onChange={(e) => setRechercheAjout(e.target.value)}
                            className="notes-input"
                            style={{ width: 380 }}
                          />

                          {resultatsAjout.length > 0 && (
                            <div
                              style={{
                                border: "1px solid #efe1e2",
                                borderRadius: 8,
                                maxHeight: 200,
                                overflowY: "auto",
                                background: "white",
                                marginTop: 6,
                                maxWidth: 520,
                              }}
                            >
                              {resultatsAjout.map((a) => (
                                <button
                                  key={a.id}
                                  type="button"
                                  onClick={() => ajouterArticleCommande(o, a)}
                                  style={{
                                    display: "block",
                                    width: "100%",
                                    textAlign: "start",
                                    border: "none",
                                    borderBottom: "1px solid #fdf6f7",
                                    background: "transparent",
                                    padding: "8px 10px",
                                    cursor: "pointer",
                                    fontSize: 13,
                                  }}
                                >
                                  <strong>{a.nom}</strong>
                                  {a.couleur ? " - " + a.couleur : ""}
                                  {a.taille ? " - " + a.taille : ""}
                                  {" | stock "}
                                  <span style={{ color: a.quantite > 0 ? "#166534" : "#b91c1c" }}>
                                    {a.quantite}
                                  </span>
                                  {!a.wooId && (
                                    <span style={{ color: "#92400e", fontWeight: 700 }}>
                                      {" | " + L("Autres articles", "\u0623\u062E\u0631\u0649")}
                                    </span>
                                  )}
                                  {a.prix ? " | " + a.prix : ""}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
