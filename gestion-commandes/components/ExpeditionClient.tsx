"use client";

import { useEffect, useState, Fragment } from "react";
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
  senditDistrictId: number | null;
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

type District = {
  id: number;
  name: string;
  ville?: string;
  price?: string | number;
  delais?: string;
};

const listeNue = { listStyle: "none", margin: 0, padding: 0 } as const;
const petitBouton = { padding: "6px 12px", fontSize: 12 } as const;

const pastille = {
  display: "inline-block",
  padding: "2px 8px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 700,
  whiteSpace: "nowrap",
} as const;

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

const champSelecteur = {
  width: 150,
  textAlign: "start",
  background: "#ffffff",
  borderRadius: 6,
  padding: "7px 9px",
  fontSize: 12,
  cursor: "pointer",
} as const;

const STATUTS: { [cle: string]: { fr: string; ar: string; fond: string; texte: string } } = {
  PENDING: { fr: "En attente", ar: "\u0641\u064A \u0627\u0644\u0627\u0646\u062A\u0638\u0627\u0631", fond: "#fef9c3", texte: "#854d0e" },
  PICKED_UP: { fr: "Ramasse", ar: "\u062A\u0645 \u0627\u0644\u0627\u0633\u062A\u0644\u0627\u0645", fond: "#dbeafe", texte: "#1e40af" },
  IN_TRANSIT: { fr: "En transit", ar: "\u0641\u064A \u0627\u0644\u0637\u0631\u064A\u0642", fond: "#dbeafe", texte: "#1e40af" },
  DELIVERING: { fr: "En livraison", ar: "\u0642\u064A\u062F \u0627\u0644\u062A\u0648\u0635\u064A\u0644", fond: "#e0e7ff", texte: "#3730a3" },
  DELIVERED: { fr: "Livre", ar: "\u062A\u0645 \u0627\u0644\u062A\u0633\u0644\u064A\u0645", fond: "#a7f3d0", texte: "#065f46" },
  RETURNED: { fr: "Retourne", ar: "\u0645\u064F\u0631\u062C\u0639", fond: "#fee2e2", texte: "#991b1b" },
  CANCELED: { fr: "Annule", ar: "\u0645\u0644\u063A\u0649", fond: "#fee2e2", texte: "#991b1b" },
  SUPPRIME: { fr: "Supprime", ar: "\u0645\u062D\u0630\u0648\u0641", fond: "#fecaca", texte: "#7f1d1d" },
  INCONNU: { fr: "Introuvable", ar: "\u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F", fond: "#fee2e2", texte: "#991b1b" },
};

// Les mouvements de l'application ne touchent que le stock du magasin
function stockMagasin(a: ArticleStock) {
  return a.quantiteMagasin || 0;
}

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

function zonesCorrespondantes(ville: string | null, districts: District[]) {
  const v = normaliser(ville || "");
  if (!v) return [];

  const exactes = districts.filter((d) => normaliser(d.name) === v);
  if (exactes.length > 0) return exactes;

  return districts.filter((d) => normaliser(d.name).startsWith(v));
}

