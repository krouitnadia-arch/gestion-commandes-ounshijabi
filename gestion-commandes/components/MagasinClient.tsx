"use client";

import { useEffect, useState, FormEvent } from "react";
import { useLang } from "./LangProvider";
import StockClient from "./StockClient";

type Produit = {
  id: string;
  nom: string;
  couleur: string | null;
  taille: string | null;
  quantite: number;
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

type Vente = {
  id: string;
  date: string;
  clientNom: string | null;
  clientTelephone: string | null;
  lignes: Ligne[];
  total: number;
  avance: number;
  reste: number;
  vendeur: string | null;
};

const pastille = {
  display: "inline-block",
  padding: "2px 8px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 700,
  whiteSpace: "nowrap",
} as const;

export default function MagasinClient() {
  const { t, lang } = useLang();
  const L = (fr: string, ar: string) => (lang === "ar" ? ar : fr);

  const [onglet, setOnglet] = useState<"ventes" | "stock">("ventes");
  const [produits, setProduits] = useState<Produit[]>([]);
  const [ventes, setVentes] = useState<Vente[]>([]);
  const [recherche, setRecherche] = useState("");
  const [panier, setPanier] = useState<Ligne[]>([]);
  const [clientNom, setClientNom] = useState("");
  const [clientTelephone, setClientTelephone] = useState("");
  const [avance, setAvance] = useState("0");
  const [message, setMessage] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  async function chargerProduits() {
    const res: Response = await fetch("/api/stock");
    if (res.ok) setProduits(await res.json());
  }

  async function chargerVentes() {
    const res: Response = await fetch("/api/ventes");
    if (res.ok) setVentes(await res.json());
  }

  useEffect(() => {
    chargerProduits();
    chargerVentes();
  }, []);

  const r = recherche.toLowerCase().trim();

  const resultats = r.length < 2
    ? []
    : produits
        .filter((p) => {
          const texte = [p.nom, p.couleur, p.taille].filter(Boolean).join(" ").toLowerCase();
          return texte.includes(r);
        })
        .slice(0, 15);

  function ajouterAuPanier(p: Produit) {
    const existe = panier.find((l) => l.productId === p.id);

    if (existe) {
      setPanier(
        panier.map((l) =>
          l.productId === p.id
            ? { ...l, quantite: l.quantite + 1, montant: l.montant + (p.prix || 0) }
            : l
        )
      );
    } else {
      setPanier([
        ...panier,
        {
          productId: p.id,
          nom: p.nom,
          couleur: p.couleur,
          taille: p.taille,
          quantite: 1,
          montant: p.prix || 0,
        },
      ]);
    }
    setRecherche("");
  }

  function majLigne(productId: string, champ: "quantite" | "montant", valeur: string) {
    setPanier(
      panier.map((l) =>
        l.productId === productId ? { ...l, [champ]: Number(valeur) || 0 } : l
      )
    );
  }

  function retirer(productId: string) {
    setPanier(panier.filter((l) => l.productId !== productId));
  }

  const total = panier.reduce((s, l) => s + (l.montant || 0), 0);
  const avanceNum = Number(avance) || 0;
  const reste = Math.max(0, total - avanceNum);

  async function enregistrer(e: FormEvent) {
    e.preventDefault();
    if (panier.length === 0) return;

    setEnvoi(true);
    setMessage(null);

    try {
      const res: Response = await fetch("/api/ventes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientNom,
          clientTelephone,
          avance: avanceNum,
          lignes: panier.map((l) => ({
            productId: l.productId,
            quantite: l.quantite,
            montant: l.montant,
          })),
        }),
      });

      const data: any = await res.json();

      if (res.ok) {
        setMessage(L("Vente enregistree", "\u062A\u0645 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u0628\u064A\u0639"));
        if (data?.avertissements?.length > 0) setMessage(data.avertissements.join(" | "));
        setPanier([]);
        setClientNom("");
        setClientTelephone("");
        setAvance("0");
        chargerProduits();
        chargerVentes();
      } else {
        setMessage(data?.error || "Erreur");
      }
    } catch (err: any) {
      setMessage(err?.message ?? "Erreur de connexion");
    } finally {
      setEnvoi(false);
    }
  }

  async function annuler(v: Vente) {
    const ok = window.confirm(
      L("Annuler cette vente et remettre le stock ?", "\u0625\u0644\u063A\u0627\u0621 \u0627\u0644\u0628\u064A\u0639 \u061F")
    );
    if (!ok) return;

    await fetch(`/api/ventes?id=${v.id}`, { method: "DELETE" });
    chargerProduits();
    chargerVentes();
  }

  return (
    <div>
      <div className="page-header">
        <h1>{L("Magasin", "\u0627\u0644\u0645\u062A\u062C\u0631")}</h1>
      <h1>{L("Magasin", "\u0627\u0644\u0645\u062A\u062C\u0631")}</h1>

      <div className="lang-switcher" style={{ marginBottom: 16 }}>
        <button
          type="button"
          className={onglet === "ventes" ? "active" : ""}
          onClick={() => setOnglet("ventes")}
          style={{ padding: "8px 16px", fontSize: 14 }}
        >
          {L("Ventes", "\u0627\u0644\u0645\u0628\u064A\u0639\u0627\u062A")}
        </button>
        <button
          type="button"
          className={onglet === "stock" ? "active" : ""}
          onClick={() => setOnglet("stock")}
          style={{ padding: "8px 16px", fontSize: 14 }}
        >
          {L("Stock", "\u0627\u0644\u0645\u062E\u0632\u0648\u0646")}
        </button>
      </div>

      {onglet === "stock" ? (
        <StockClient />
      ) : (
        <div>
          {message && <p className="sync-msg">{message}</p>}

          <form onSubmit={enregistrer}>
            <div className="stock-form" style={{ flexDirection: "column", alignItems: "stretch" }}>
              <input
                placeholder={L("Rechercher un article (3 lettres)...", "\u0628\u062D\u062B")}
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                style={{ width: "100%" }}
              />

              {resultats.length > 0 && (
                <div
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: 8,
                    maxHeight: 220,
                    overflowY: "auto",
                    background: "white",
                  }}
                >
                  {resultats.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => ajouterAuPanier(p)}
                      style={{
                        display: "block",
                        width: "100%",
                        textAlign: "start",
                        border: "none",
                        borderBottom: "1px solid #f1f5f9",
                        background: "transparent",
                        padding: "8px 10px",
                        cursor: "pointer",
                        fontSize: 13,
                      }}
                    >
                      <strong>{p.nom}</strong>
                      {p.couleur ? ` — ${p.couleur}` : ""}
                      {p.taille ? ` — ${p.taille}` : ""}
                      {" · "}
                      <span style={{ color: p.quantite > 0 ? "#166534" : "#b91c1c" }}>
                        {L("stock", "\u0627\u0644\u0645\u062E\u0632\u0648\u0646")} {p.quantite}
                      </span>
                      {p.prix ? ` · ${p.prix}` : ""}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {panier.length > 0 && (
              <div className="table-wrap" style={{ marginBottom: 14 }}>
                <table>
                  <thead>
                    <tr>
                      <th>{L("Article", "\u0627\u0644\u0645\u0646\u062A\u062C")}</th>
                      <th>{L("Couleur", "\u0627\u0644\u0644\u0648\u0646")}</th>
                      <th>{L("Taille", "\u0627\u0644\u0645\u0642\u0627\u0633")}</th>
                      <th>{L("Quantite", "\u0627\u0644\u0643\u0645\u064A\u0629")}</th>
                      <th>{L("Montant", "\u0627\u0644\u0645\u0628\u0644\u063A")}</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {panier.map((l) => (
                      <tr key={l.productId}>
                        <td>{l.nom}</td>
                        <td>
                          {l.couleur ? (
                            <span style={{ ...pastille, background: "#e0e7ff", color: "#3730a3" }}>
                              {l.couleur}
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td>
                          {l.taille ? (
                            <span style={{ ...pastille, background: "#fce7f3", color: "#9d174d" }}>
                              {l.taille}
                            </span>
                          ) : (
                            "-"
                          )}
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
                            onClick={() => retirer(l.productId)}
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
                placeholder={L("Nom de la cliente", "\u0627\u0633\u0645 \u0627\u0644\u0632\u0628\u0648\u0646\u0629")}
                value={clientNom}
                onChange={(e) => setClientNom(e.target.value)}
              />
              <input
                placeholder={L("Telephone", "\u0627\u0644\u0647\u0627\u062A\u0641")}
                value={clientTelephone}
                onChange={(e) => setClientTelephone(e.target.value)}
              />
              <input
                type="number"
                placeholder={L("Avance", "\u0627\u0644\u062A\u0633\u0628\u064A\u0642")}
                value={avance}
                onChange={(e) => setAvance(e.target.value)}
              />
              <div style={{ display: "flex", alignItems: "center", gap: 14, fontWeight: 700 }}>
                <span>
                  {L("Total", "\u0627\u0644\u0645\u062C\u0645\u0648\u0639")} : {total}
                </span>
                <span style={{ color: reste > 0 ? "#b45309" : "#166534" }}>
                  {L("Reste", "\u0627\u0644\u0628\u0627\u0642\u064A")} : {reste}
                </span>
              </div>
              <button type="submit" className="btn-primary" disabled={envoi || panier.length === 0}>
                {envoi
                  ? L("Enregistrement...", "\u062C\u0627\u0631\u064D")
                  : L("Enregistrer la vente", "\u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u0628\u064A\u0639")}
              </button>
            </div>
          </form>

          <h2 style={{ fontSize: 16, marginTop: 22 }}>
            {L("Ventes enregistrees", "\u0627\u0644\u0645\u0628\u064A\u0639\u0627\u062A")}
          </h2>

          {ventes.length === 0 ? (
            <p className="empty">{L("Aucune vente", "\u0644\u0627 \u062A\u0648\u062C\u062F")}</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{t("col_date")}</th>
                    <th>{L("Article", "\u0627\u0644\u0645\u0646\u062A\u062C")}</th>
                    <th>{L("Couleur", "\u0627\u0644\u0644\u0648\u0646")}</th>
