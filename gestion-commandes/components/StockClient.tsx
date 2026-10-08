"use client";

import { useEffect, useState, FormEvent, Fragment } from "react";
import { useLang } from "./LangProvider";

type Produit = {
  id: string;
  wooId: number | null;
  parentId: number | null;
  nom: string;
  reference: string | null;
  sku: string | null;
  categorie: string | null;
  couleur: string | null;
  taille: string | null;
  quantite: number;
  quantiteMagasin: number;
  seuilAlerte: number;
  prix: number | null;
};

type Groupe = {
  cle: string;
  nom: string;
  categorie: string | null;
  ordre: number;
  local: boolean;
  items: Produit[];
};

const TAILLES_PROPOSEES = ["Standard", "S", "M", "L", "XL", "XXL"];

const pastille = {
  display: "inline-block",
  padding: "3px 9px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 700,
  whiteSpace: "nowrap",
} as const;

const pastilleCliquable = {
  ...pastille,
  cursor: "pointer",
  border: "none",
  padding: "5px 12px",
  fontSize: 12,
} as const;

const petitBouton = { padding: "6px 12px", fontSize: 12 } as const;

const boutonEnregistrer = {
  background: "#166534",
  color: "white",
  border: "none",
  padding: "5px 10px",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 11,
  fontWeight: 800,
  whiteSpace: "nowrap",
  marginInlineStart: 6,
} as const;

const boutonAnnuler = {
  background: "#ffffff",
  color: "#b91c1c",
  border: "1px solid #fecaca",
  padding: "5px 9px",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 11,
  fontWeight: 700,
  whiteSpace: "nowrap",
  marginInlineStart: 4,
} as const;

const fondSite = "#f1f5f9";
const texteSite = "#475569";
const fondMagasin = "#eff6ff";
const texteMagasin = "#0369a1";

const fondModifie = "#fff7ed";
const fondEnregistre = "#dcfce7";

const ORDRE_TAILLES = ["standard", "xs", "s", "m", "l", "xl", "xxl", "xxxl"];

function rangTaille(t: string | null) {
  const v = (t || "").toLowerCase().trim();
  const i = ORDRE_TAILLES.indexOf(v);
  return i === -1 ? 99 : i;
}

const PALETTE_TAILLES: { [cle: string]: { fond: string; texte: string } } = {
  standard: { fond: "#f1f5f9", texte: "#334155" },
  xs: { fond: "#e2e8f0", texte: "#334155" },
  s: { fond: "#ccfbf1", texte: "#0f766e" },
  m: { fond: "#fce7f3", texte: "#9d174d" },
  l: { fond: "#fef3c7", texte: "#92400e" },
  xl: { fond: "#ede9fe", texte: "#5b21b6" },
  xxl: { fond: "#fee2e2", texte: "#991b1b" },
  xxxl: { fond: "#dbeafe", texte: "#1e40af" },
};

const PALETTE_SECOURS = [
  { fond: "#e0f2fe", texte: "#075985" },
  { fond: "#dcfce7", texte: "#166534" },
  { fond: "#fae8ff", texte: "#86198f" },
  { fond: "#ffedd5", texte: "#9a3412" },
  { fond: "#ede9fe", texte: "#4c1d95" },
];

function couleurTaille(taille: string | null) {
  const v = (taille || "").toLowerCase().trim();
  if (PALETTE_TAILLES[v]) return PALETTE_TAILLES[v];

  let somme = 0;
  for (let i = 0; i < v.length; i++) somme += v.charCodeAt(i);
  return PALETTE_SECOURS[somme % PALETTE_SECOURS.length];
}

