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
  items: Produit[];
};

const FORMULAIRE_VIDE = { nom: "", quantite: "0", prix: "" };

const pastille = {
  display: "inline-block",
  padding: "3px 9px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 700,
  whiteSpace: "nowrap",
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

const fondSite = "#ecfdf5";
const texteSite = "#166534";
const fondMagasin = "#eff6ff";
const texteMagasin = "#0369a1";

const ORDRE_TAILLES = ["xs", "s", "m", "l", "xl", "xxl", "xxxl"];

function rangTaille(t: string | null) {
  const v = (t || "").toLowerCase().trim();
  const i = ORDRE_TAILLES.indexOf(v);
  return i === -1 ? 99 : i;
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

  const [produits, setProduits] = useState<Produit[]>([]);
  const [edits, setEdits] = useState<{ [cle: string]: string }>({});
  const [loading, setLoading] = useState(true);
  const [importEnCours, setImportEnCours] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [recherche, setRecherche] = useState("");
  const [categorie, setCategorie] = useState("");
  const [ouverts, setOuverts] = useState<{ [cle: string]: boolean }>({});
  const [form, setForm] = useState(FORMULAIRE_VIDE);

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

  async function ajouter(e: FormEvent) {
    e.preventDefault();
    if (!form.nom.trim()) return;

    await fetch("/api/stock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nom: form.nom,
        quantite: Number(form.quantite),
        prix: form.prix ? Number(form.prix) : null,
      }),
    });

    setForm(FORMULAIRE_VIDE);
    load();
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
    const cle = p.parentId ? `p${p.parentId}` : p.wooId ? `s${p.wooId}` : `l${p.id}`;
    const ordre = p.parentId || p.wooId || 999999999;

    if (!parCle.has(cle)) {
      parCle.set(cle, { cle, nom: p.nom, categorie: p.categorie, ordre, items: [] });
    }
    parCle.get(cle)!.items.push(p);
  }

  const groupes = Array.from(parCle.values()).sort((a, b) => b.ordre - a.ordre);

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

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        <input
          placeholder={L("Rechercher un article...", "\u0628\u062D\u062B")}
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          className="notes-input"
          style={{ width: 250 }}
        />
        <button
          type="button"
          className={categorie === "" ? "btn-primary" : "btn-secondary"}
          onClick={() => setCategorie("")}
          style={{ padding: "6px 14px", fontSize: 13 }}
        >
          {L("Toutes", "\u0627\u0644\u0643\u0644")}
        </button>
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            className={categorie === c ? "btn-primary" : "btn-secondary"}
            onClick={() => setCategorie(c)}
            style={{ padding: "6px 14px", fontSize: 13 }}
          >
            {c}
          </button>
        ))}
      </div>

      <form onSubmit={ajouter} className="stock-form">
        <input
          placeholder={t("col_product_name")}
          value={form.nom}
          onChange={(e) => setForm({ ...form, nom: e.target.value })}
        />
        <input
          type="number"
          placeholder={t("col_quantity")}
          value={form.quantite}
          onChange={(e) => setForm({ ...form, quantite: e.target.value })}
        />
        <input
          type="number"
          placeholder={t("col_price")}
          value={form.prix}
          onChange={(e) => setForm({ ...form, prix: e.target.value })}
        />
        <button type="submit" className="btn-primary">
          {t("stock_add")}
        </button>
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
                      <td style={{ fontWeight: 600 }}>{g.nom}</td>
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
                                <span style={{ ...pastille, background: "#fce7f3", color: "#9d174d" }}>
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