export default function ExpeditionClient() {
  const { t, lang } = useLang();
  const ar = lang === "ar";
  const L = (fr: string, arabe: string) => (ar ? arabe : fr);

  const motStock = L("Stock magasin", "\u0645\u062E\u0632\u0648\u0646 \u0627\u0644\u0645\u062A\u062C\u0631");
  const motRupture = L("Rupture", "\u0646\u0641\u0627\u062F");

  const [orders, setOrders] = useState<Order[]>([]);
  const [articles, setArticles] = useState<ArticleStock[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [statuts, setStatuts] = useState<{ [code: string]: string }>({});
  const [choix, setChoix] = useState<{ [id: string]: string }>({});
  const [fraisTexte, setFraisTexte] = useState<{ [id: string]: string }>({});
  const [loading, setLoading] = useState(true);
  const [suiviEnCours, setSuiviEnCours] = useState(false);
  const [action, setAction] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [panneau, setPanneau] = useState<{ id: string; type: "ville" | "zone" } | null>(null);
  const [recherche, setRecherche] = useState("");

  const [ajoutPour, setAjoutPour] = useState<string | null>(null);
  const [rechercheAjout, setRechercheAjout] = useState("");

  const [filtreTexte, setFiltreTexte] = useState("");
  const [filtreColis, setFiltreColis] = useState("");
  const [filtreSuivi, setFiltreSuivi] = useState("");
  const [filtreSource, setFiltreSource] = useState("");

  async function load() {
    const res: Response = await fetch("/api/orders");
    if (res.ok) {
      const all: Order[] = await res.json();
      setOrders(
        all.filter(
          (o) => o.statut === "CONFIRMEE" || o.statut === "EXPEDIEE" || o.statut === "LIVREE"
        )
      );
    }
    setLoading(false);
  }

  async function loadArticles() {
    const res: Response = await fetch("/api/stock");
    if (res.ok) setArticles(await res.json());
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

      const nouvelles: string[] = [];

      if (data?.livrees?.length > 0) {
        nouvelles.push(
          L(`Livrees : ${data.livrees.join(", ")}`, "\u062A\u0645 \u0627\u0644\u062A\u0633\u0644\u064A\u0645")
        );
      }

      if (data?.supprimees?.length > 0) {
        nouvelles.push(
          L(`Supprimees chez Sendit : ${data.supprimees.join(", ")}`, data.supprimees.join(", "))
        );
      }

      if (data?.erreurs?.length > 0) nouvelles.push(data.erreurs.join(" | "));

      if (nouvelles.length > 0) {
        setMessage(nouvelles.join(" \u2022 "));
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
    loadArticles();
    chargerDistricts();
    chargerSuivi();
  }, []);

  // La zone retenue : celle enregistree dans la commande, sinon la ville
  // quand elle ne correspond qu'a une seule zone.
  useEffect(() => {
    if (districts.length === 0 || orders.length === 0) return;

    setChoix((actuel) => {
      const suivant = { ...actuel };
      let change = false;

      for (const o of orders) {
        if (suivant[o.id] !== undefined) continue;

        if (o.senditDistrictId) {
          const enregistree = districts.find((d) => Number(d.id) === Number(o.senditDistrictId));
          if (enregistree) {
            suivant[o.id] = String(enregistree.id);
            change = true;
            continue;
          }
        }

        const correspondances = zonesCorrespondantes(o.clientVille, districts);

        if (correspondances.length === 1) {
          suivant[o.id] = String(correspondances[0].id);
          change = true;
        }
      }

      return change ? suivant : actuel;
    });
  }, [districts, orders]);

  function zoneChoisie(orderId: string) {
    const id = choix[orderId];
    if (!id) return null;
    return districts.find((d) => String(d.id) === id) || null;
  }

  function ouvrirPanneau(o: Order, type: "ville" | "zone") {
    if (panneau && panneau.id === o.id && panneau.type === type) {
      setPanneau(null);
      return;
    }
    setPanneau({ id: o.id, type });
    setRecherche(o.clientVille ? String(o.clientVille).slice(0, 6) : "");
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

  // Choix d'une zone : la zone est enregistree, et la ville est alignee
  // dessus si le panneau ouvert etait celui de la ville.
  async function choisirZone(order: Order, d: District, alignerVille: boolean) {
    setChoix((c) => ({ ...c, [order.id]: String(d.id) }));
    setPanneau(null);
    setRecherche("");

    const corps: Record<string, unknown> = { senditDistrictId: d.id };
    if (alignerVille) corps.clientVille = d.name;

    await fetch(`/api/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corps),
    });

    load();
  }

  async function garderVilleLibre(order: Order) {
    const texte = recherche.trim();
    if (!texte) return;

    setPanneau(null);
    setRecherche("");
    await modifier(order, "clientVille", texte);
  }

  async function utiliserTarifZone(order: Order) {
    const zone = zoneChoisie(order.id);
    if (!zone || zone.price === undefined || zone.price === null) return;
    await modifier(order, "fraisLivraison", String(zone.price));
  }

  async function ajouterArticle(order: Order, a: ArticleStock) {
    if (stockMagasin(a) <= 0) {
      setMessage(
        L(
          `${a.nom} : aucune pi\u00E8ce au magasin, ajout impossible`,
          `${a.nom} : \u0646\u0641\u0627\u062F \u0627\u0644\u0645\u062E\u0632\u0648\u0646`
        )
      );
      return;
    }

    const res: Response = await fetch("/api/orders/lignes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: order.id, productId: a.id, quantite: 1 }),
    });

    const data: any = await res.json();

    if (res.ok) {
      setMessage(
        L(
          `${a.nom} ajout\u00E9. Pensez \u00E0 cliquer sur "Mettre a jour" pour corriger le colis.`,
          a.nom
        )
      );
      if (data?.avertissements?.length > 0) setMessage(data.avertissements.join(" | "));
      setRechercheAjout("");
      setAjoutPour(null);
      load();
      loadArticles();
    } else {
      setMessage(data?.error || "Erreur");
    }
  }

  async function retirerArticle(order: Order, index: number) {
    const ok = window.confirm(
      L(
        "Retirer cet article de la commande ? Il reviendra au stock du magasin.",
        "\u062D\u0630\u0641 \u061F"
      )
    );
    if (!ok) return;

    await fetch(`/api/orders/lignes?orderId=${order.id}&index=${index}`, { method: "DELETE" });
    setMessage(
      L(
        "Article retir\u00E9. Pensez \u00E0 cliquer sur \"Mettre a jour\" pour corriger le colis.",
        "\u062A\u0645 \u0627\u0644\u062D\u0630\u0641"
      )
    );
    load();
    loadArticles();
  }

  async function envoyerSendit(order: Order, forcer: boolean) {
    const districtId = choix[order.id];
    if (!districtId) {
      setMessage(L("Choisissez d'abord la zone de livraison.", "\u0627\u062E\u062A\u0631 \u0627\u0644\u0645\u0646\u0637\u0642\u0629"));
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
      setMessage(L("Choisissez d'abord la zone de livraison.", "\u0627\u062E\u062A\u0631 \u0627\u0644\u0645\u0646\u0637\u0642\u0629"));
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
    if (filtreSource === "web" && o.wooId < 0) return false;
    if (filtreSource === "instagram" && o.wooId > 0) return false;

    if (filtreColis === "a-envoyer" && o.senditCode) return false;
    if (filtreColis === "envoyees" && !o.senditCode) return false;
    if (filtreColis === "livrees" && o.statut !== "LIVREE") return false;

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

  const rz = normaliser(recherche);
  const zonesFiltrees =
    rz.length < 2
      ? districts.slice(0, 30)
      : districts.filter((d) => normaliser(d.name).includes(rz)).slice(0, 60);

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

  const aEnvoyer = orders.filter((o) => !o.senditCode).length;
  const envoyees = orders.filter((o) => o.senditCode).length;
  const nbLivrees = orders.filter((o) => o.statut === "LIVREE").length;
  const nbWeb = orders.filter((o) => o.wooId > 0).length;
  const nbInstagram = orders.filter((o) => o.wooId < 0).length;

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

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        <input
          placeholder={L("Rechercher : numero, nom, telephone, code colis...", "\u0628\u062D\u062B")}
          value={filtreTexte}
          onChange={(e) => setFiltreTexte(e.target.value)}
          className="notes-input"
          style={{ width: 300 }}
        />
        <button
          type="button"
          className={filtreSource === "" ? "btn-primary" : "btn-secondary"}
          onClick={() => setFiltreSource("")}
          style={petitBouton}
        >
          {L("Toutes sources", "\u0627\u0644\u0643\u0644")} ({orders.length})
        </button>
        <button
          type="button"
          className={filtreSource === "web" ? "btn-primary" : "btn-secondary"}
          onClick={() => setFiltreSource("web")}
          style={petitBouton}
        >
          {L("Site web", "\u0627\u0644\u0645\u0648\u0642\u0639")} ({nbWeb})
        </button>
        <button
          type="button"
          className={filtreSource === "instagram" ? "btn-primary" : "btn-secondary"}
          onClick={() => setFiltreSource("instagram")}
          style={petitBouton}
        >
          Instagram ({nbInstagram})
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        <button
          type="button"
          className={filtreColis === "" ? "btn-primary" : "btn-secondary"}
          onClick={() => setFiltreColis("")}
          style={petitBouton}
        >
          {L("Toutes", "\u0627\u0644\u0643\u0644")}
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
        <button
          type="button"
          className={filtreColis === "livrees" ? "btn-primary" : "btn-secondary"}
          onClick={() => setFiltreColis("livrees")}
          style={petitBouton}
        >
          {L("Livrees", "\u062A\u0645 \u0627\u0644\u062A\u0633\u0644\u064A\u0645")} ({nbLivrees})
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
                const introuvable = brut === "INCONNU" || brut === "SUPPRIME";
                const livree = o.statut === "LIVREE";
                const zone = zoneChoisie(o.id);
                const ouvert = panneau && panneau.id === o.id;

                const fraisAffiche =
                  fraisTexte[o.id] !== undefined ? fraisTexte[o.id] : String(o.fraisLivraison || 0);
                const aEncaisser = (o.total || 0) + (Number(fraisAffiche) || 0);

                return (
                  <Fragment key={o.id}>
                    <tr style={{ background: livree ? "#f0fdf4" : undefined }}>
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
                        <button
                          type="button"
                          onClick={() => ouvrirPanneau(o, "ville")}
                          style={{
                            ...champSelecteur,
                            width: 120,
                            border: `1px solid ${o.clientVille ? "#efe1e2" : "#b91c1c"}`,
                            color: o.clientVille ? "#3f3030" : "#b91c1c",
                            fontWeight: o.clientVille ? 400 : 700,
                          }}
                        >
                          {o.clientVille ||
                            L("Choisir la ville", "\u0627\u062E\u062A\u0631 \u0627\u0644\u0645\u062F\u064A\u0646\u0629")}
                        </button>
                      </td>
                      <td>
                        <ul style={listeNue}>
                          {o.produits?.map((p, i) => (
                            <li key={i} style={{ marginBottom: 6 }}>
                              {p.nom} x {p.quantite}
                              {!livree && (
                                <button
                                  type="button"
                                  className="btn-link danger"
                                  onClick={() => retirerArticle(o, i)}
                                  style={{ marginInlineStart: 6, fontSize: 11 }}
                                >
                                  x
                                </button>
                              )}
                            </li>
                          ))}
                        </ul>
                        {!livree && (
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
                        )}
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
                          <button
                            type="button"
                            style={boutonTarif}
                            onClick={() => utiliserTarifZone(o)}
                          >
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
                        <button
                          type="button"
                          onClick={() => ouvrirPanneau(o, "zone")}
                          style={{
                            ...champSelecteur,
                            width: 165,
                            border: `1px solid ${zone ? "#efe1e2" : "#b91c1c"}`,
                            color: zone ? "#3f3030" : "#b91c1c",
                            fontWeight: zone ? 400 : 700,
                          }}
                        >
                          {zone
                            ? zone.name
                            : L("Choisir la zone", "\u0627\u062E\u062A\u0631 \u0627\u0644\u0645\u0646\u0637\u0642\u0629")}
                        </button>

                        {zone && (
                          <div
                            style={{ fontSize: 11, fontWeight: 700, color: "#0369a1", marginTop: 4 }}
                          >
                            {L("Frais Sendit", "\u0627\u0644\u0631\u0633\u0648\u0645")} : {zone.price ?? "-"}
                            {zone.delais ? ` | ${zone.delais}` : ""}
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
                            {!introuvable && !livree && (
                              <button
                                type="button"
                                style={boutonMaj}
                                onClick={() => majColis(o)}
                                disabled={occupe}
                              >
                                {occupe ? "..." : L("Mettre a jour", "\u062A\u062D\u062F\u064A\u062B")}
                              </button>
                            )}
                            {!livree && (
                              <button
                                type="button"
                                style={boutonRenvoi}
                                onClick={() => envoyerSendit(o, true)}
                                disabled={occupe}
                              >
                                {occupe ? "..." : L("Renvoyer a Sendit", "\u0625\u0639\u0627\u062F\u0629")}
                              </button>
                            )}
                          </div>
                        ) : (
                          <button
                            type="button"
                            style={boutonEnvoi}
                            onClick={() => envoyerSendit(o, false)}
                            disabled={occupe}
                          >
                            {occupe
                              ? L("Envoi...", "\u062C\u0627\u0631\u064D")
                              : L("Envoyer a Sendit", "\u0625\u0631\u0633\u0627\u0644")}
                          </button>
                        )}
                      </td>
                    </tr>

                    {ouvert && (
                      <tr style={{ background: "#eff6ff" }}>
                        <td colSpan={14}>
                          <div style={{ padding: "8px 0", maxWidth: 560 }}>
                            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
                              {panneau?.type === "ville"
                                ? L("Ville de livraison", "\u0645\u062F\u064A\u0646\u0629 \u0627\u0644\u062A\u0648\u0635\u064A\u0644")
                                : L("Zone de livraison", "\u0645\u0646\u0637\u0642\u0629 \u0627\u0644\u062A\u0648\u0635\u064A\u0644")}
                              {" \u2014 "}
                              {o.clientNom}
                            </div>

                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                              <input
                                autoFocus
                                value={recherche}
                                onChange={(e) => setRecherche(e.target.value)}
                                placeholder={L(
                                  "Tapez la ville ou le secteur...",
                                  "\u0627\u0643\u062A\u0628 \u0627\u0644\u0645\u062F\u064A\u0646\u0629"
                                )}
                                className="notes-input"
                                style={{ width: 300 }}
                              />
                              {panneau?.type === "ville" && (
                                <button
                                  type="button"
                                  className="btn-secondary"
                                  onClick={() => garderVilleLibre(o)}
                                  style={petitBouton}
                                >
                                  {L("Garder ce texte", "\u0627\u062D\u062A\u0641\u0638 \u0628\u0647")}
                                </button>
                              )}
                            </div>

                            <div
                              style={{
                                border: "1px solid #dbeafe",
                                borderRadius: 8,
                                maxHeight: 240,
                                overflowY: "auto",
                                background: "white",
                                marginTop: 8,
                              }}
                            >
                              {zonesFiltrees.length === 0 ? (
                                <div style={{ padding: 10, fontSize: 12, color: "#b91c1c" }}>
                                  {L("Aucune zone trouv\u00E9e", "\u0644\u0627 \u062A\u0648\u062C\u062F")}
                                </div>
                              ) : (
                                zonesFiltrees.map((d) => (
                                  <button
                                    key={d.id}
                                    type="button"
                                    onClick={() => choisirZone(o, d, panneau?.type === "ville")}
                                    style={{
                                      display: "block",
                                      width: "100%",
                                      textAlign: "start",
                                      border: "none",
                                      borderBottom: "1px solid #f1f5f9",
                                      background:
                                        String(d.id) === choix[o.id] ? "#dbeafe" : "transparent",
                                      padding: "11px 12px",
                                      cursor: "pointer",
                                      fontSize: 13,
                                    }}
                                  >
                                    <strong>{d.name}</strong>
                                    <span style={{ color: "#0369a1", fontWeight: 700 }}>
                                      {" \u2014 "}
                                      {d.price ?? "-"}
                                    </span>
                                    {d.delais ? (
                                      <span style={{ color: "#8a6b6c" }}> | {d.delais}</span>
                                    ) : null}
                                  </button>
                                ))
                              )}
                            </div>

                            <button
                              type="button"
                              className="btn-link"
                              onClick={() => setPanneau(null)}
                              style={{ marginTop: 8 }}
                            >
                              {L("Fermer", "\u0625\u063A\u0644\u0627\u0642")}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}

                    {ajoutPour === o.id && (
                      <tr style={{ background: "#fdf6f7" }}>
                        <td colSpan={14}>
                          <div style={{ padding: "6px 0" }}>
                            <input
                              autoFocus
                              placeholder={L(
                                "Rechercher un article dans le stock magasin...",
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
                                  maxWidth: 560,
                                }}
                              >
                                {resultatsAjout.map((a) => {
                                  const dispo = stockMagasin(a);
                                  const rupture = dispo <= 0;

                                  return (
                                    <button
                                      key={a.id}
                                      type="button"
                                      onClick={() => ajouterArticle(o, a)}
                                      disabled={rupture}
                                      style={{
                                        display: "block",
                                        width: "100%",
                                        textAlign: "start",
                                        border: "none",
                                        borderBottom: "1px solid #fdf6f7",
                                        background: rupture ? "#fef2f2" : "transparent",
                                        padding: "8px 10px",
                                        cursor: rupture ? "not-allowed" : "pointer",
                                        fontSize: 13,
                                        opacity: rupture ? 0.7 : 1,
                                      }}
                                    >
                                      <strong>{a.nom}</strong>
                                      {a.couleur ? " - " + a.couleur : ""}
                                      {a.taille ? " - " + a.taille : ""}
                                      {" | " + motStock + " "}
                                      <span
                                        style={{
                                          color: rupture ? "#b91c1c" : "#166534",
                                          fontWeight: 700,
                                        }}
                                      >
                                        {dispo}
                                      </span>
                                      {!a.wooId && (
                                        <span style={{ color: "#92400e", fontWeight: 700 }}>
                                          {" | " + L("Autres articles", "\u0623\u062E\u0631\u0649")}
                                        </span>
                                      )}
                                      {a.prix ? " | " + a.prix : ""}
                                      {rupture && (
                                        <span
                                          style={{
                                            ...pastille,
                                            background: "#fee2e2",
                                            color: "#991b1b",
                                            marginInlineStart: 8,
                                          }}
                                        >
                                          {motRupture}
                                        </span>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