function normaliser(texte: string) {
  return (texte || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export default function StockClient({
  role = "ADMIN",
  lectureSeule = false,
}: {
  role?: string;
  lectureSeule?: boolean;
}) {
  const { t, lang } = useLang();
  const ar = lang === "ar";
  const L = (fr: string, arabe: string) => (ar ? arabe : fr);

  // lectureSeule l'emporte sur le role : c'est l'onglet Stock du Magasin
  const admin = role === "ADMIN" && !lectureSeule;
  const peutModifier = !lectureSeule;

  const motSite = L("Site", "\u0627\u0644\u0645\u0648\u0642\u0639");
  const motMagasin = L("Magasin", "\u0627\u0644\u0645\u062A\u062C\u0631");
  const motCouleur = L("Couleur", "\u0627\u0644\u0644\u0648\u0646");
  const motTaille = L("Taille", "\u0627\u0644\u0645\u0642\u0627\u0633");
  const motAutres = L("Autres articles", "\u0645\u0646\u062A\u062C\u0627\u062A \u0623\u062E\u0631\u0649");

  const [produits, setProduits] = useState<Produit[]>([]);
  const [edits, setEdits] = useState<{ [cle: string]: string }>({});
  const [succes, setSucces] = useState<{ [id: string]: boolean }>({});
  const [enCours, setEnCours] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [importEnCours, setImportEnCours] = useState(false);
  const [ajoutEnCours, setAjoutEnCours] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState(false);
  const [recherche, setRecherche] = useState("");
  const [categorie, setCategorie] = useState("");
  const [origine, setOrigine] = useState("");
  const [ouverts, setOuverts] = useState<{ [cle: string]: boolean }>({});

  const [nom, setNom] = useState("");
  const [couleurSaisie, setCouleurSaisie] = useState("");
  const [couleursListe, setCouleursListe] = useState<string[]>([]);
  const [tailles, setTailles] = useState<string[]>(["Standard"]);
  const [tailleLibre, setTailleLibre] = useState("");
  const [quantite, setQuantite] = useState("0");
  const [prix, setPrix] = useState("");

  async function load() {
    const res: Response = await fetch("/api/stock");
    if (res.ok) setProduits(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function cleDe(p: Produit, champ: string) {
    return `${p.id}-${champ}`;
  }

  function valeur(p: Produit, champ: string, reelle: any) {
    const cle = cleDe(p, champ);
    if (edits[cle] !== undefined) return edits[cle];
    return reelle === null || reelle === undefined ? "" : String(reelle);
  }

  function saisir(p: Produit, champ: string, v: string) {
    setEdits((e) => ({ ...e, [cleDe(p, champ)]: v }));
  }

  // Les champs de cette ligne qui attendent d'etre enregistres
  function champsModifies(p: Produit) {
    const liste: string[] = [];
    if (!peutModifier) return liste;

    const q = edits[cleDe(p, "quantiteMagasin")];
    if (q !== undefined && Number(q || 0) !== (p.quantiteMagasin || 0)) {
      liste.push("quantiteMagasin");
    }

    if (admin) {
      const pr = edits[cleDe(p, "prix")];
      const actuel = p.prix === null || p.prix === undefined ? "" : String(p.prix);
      if (pr !== undefined && pr !== actuel) liste.push("prix");
    }

    return liste;
  }

  function oublier(p: Produit, champs: string[]) {
    setEdits((e) => {
      const copie = { ...e };
      for (const c of champs) delete copie[cleDe(p, c)];
      return copie;
    });
  }

  async function enregistrer(p: Produit) {
    const champs = champsModifies(p);
    if (champs.length === 0) return;

    setEnCours(p.id);
    setMessage(null);
    setErreur(false);

    const corps: Record<string, unknown> = {};

    for (const champ of champs) {
      const v = edits[cleDe(p, champ)];
      if (champ === "prix") corps.prix = v === "" ? null : Number(v);
      else corps[champ] = Number(v) || 0;
    }

    try {
      const res: Response = await fetch(`/api/stock/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corps),
      });

      const data: any = await res.json();

      if (!res.ok) {
        setErreur(true);
        setMessage(data?.error || "Erreur : la modification n'a pas \u00E9t\u00E9 enregistr\u00E9e");
        return;
      }

      // On met a jour la ligne sur place : aucun rechargement ne peut
      // ecraser votre saisie.
      setProduits((liste) =>
        liste.map((x) =>
          x.id === p.id
            ? {
                ...x,
                quantiteMagasin: Number(data.quantiteMagasin ?? x.quantiteMagasin),
                prix: data.prix === null || data.prix === undefined ? x.prix : Number(data.prix),
              }
            : x
        )
      );

      oublier(p, champs);

      setSucces((s) => ({ ...s, [p.id]: true }));
      setTimeout(() => {
        setSucces((s) => {
          const copie = { ...s };
          delete copie[p.id];
          return copie;
        });
      }, 2500);

      const detail = [p.nom, p.couleur, p.taille].filter(Boolean).join(" - ");
      setMessage(
        L(
          `Enregistr\u00E9 : ${detail} \u2014 stock magasin ${Number(
            data.quantiteMagasin ?? p.quantiteMagasin
          )}`,
          "\u062A\u0645 \u0627\u0644\u062D\u0641\u0638"
        )
      );
    } catch (e: any) {
      setErreur(true);
      setMessage(e?.message ?? "Erreur de connexion");
    } finally {
      setEnCours(null);
    }
  }

  async function importerDepuisSite() {
    setImportEnCours(true);
    setMessage(null);
    setErreur(false);

    let page = 1;
    let total = 0;
    let continuer = true;
    let tours = 0;

    try {
      while (continuer && tours < 300) {
        tours++;

        const res: Response = await fetch(`/api/stock/sync?page=${page}`, { method: "POST" });
        const data: any = await res.json();

        if (!res.ok) {
          setErreur(true);
          setMessage(data?.error || "Erreur");
          break;
        }

        total += Number(data?.importes) || 0;
        setMessage(L(`${total} lignes import\u00E9es...`, `${total}`));

        if (data?.pageSuivante) page = Number(data.pageSuivante);
        else continuer = false;
      }

      setMessage(L(`Import termin\u00E9 : ${total} lignes`, `${total}`));
      await load();
    } catch (e: any) {
      setErreur(true);
      setMessage(e?.message ?? "Erreur de connexion");
    } finally {
      setImportEnCours(false);
    }
  }

  function ajouterCouleur() {
    const v = couleurSaisie.trim();
    if (!v) return;
    setCouleursListe((liste) => (liste.includes(v) ? liste : [...liste, v]));
    setCouleurSaisie("");
  }

  function retirerCouleur(c: string) {
    setCouleursListe((liste) => liste.filter((x) => x !== c));
  }

  function basculerTaille(ta: string) {
    setTailles((liste) => (liste.includes(ta) ? liste.filter((x) => x !== ta) : [...liste, ta]));
  }

  function ajouterTailleLibre() {
    const v = tailleLibre.trim();
    if (!v) return;
    setTailles((liste) => (liste.includes(v) ? liste : [...liste, v]));
    setTailleLibre("");
  }

  async function ajouter(e: FormEvent) {
    e.preventDefault();
    if (!nom.trim()) return;

    const couleursFinales = couleursListe.length > 0 ? couleursListe : [""];
    const taillesFinales = tailles.length > 0 ? tailles : ["Standard"];

    setAjoutEnCours(true);
    let creees = 0;

    try {
      for (const c of couleursFinales) {
        for (const ta of taillesFinales) {
          const res: Response = await fetch("/api/stock", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              nom: nom.trim(),
              couleur: c,
              taille: ta,
              quantiteMagasin: Number(quantite) || 0,
              prix: prix ? Number(prix) : null,
              categorie: "Autres articles",
            }),
          });
          if (res.ok) creees++;
        }
      }

      setMessage(L(`${creees} variante(s) cr\u00E9\u00E9e(s)`, `${creees}`));
      setCouleursListe([]);
      setCouleurSaisie("");
      setQuantite("0");
      await load();
    } catch (err: any) {
      setErreur(true);
      setMessage(err?.message ?? "Erreur");
    } finally {
      setAjoutEnCours(false);
    }
  }

  async function supprimerLigne(p: Produit) {
    const ok = window.confirm(L("Supprimer cette variante ?", "\u062D\u0630\u0641 \u061F"));
    if (!ok) return;
    await fetch(`/api/stock/${p.id}`, { method: "DELETE" });
    load();
  }

  async function supprimerArticle(g: Groupe) {
    const ok = window.confirm(L(`Supprimer "${g.nom}" ?`, "\u062D\u0630\u0641 \u061F"));
    if (!ok) return;

    for (const p of g.items) {
      await fetch(`/api/stock/${p.id}`, { method: "DELETE" });
    }
    load();
  }

  const categories: string[] = Array.from(
    new Set(produits.map((p) => p.categorie).filter(Boolean) as string[])
  ).sort();

  const r = recherche.toLowerCase().trim();

  const filtres = produits.filter((p) => {
    if (origine === "site" && !p.wooId) return false;
    if (origine === "autres" && p.wooId) return false;
    if (categorie && p.categorie !== categorie) return false;
    if (!r) return true;

    const texte = [p.nom, p.couleur, p.taille, p.sku, p.reference]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return texte.includes(r);
  });

  const parCle = new Map<string, Groupe>();

  for (const p of filtres) {
    const cle = p.parentId ? `p${p.parentId}` : p.wooId ? `s${p.wooId}` : `l${normaliser(p.nom)}`;
    const ordre = p.parentId || p.wooId || 999999999;

    if (!parCle.has(cle)) {
      parCle.set(cle, {
        cle,
        nom: p.nom,
        categorie: p.categorie,
        ordre,
        local: !p.wooId,
        items: [],
      });
    }
    parCle.get(cle)!.items.push(p);
  }

  const groupes = Array.from(parCle.values()).sort((a, b) => b.ordre - a.ordre);

  const nbSite = produits.filter((p) => p.wooId).length;
  const nbAutres = produits.filter((p) => !p.wooId).length;
  const nbVariantes = Math.max(1, couleursListe.length) * Math.max(1, tailles.length);

  const nbEnAttente = produits.filter((p) => champsModifies(p).length > 0).length;

  return (
    <div>
      <div className="page-header">
        <h1>{t("stock_title")}</h1>
        {admin && (
          <button className="btn-primary" onClick={importerDepuisSite} disabled={importEnCours}>
            {importEnCours
              ? L("Import en cours...", "\u062C\u0627\u0631\u064D")
              : L("Importer depuis le site", "\u0627\u0633\u062A\u064A\u0631\u0627\u062F")}
          </button>
        )}
      </div>

      <p
        style={{
          background: "#fdf6f7",
          border: "1px solid #efe1e2",
          borderRadius: 10,
          padding: "10px 14px",
          fontSize: 13,
          color: "#8a6b6c",
          margin: "0 0 14px",
          lineHeight: 1.6,
        }}
      >
        {peutModifier
          ? L(
              "La colonne Site refl\u00E8te ounshijabi.com et ne se modifie que sur le site. La colonne Magasin sert aux ventes en boutique et aux commandes Instagram : modifiez la quantit\u00E9 puis cliquez sur Enregistrer, rien n'est sauvegard\u00E9 avant.",
              "\u0639\u0645\u0648\u062F \u0627\u0644\u0645\u0648\u0642\u0639 \u0644\u0644\u0627\u0637\u0644\u0627\u0639 \u0641\u0642\u0637"
            )
          : L(
              "Stock en consultation : les quantit\u00E9s se modifient depuis la rubrique Stock.",
              "\u0644\u0644\u0627\u0637\u0644\u0627\u0639 \u0641\u0642\u0637"
            )}
      </p>

      {nbEnAttente > 0 && (
        <p
          style={{
            background: fondModifie,
            border: "2px solid #b45309",
            borderRadius: 10,
            padding: "10px 14px",
            fontSize: 13,
            fontWeight: 700,
            color: "#b45309",
            margin: "0 0 12px",
          }}
        >
          {L(
            `${nbEnAttente} ligne(s) modifi\u00E9e(s) non enregistr\u00E9e(s). Cliquez sur Enregistrer sur chaque ligne orange.`,
            `${nbEnAttente}`
          )}
        </p>
      )}

      {message && (
        <p className="sync-msg" style={{ color: erreur ? "#b91c1c" : "#166534", fontWeight: 700 }}>
          {message}
        </p>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        <input
          placeholder={L("Rechercher un article...", "\u0628\u062D\u062B")}
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          className="notes-input"
          style={{ width: 250 }}
        />
        <button
          type="button"
          className={origine === "" ? "btn-primary" : "btn-secondary"}
          onClick={() => setOrigine("")}
          style={petitBouton}
        >
          {L("Tout", "\u0627\u0644\u0643\u0644")} ({produits.length})
        </button>
        <button
          type="button"
          className={origine === "site" ? "btn-primary" : "btn-secondary"}
          onClick={() => setOrigine("site")}
          style={petitBouton}
        >
          {L("Articles du site", "\u0645\u0646\u062A\u062C\u0627\u062A \u0627\u0644\u0645\u0648\u0642\u0639")} ({nbSite})
        </button>
        <button
          type="button"
          className={origine === "autres" ? "btn-primary" : "btn-secondary"}
          onClick={() => setOrigine("autres")}
          style={petitBouton}
        >
          {motAutres} ({nbAutres})
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        <button
          type="button"
          className={categorie === "" ? "btn-primary" : "btn-secondary"}
          onClick={() => setCategorie("")}
          style={petitBouton}
        >
          {L("Toutes cat\u00E9gories", "\u0643\u0644 \u0627\u0644\u0641\u0626\u0627\u062A")}
        </button>
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            className={categorie === c ? "btn-primary" : "btn-secondary"}
            onClick={() => setCategorie(c)}
            style={petitBouton}
          >
            {c}
          </button>
        ))}
      </div>

      {origine === "autres" && admin && (
        <form
          onSubmit={ajouter}
          className="stock-form"
          style={{ flexDirection: "column", alignItems: "stretch" }}
        >
          <div style={{ fontWeight: 700, fontSize: 13 }}>
            {L(
              "Ajouter un article dans Autres articles",
              "\u0625\u0636\u0627\u0641\u0629 \u0645\u0646\u062A\u062C"
            )}
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              placeholder={t("col_product_name")}
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              style={{ flex: 1, minWidth: 200 }}
            />
            <input
              type="number"
              placeholder={L("Quantit\u00E9 magasin", "\u0643\u0645\u064A\u0629 \u0627\u0644\u0645\u062A\u062C\u0631")}
              value={quantite}
              onChange={(e) => setQuantite(e.target.value)}
              style={{ width: 170 }}
            />
            <input
              type="number"
              placeholder={t("col_price")}
              value={prix}
              onChange={(e) => setPrix(e.target.value)}
              style={{ width: 110 }}
            />
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: 12, fontWeight: 700, minWidth: 70 }}>{motCouleur} :</span>
            <input
              placeholder={L(
                "\u00C9crivez la couleur, puis Ajouter",
                "\u0627\u0643\u062A\u0628 \u0627\u0644\u0644\u0648\u0646"
              )}
              value={couleurSaisie}
              onChange={(e) => setCouleurSaisie(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  ajouterCouleur();
                }
              }}
              className="notes-input"
              style={{ width: 240 }}
            />
            <button
              type="button"
              className="btn-secondary"
              onClick={ajouterCouleur}
              style={petitBouton}
            >
              {L("+ Ajouter", "+")}
            </button>

            {couleursListe.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => retirerCouleur(c)}
                style={{ ...pastilleCliquable, background: "#e0e7ff", color: "#3730a3" }}
                title={L("Cliquer pour retirer", "\u0625\u0632\u0627\u0644\u0629")}
              >
                {c} x
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: 12, fontWeight: 700, minWidth: 70 }}>{motTaille} :</span>
            {TAILLES_PROPOSEES.map((ta) => (
              <button
                key={ta}
                type="button"
                className={tailles.includes(ta) ? "btn-primary" : "btn-secondary"}
                onClick={() => basculerTaille(ta)}
                style={petitBouton}
              >
                {ta}
              </button>
            ))}
            {tailles
              .filter((ta) => !TAILLES_PROPOSEES.includes(ta))
              .map((ta) => (
                <button
                  key={ta}
                  type="button"
                  className="btn-primary"
                  onClick={() => basculerTaille(ta)}
                  style={petitBouton}
                >
                  {ta}
                </button>
              ))}
            <input
              placeholder={L("Autre taille", "\u0645\u0642\u0627\u0633 \u0622\u062E\u0631")}
              value={tailleLibre}
              onChange={(e) => setTailleLibre(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  ajouterTailleLibre();
                }
              }}
              className="notes-input"
              style={{ width: 130 }}
            />
            <button
              type="button"
              className="btn-secondary"
              onClick={ajouterTailleLibre}
              style={petitBouton}
            >
              +
            </button>
          </div>

          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <button type="submit" className="btn-primary" disabled={ajoutEnCours || !nom.trim()}>
              {ajoutEnCours ? "..." : t("stock_add")}
            </button>
            <span style={{ fontSize: 12, color: "#8a6b6c" }}>
              {L(`${nbVariantes} variante(s) seront cr\u00E9\u00E9es`, `${nbVariantes}`)}
            </span>
          </div>
        </form>
      )}

      {loading ? (
        <p>...</p>
      ) : groupes.length === 0 ? (
        <p className="empty">{L("Aucun article.", "\u0644\u0627 \u062A\u0648\u062C\u062F")}</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t("col_product_name")}</th>
                <th></th>
                <th style={{ background: fondSite, color: texteSite }}>
                  {motSite} {L("(site)", "")}
                </th>
                <th style={{ background: fondMagasin, color: texteMagasin }}>{motMagasin}</th>
                <th>{t("col_price")}</th>
                <th>{t("col_actions")}</th>
              </tr>
            </thead>
            <tbody>
              {groupes.map((g) => {
                const site = g.items.reduce((s, x) => s + (x.quantite || 0), 0);
                const magasin = g.items.reduce((s, x) => s + (x.quantiteMagasin || 0), 0);
                const ouvert = !!ouverts[g.cle];

                const tri = [...g.items].sort((a, b) => {
                  const c = (a.couleur || "").localeCompare(b.couleur || "");
                  if (c !== 0) return c;
                  const rt = rangTaille(a.taille) - rangTaille(b.taille);
                  if (rt !== 0) return rt;
                  return (a.taille || "").localeCompare(b.taille || "");
                });

                return (
                  <Fragment key={g.cle}>
                    <tr>
                      <td style={{ fontWeight: 600 }}>
                        {g.nom}
                        {g.local && (
                          <span
                            style={{
                              ...pastille,
                              background: "#fef3c7",
                              color: "#92400e",
                              marginInlineStart: 8,
                            }}
                          >
                            {motAutres}
                          </span>
                        )}
                      </td>
                      <td></td>
                      <td style={{ background: fondSite, color: texteSite, fontWeight: 700 }}>
                        {site}
                      </td>
                      <td style={{ background: fondMagasin, color: texteMagasin, fontWeight: 700 }}>
                        {magasin}
                      </td>
                      <td></td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <button
                          type="button"
                          className="btn-link"
                          onClick={() => setOuverts({ ...ouverts, [g.cle]: !ouvert })}
                        >
                          {ouvert
                            ? L("Masquer", "\u0625\u062E\u0641\u0627\u0621")
                            : L("Voir", "\u0639\u0631\u0636")}
                        </button>
                        {admin && (
                          <button
                            type="button"
                            className="btn-link danger"
                            onClick={() => supprimerArticle(g)}
                            style={{ marginInlineStart: 10 }}
                          >
                            {t("delete")}
                          </button>
                        )}
                      </td>
                    </tr>

                    {ouvert && (
                      <tr style={{ background: "#fdf6f7" }}>
                        <td style={{ fontSize: 11, fontWeight: 700, paddingInlineStart: 30 }}>
                          {motCouleur}
                        </td>
                        <td style={{ fontSize: 11, fontWeight: 700 }}>{motTaille}</td>
                        <td
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            background: fondSite,
                            color: texteSite,
                          }}
                        >
                          {motSite}
                        </td>
                        <td
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            background: fondMagasin,
                            color: texteMagasin,
                          }}
                        >
                          {motMagasin}
                        </td>
                        <td style={{ fontSize: 11, fontWeight: 700 }}>{t("col_price")}</td>
                        <td></td>
                      </tr>
                    )}

                    {ouvert &&
                      tri.map((p, i) => {
                        const nouvelleCouleur = i === 0 || tri[i - 1].couleur !== p.couleur;
                        const ct = couleurTaille(p.taille);
                        const modifies = champsModifies(p);
                        const enAttente = modifies.length > 0;
                        const vientDEtreSauve = Boolean(succes[p.id]);
                        const occupe = enCours === p.id;

                        const fondLigne = vientDEtreSauve
                          ? fondEnregistre
                          : enAttente
                          ? fondModifie
                          : "#fafafa";

                        return (
                          <tr key={p.id} style={{ background: fondLigne }}>
                            <td style={{ paddingInlineStart: 30 }}>
                              {nouvelleCouleur && p.couleur ? (
                                <span style={{ ...pastille, background: "#e0e7ff", color: "#3730a3" }}>
                                  {p.couleur}
                                </span>
                              ) : null}
                            </td>
                            <td>
                              {p.taille ? (
                                <span style={{ ...pastille, background: ct.fond, color: ct.texte }}>
                                  {p.taille}
                                </span>
                              ) : (
                                <span style={{ color: "#94a3b8" }}>-</span>
                              )}
                            </td>

                            <td style={{ background: fondSite }}>
                              <span style={{ fontWeight: 700, color: texteSite }}>
                                {p.quantite || 0}
                              </span>
                            </td>

                            <td style={{ background: enAttente ? fondModifie : fondMagasin }}>
                              {peutModifier ? (
                                <input
                                  type="number"
                                  value={valeur(p, "quantiteMagasin", p.quantiteMagasin)}
                                  onChange={(e) => saisir(p, "quantiteMagasin", e.target.value)}
                                  className="notes-input"
                                  style={{
                                    width: 70,
                                    fontWeight: 700,
                                    color: enAttente ? "#b45309" : texteMagasin,
                                    borderColor: enAttente ? "#b45309" : undefined,
                                  }}
                                />
                              ) : (
                                <span style={{ fontWeight: 700, color: texteMagasin }}>
                                  {p.quantiteMagasin || 0}
                                </span>
                              )}
                            </td>

                            <td>
                              {admin ? (
                                <input
                                  type="number"
                                  value={valeur(p, "prix", p.prix)}
                                  onChange={(e) => saisir(p, "prix", e.target.value)}
                                  className="notes-input"
                                  style={{ width: 75 }}
                                />
                              ) : (
                                <span>{p.prix ?? "-"}</span>
                              )}
                            </td>

                            <td style={{ whiteSpace: "nowrap" }}>
                              {enAttente && (
                                <Fragment>
                                  <button
                                    type="button"
                                    style={boutonEnregistrer}
                                    onClick={() => enregistrer(p)}
                                    disabled={occupe}
                                  >
                                    {occupe ? "..." : L("Enregistrer", "\u062D\u0641\u0638")}
                                  </button>
                                  <button
                                    type="button"
                                    style={boutonAnnuler}
                                    onClick={() => oublier(p, ["quantiteMagasin", "prix"])}
                                    disabled={occupe}
                                  >
                                    {L("Annuler", "\u0625\u0644\u063A\u0627\u0621")}
                                  </button>
                                </Fragment>
                              )}

                              {vientDEtreSauve && !enAttente && (
                                <span style={{ ...pastille, background: "#a7f3d0", color: "#065f46" }}>
                                  {L("Enregistr\u00E9", "\u062A\u0645")}
                                </span>
                              )}

                              {admin && !enAttente && !vientDEtreSauve && (
                                <button
                                  className="btn-link danger"
                                  onClick={() => supprimerLigne(p)}
                                  type="button"
                                >
                                  {t("delete")}
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
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
