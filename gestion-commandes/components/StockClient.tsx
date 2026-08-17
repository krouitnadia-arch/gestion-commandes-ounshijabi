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

const FORMULAIRE_VIDE = {
  nom: "",
  quantite: "0",
  seuilAlerte: "5",
  prix: "",
};

const pastille = {
  display: "inline-block",
  padding: "3px 9px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 700,
  whiteSpace: "nowrap",
} as const;

const ORDRE_TAILLES = ["xs", "s", "m", "l", "xl", "xxl", "xxxl"];

function rangTaille(t: string | null) {
  const v = (t || "").toLowerCase().trim();
  const i = ORDRE_TAILLES.indexOf(v);
  return i === -1 ? 99 : i;
}

export default function StockClient() {
  const { t, lang } = useLang();
  const L = (fr: string, ar: string) => (lang === "ar" ? ar : fr);

  const [produits, setProduits] = useState<Produit[]>([]);
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

        if (data?.pageSuivante) {
          page = Number(data.pageSuivante);
        } else {
          continuer = false;
        }
      }

      setMessage(L(`Import termine : ${total} lignes`, `\u0627\u0646\u062A\u0647\u0649 : ${total}`));
      await load();
    } catch (e: any) {
      setMessage(e?.message ?? "Erreur de connexion");
    } finally {
      setImportEnCours(false);
    }
  }

  async function modifier(p: Produit, champ: string, valeur: string) {
    const corps: Record<string, unknown> = {};
    corps[champ] = ["quantite", "seuilAlerte", "prix"].includes(champ) ? Number(valeur) : valeur;

    const res: Response = await fetch(`/api/stock/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corps),
    });

    const data: any = await res.json();
    if (data?.avertissement) setMessage(data.avertissement);
    load();
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
        seuilAlerte: Number(form.seuilAlerte),
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
    const ok = window.confirm(
      L(`Supprimer "${g.nom}" et ses ${g.items.length} variante(s) ?`, `\u062D\u0630\u0641 "${g.nom}"`)
    );
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
  const alertes = filtres.filter((p) => p.quantite <= p.seuilAlerte).length;

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

      {alertes > 0 && (
        <p className="sync-msg" style={{ color: "#b45309", fontWeight: 700 }}>
          {L(`${alertes} variante(s) en stock faible`, `${alertes}`)}
        </p>
      )}

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
          placeholder={t("col_alert")}
          value={form.seuilAlerte}
          onChange={(e) => setForm({ ...form, seuilAlerte: e.target.value })}
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
        <p className="empty">
          {L("Aucun article. Cliquez sur Importer depuis le site.", "\u0644\u0627 \u062A\u0648\u062C\u062F")}
        </p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t("col_product_name")}</th>
                <th>{L("Categorie", "\u0627\u0644\u0641\u0626\u0629")}</th>
                <th>{L("Stock total", "\u0627\u0644\u0645\u062C\u0645\u0648\u0639")}</th>
                <th>{L("Variantes", "\u0627\u0644\u0623\u0646\u0648\u0627\u0639")}</th>
                <th>{t("col_actions")}</th>
              </tr>
            </thead>
            <tbody>
              {groupes.map((g) => {
                const total = g.items.reduce((s, x) => s + (x.quantite || 0), 0);
                const faible = g.items.some((x) => x.quantite <= x.seuilAlerte);
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
                    <tr style={{ background: faible ? "#fff7ed" : undefined }}>
                      <td style={{ fontWeight: 600 }}>{g.nom}</td>
                      <td>{g.categorie || "-"}</td>
                      <td style={{ fontWeight: 700 }}>
                        {total}
                        {faible && (
                          <div style={{ fontSize: 10, color: "#b45309", fontWeight: 700 }}>
                            {t("low_stock")}
                          </div>
                        )}
                      </td>
                      <td>{g.items.length}</td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <button
                          type="button"
                          className="btn-link"
                          onClick={() => setOuverts({ ...ouverts, [g.cle]: !ouvert })}
                        >
                          {ouvert
                            ? L("Masquer", "\u0625\u062E\u0641\u0627\u0621")
                            : L("Voir les variantes", "\u0639\u0631\u0636")}
                        </button>
                        <button
                          type="button"
                          className="btn-link danger"
                          onClick={() => supprimerArticle(g)}
                          style={{ marginInlineStart: 12 }}
                        >
                          {t("delete")}
                        </button>
                      </td>
                    </tr>

                    {ouvert && (
                      <tr style={{ background: "#eef2ff" }}>
                        <td style={{ fontSize: 11, fontWeight: 700, paddingInlineStart: 30 }}>
                          {L("Couleur", "\u0627\u0644\u0644\u0648\u0646")}
                        </td>
                        <td style={{ fontSize: 11, fontWeight: 700 }}>
                          {L("Taille", "\u0627\u0644\u0645\u0642\u0627\u0633")}
                        </td>
                        <td style={{ fontSize: 11, fontWeight: 700 }}>{t("col_quantity")}</td>
                        <td style={{ fontSize: 11, fontWeight: 700 }}>{t("col_alert")}</td>
                        <td style={{ fontSize: 11, fontWeight: 700 }}>{t("col_price")}</td>
                      </tr>
                    )}

                    {ouvert &&
                      tri.map((p, i) => {
                        const nouvelleCouleur = i === 0 || tri[i - 1].couleur !== p.couleur;

                        return (
                          <tr key={p.id} style={{ background: "#f8fafc" }}>
                            <td style={{ paddingInlineStart: 30 }}>
                              {nouvelleCouleur ? (
                                p.couleur ? (
                                  <span
                                    style={{ ...pastille, background: "#e0e7ff", color: "#3730a3" }}
                                  >
                                    {p.couleur}
                                  </span>
                                ) : (
                                  <span style={{ color: "#94a3b8" }}>-</span>
                                )
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
                            <td>
                              <input
                                type="number"
                                defaultValue={p.quantite}
                                onBlur={(e) => modifier(p, "quantite", e.target.value)}
                                className="notes-input"
                                style={{ width: 75, fontWeight: 700 }}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                defaultValue={p.seuilAlerte}
                                onBlur={(e) => modifier(p, "seuilAlerte", e.target.value)}
                                className="notes-input"
                                style={{ width: 60 }}
                              />
                            </td>
                            <td style={{ whiteSpace: "nowrap" }}>
                              <input
                                type="number"
                                defaultValue={p.prix ?? ""}
                                onBlur={(e) => modifier(p, "prix", e.target.value)}
                                className="notes-input"
                                style={{ width: 75 }}
                              />
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
