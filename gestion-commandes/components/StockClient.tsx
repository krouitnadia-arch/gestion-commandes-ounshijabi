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

const boutonFusion = {
  background: "#0369a1",
  color: "white",
  border: "none",
  padding: "5px 10px",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 11,
  fontWeight: 700,
  whiteSpace: "nowrap",
} as const;

const petitBouton = { padding: "6px 12px", fontSize: 12 } as const;

const fondSite = "#ecfdf5";
const texteSite = "#166534";
const fondMagasin = "#eff6ff";
const texteMagasin = "#0369a1";

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

export default function StockClient() {
  const { t, lang } = useLang();
  const ar = lang === "ar";
  const L = (fr: string, arabe: string) => (ar ? arabe : fr);

  const motSite = L("Site", "\u0627\u0644\u0645\u0648\u0642\u0639");
  const motMagasin = L("Magasin", "\u0627\u0644\u0645\u062A\u062C\u0631");
  const motTotal = L("Total", "\u0627\u0644\u0645\u062C\u0645\u0648\u0639");
  const motCouleur = L("Couleur", "\u0627\u0644\u0644\u0648\u0646");
  const motTaille = L("Taille", "\u0627\u0644\u0645\u0642\u0627\u0633");
  const motFusion = L("Fusionner", "\u062F\u0645\u062C");
  const motAutres = L("Autres articles", "\u0645\u0646\u062A\u062C\u0627\u062A \u0623\u062E\u0631\u0649");

  const [produits, setProduits] = useState<Produit[]>([]);
  const [edits, setEdits] = useState<{ [cle: string]: string }>({});
  const [loading, setLoading] = useState(true);
  const [importEnCours, setImportEnCours] = useState(false);
  const [ajoutEnCours, setAjoutEnCours] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
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

  function valeur(p: Produit, champ: string, reelle: any) {
    const cle = `${p.id}-${champ}`;
    if (edits[cle] !== undefined) return edits[cle];
    return reelle === null || reelle === undefined ? "" : String(reelle);
  }

  function saisir(p: Produit, champ: string, v: string) {
    setEdits((e) => ({ ...e, [`${p.id}-${champ}`]: v }));
  }

  async function valider(p: Produit, champ: string) {
    const cle = `${p.id}-${champ}`;
    const v = edits[cle];
    if (v === undefined) return;

    const corps: Record<string, unknown> = {};
    corps[champ] = Number(v) || 0;

    const res: Response = await fetch(`/api/stock/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corps),
    });

    const data: any = await res.json();
    if (data?.avertissement) setMessage(data.avertissement);

    setEdits((e) => {
      const copie = { ...e };
      delete copie[cle];
      return copie;
    });

    await load();
  }

  async function importerDepuisSite() {
    setImportEnCours(true);
    setMessage(null);

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
          setMessage(data?.error || "Erreur");
          break;
        }

        total += Number(data?.importes) || 0;
        setMessage(L(`${total} lignes importees...`, `${total}`));

        if (data?.pageSuivante) page = Number(data.pageSuivante);
        else continuer = false;
      }

      setMessage(L(`Import termine : ${total} lignes`, `${total}`));
      await load();
    } catch (e: any) {
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
              quantite: Number(quantite) || 0,
              prix: prix ? Number(prix) : null,
              categorie: "Autres articles",
            }),
          });
          if (res.ok) creees++;
        }
      }

      setMessage(L(`${creees} variante(s) creee(s)`, `${creees}`));
      setCouleursListe([]);
      setCouleurSaisie("");
      setQuantite("0");
      await load();
    } catch (err: any) {
      setMessage(err?.message ?? "Erreur");
    } finally {
      setAjoutEnCours(false);
    }
  }

  async function fusionnerVariante(p: Produit) {
    const res: Response = await fetch(`/api/stock/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fusionner: true }),
    });

    const data: any = await res.json();
    if (data?.avertissement) setMessage(data.avertissement);

    setEdits({});
    await load();
  }

  async function fusionnerArticle(g: Groupe) {
    const ok = window.confirm(
      L(`Remettre tout le stock magasin de "${g.nom}" sur le site ?`, "\u062F\u0645\u062C \u061F")
    );
    if (!ok) return;

    const res: Response = await fetch("/api/stock/fusion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: g.items.map((x) => x.id) }),
    });

    const data: any = await res.json();

    if (data?.avertissements && data.avertissements.length > 0) {
      setMessage(data.avertissements.join(" | "));
    } else {
      setMessage(L(`${data?.fusionnees || 0} variante(s) fusionnee(s)`, `${data?.fusionnees || 0}`));
    }

    setEdits({});
    await load();
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
    const cle = p.parentId
      ? `p${p.parentId}`
      : p.wooId
      ? `s${p.wooId}`
      : `l${normaliser(p.nom)}`;

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

  return (
    <div>
      <div className="page-header">
        <h1>{t("stock_title")}</h1>
        <button className="btn-primary" onClick={importerDepuisSite} disabled={importEnCours}>
          {importEnCours
            ? L("Import en cours...", "\u062C\u0627\u0631\u064D")
            : L("Importer depuis le site", "\u0627\u0633\u062A\u064A\u0631\u0627\u062F")}
        </button>
      </div>

      {message && <p className="sync-msg">{message}</p>}

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
          {L("Toutes categories", "\u0643\u0644 \u0627\u0644\u0641\u0626\u0627\u062A")}
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

      <form
        onSubmit={ajouter}
        className="stock-form"
        style={{ flexDirection: "column", alignItems: "stretch" }}
      >
        <div style={{ fontWeight: 700, fontSize: 13 }}>
          {L("Ajouter un article dans Autres articles", "\u0625\u0636\u0627\u0641\u0629 \u0645\u0646\u062A\u062C")}
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
            placeholder={L("Quantite par variante", "\u0627\u0644\u0643\u0645\u064A\u0629")}
            value={quantite}
            onChange={(e) => setQuantite(e.target.value)}
            style={{ width: 160 }}
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
            placeholder={L("Ecrivez la couleur, puis Ajouter", "\u0627\u0643\u062A\u0628 \u0627\u0644\u0644\u0648\u0646")}
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
          <button type="button" className="btn-secondary" onClick={ajouterCouleur} style={petitBouton}>
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
          <button type="button" className="btn-secondary" onClick={ajouterTailleLibre} style={petitBouton}>
            +
          </button>
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button type="submit" className="btn-primary" disabled={ajoutEnCours || !nom.trim()}>
            {ajoutEnCours ? "..." : t("stock_add")}
          </button>
          <span style={{ fontSize: 12, color: "#64748b" }}>
            {L(`${nbVariantes} variante(s) seront creees`, `${nbVariantes}`)}
          </span>
        </div>
      </form>

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
                <th style={{ background: fondSite, color: texteSite }}>{motSite}</th>
                <th style={{ background: fondMagasin, color: texteMagasin }}>{motMagasin}</th>
                <th>{motTotal}</th>
                <th>{t("col_price")}</th>
                <th>{t("col_actions")}</th>
              </tr>
            </thead>
            <tbody>
              {groupes.map((g) => {
                const site = g.items.reduce((s, x) => s + (x.quantite || 0), 0);
                const magasin = g.items.reduce((s, x) => s + (x.quantiteMagasin || 0), 0);
                const total = site + magasin;
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
                      <td style={{ fontWeight: 700 }}>{total}</td>
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
                        {magasin > 0 && (
                          <button
                            type="button"
                            style={{ ...boutonFusion, marginInlineStart: 10 }}
                            onClick={() => fusionnerArticle(g)}
                          >
                            {motFusion}
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn-link danger"
                          onClick={() => supprimerArticle(g)}
                          style={{ marginInlineStart: 10 }}
                        >
                          {t("delete")}
                        </button>
                      </td>
                    </tr>

                    {ouvert && (
                      <tr style={{ background: "#f1f5f9" }}>
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
                        <td style={{ fontSize: 11, fontWeight: 700 }}>{motTotal}</td>
                        <td style={{ fontSize: 11, fontWeight: 700 }}>{t("col_price")}</td>
                        <td></td>
                      </tr>
                    )}

                    {ouvert &&
                      tri.map((p, i) => {
                        const nouvelleCouleur = i === 0 || tri[i - 1].couleur !== p.couleur;
                        const totalLigne = (p.quantite || 0) + (p.quantiteMagasin || 0);
                        const ct = couleurTaille(p.taille);

                        return (
                          <tr key={p.id} style={{ background: "#fafafa" }}>
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
                              <input
                                type="number"
                                value={valeur(p, "quantite", p.quantite)}
                                onChange={(e) => saisir(p, "quantite", e.target.value)}
                                onBlur={() => valider(p, "quantite")}
                                className="notes-input"
                                style={{ width: 70, fontWeight: 700, color: texteSite }}
                              />
                            </td>
                            <td style={{ background: fondMagasin }}>
                              <input
                                type="number"
                                value={valeur(p, "quantiteMagasin", p.quantiteMagasin)}
                                onChange={(e) => saisir(p, "quantiteMagasin", e.target.value)}
                                onBlur={() => valider(p, "quantiteMagasin")}
                                className="notes-input"
                                style={{ width: 70, fontWeight: 700, color: texteMagasin }}
                              />
                            </td>
                            <td style={{ fontWeight: 700 }}>{totalLigne}</td>
                            <td>
                              <input
                                type="number"
                                value={valeur(p, "prix", p.prix)}
                                onChange={(e) => saisir(p, "prix", e.target.value)}
                                onBlur={() => valider(p, "prix")}
                                className="notes-input"
                                style={{ width: 75 }}
                              />
                            </td>
                            <td style={{ whiteSpace: "nowrap" }}>
                              {(p.quantiteMagasin || 0) > 0 && (
                                <button
                                  type="button"
                                  style={boutonFusion}
                                  onClick={() => fusionnerVariante(p)}
                                >
                                  {motFusion}
                                </button>
                              )}
                              <button
                                className="btn-link danger"
                                onClick={() => supprimerLigne(p)}
                                type="button"
                                style={{ marginInlineStart: 8 }}
                              >
                                {t("delete")}
                              </button>
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
