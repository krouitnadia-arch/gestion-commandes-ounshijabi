"use client";

import { useEffect, useState, FormEvent } from "react";
import { useLang } from "./LangProvider";

type Produit = {
  id: string;
  wooId: number | null;
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

const FORMULAIRE_VIDE = {
  nom: "",
  categorie: "",
  couleur: "",
  taille: "",
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

export default function StockClient() {
  const { t, lang } = useLang();
  const L = (fr: string, ar: string) => (lang === "ar" ? ar : fr);

  const [produits, setProduits] = useState<Produit[]>([]);
  const [loading, setLoading] = useState(true);
  const [importEnCours, setImportEnCours] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [recherche, setRecherche] = useState("");
  const [categorie, setCategorie] = useState("");
  const [form, setForm] = useState(FORMULAIRE_VIDE);

  async function load() {
    const res = await fetch("/api/stock");
    if (res.ok) setProduits(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function importerDepuisSite() {
    setImportEnCours(true);
    setMessage(null);

    let page: number | null = 1;
    let total = 0;

    try {
      while (page && page < 300) {
        const res = await fetch(`/api/stock/sync?page=${page}`, { method: "POST" });
        const data = await res.json();

        if (!res.ok) {
          setMessage(data.error || "Erreur");
          break;
        }

        total += data.importes;
        setMessage(L(`${total} produits importes...`, `${total} \u0645\u0646\u062A\u062C`));
        page = data.pageSuivante;
      }

      setMessage(L(`Import termine : ${total} produits`, `\u0627\u0646\u062A\u0647\u0649 : ${total}`));
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

    const res = await fetch(`/api/stock/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corps),
    });

    const data = await res.json();
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

  async function supprimer(p: Produit) {
    const ok = window.confirm(L(`Supprimer ${p.nom} ?`, `\u062D\u0630\u0641 ${p.nom} \u061F`));
    if (!ok) return;
    await fetch(`/api/stock/${p.id}`, { method: "DELETE" });
    load();
  }

  const categories = Array.from(
    new Set(produits.map((p) => p.categorie).filter(Boolean) as string[])
  ).sort();

  const r = recherche.toLowerCase().trim();

  const liste = produits.filter((p) => {
    if (categorie && p.categorie !== categorie) return false;
    if (!r) return true;
    const texte = [p.nom, p.couleur, p.taille, p.sku, p.reference]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return texte.includes(r);
  });

  const alertes = liste.filter((p) => p.quantite <= p.seuilAlerte).length;

  return (
    <div>
      <div className="page-header">
        <h1>{t("stock_title")}</h1>
        <button className="btn-primary" onClick={importerDepuisSite} disabled={importEnCours}>
          {importEnCours
            ? L("Import en cours...", "\u062C\u0627\u0631\u064D \u0627\u0644\u0627\u0633\u062A\u064A\u0631\u0627\u062F")
            : L("Importer depuis le site", "\u0627\u0633\u062A\u064A\u0631\u0627\u062F \u0645\u0646 \u0627\u0644\u0645\u0648\u0642\u0639")}
        </button>
      </div>

      {message && <p className="sync-msg">{message}</p>}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        <input
          placeholder={L("Rechercher un produit, couleur, taille...", "\u0628\u062D\u062B")}
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          className="notes-input"
          style={{ width: 260 }}
        />
        <button
          type="button"
          className={categorie === "" ? "btn-primary" : "btn-secondary"}
          onClick={() => setCategorie("")}
          style={{ padding: "6px 14px", fontSize: 13 }}
        >
          {L("Toutes", "\u0627\u0644\u0643\u0644")} ({produits.length})
        </button>
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            className={categorie === c ? "btn-primary" : "btn-secondary"}
            onClick={() => setCategorie(c)}
            style={{ padding: "6px 14px", fontSize: 13 }}
          >
            {c} ({produits.filter((p) => p.categorie === c).length})
          </button>
        ))}
      </div>

      {alertes > 0 && (
        <p className="sync-msg" style={{ color: "#b45309", fontWeight: 700 }}>
          {L(`${alertes} article(s) en stock faible`, `${alertes} \u0645\u062E\u0632\u0648\u0646 \u0645\u0646\u062E\u0641\u0636`)}
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
      ) : liste.length === 0 ? (
        <p className="empty">
          {L(
            "Aucun produit. Cliquez sur Importer depuis le site.",
            "\u0644\u0627 \u062A\u0648\u062C\u062F \u0645\u0646\u062A\u062C\u0627\u062A"
          )}
        </p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t("col_product_name")}</th>
                <th>{L("Categorie", "\u0627\u0644\u0641\u0626\u0629")}</th>
                <th>{L("Couleur", "\u0627\u0644\u0644\u0648\u0646")}</th>
                <th>{L("Taille", "\u0627\u0644\u0645\u0642\u0627\u0633")}</th>
                <th>{t("col_quantity")}</th>
                <th>{t("col_alert")}</th>
                <th>{t("col_price")}</th>
                <th>{L("Site", "\u0627\u0644\u0645\u0648\u0642\u0639")}</th>
                <th>{t("col_actions")}</th>
              </tr>
            </thead>
            <tbody>
              {liste.map((p) => {
                const faible = p.quantite <= p.seuilAlerte;

                return (
                  <tr key={p.id} style={{ background: faible ? "#fff7ed" : undefined }}>
                    <td>{p.nom}</td>
                    <td>{p.categorie || "-"}</td>
                    <td>
                      {p.couleur ? (
                        <span style={{ ...pastille, background: "#e0e7ff", color: "#3730a3" }}>
                          {p.couleur}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>
                      {p.taille ? (
                        <span style={{ ...pastille, background: "#fce7f3", color: "#9d174d" }}>
                          {p.taille}
                        </span>
                      ) : (
                        "-"
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
                      {faible && (
                        <div style={{ fontSize: 10, color: "#b45309", fontWeight: 700 }}>
                          {t("low_stock")}
                        </div>
                      )}
                    </td>
                    <td>
                      <input
                        type="number"
                        defaultValue={p.seuilAlerte}
                        onBlur={(e) => modifier(p, "seuilAlerte", e.target.value)}
                        className="notes-input"
                        style={{ width: 65 }}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        defaultValue={p.prix ?? ""}
                        onBlur={(e) => modifier(p, "prix", e.target.value)}
                        className="notes-input"
                        style={{ width: 80 }}
                      />
                    </td>
                    <td>
                      {p.wooId ? (
                        <span style={{ ...pastille, background: "#dcfce7", color: "#166534" }}>
                          {L("Lie", "\u0645\u0631\u062A\u0628\u0637")}
                        </span>
                      ) : (
                        <span style={{ ...pastille, background: "#e2e8f0", color: "#475569" }}>
                          {L("Local", "\u0645\u062D\u0644\u064A")}
                        </span>
                      )}
                    </td>
                    <td>
                      <button className="btn-link danger" onClick={() => supprimer(p)} type="button">
                        {t("delete")}
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
