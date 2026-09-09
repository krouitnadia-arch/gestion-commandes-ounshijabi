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
  disponible: number;
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

type Charge = {
  id: string;
  date: string;
  libelle: string;
  montant: number;
  agent: string | null;
};

const pastille = {
  display: "inline-block",
  padding: "2px 8px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 700,
  whiteSpace: "nowrap",
} as const;

const TRENTE_JOURS = 30 * 24 * 60 * 60 * 1000;

function stockTotal(p: Produit) {
  return (p.quantite || 0) + (p.quantiteMagasin || 0);
}

export default function MagasinClient({ lectureSeule = false }: { lectureSeule?: boolean }) {
  const { t, lang } = useLang();
  const ar = lang === "ar";
  const L = (fr: string, arabe: string) => (ar ? arabe : fr);

  const titreMagasin = L("Magasin", "\u0627\u0644\u0645\u062A\u062C\u0631");
  const titreVentes = L("Ventes", "\u0627\u0644\u0645\u0628\u064A\u0639\u0627\u062A");
  const titreCharges = L("Charges", "\u0627\u0644\u0645\u0635\u0627\u0631\u064A\u0641");
  const titreStock = L("Stock", "\u0627\u0644\u0645\u062E\u0632\u0648\u0646");
  const motCouleur = L("Couleur", "\u0627\u0644\u0644\u0648\u0646");
  const motTaille = L("Taille", "\u0627\u0644\u0645\u0642\u0627\u0633");
  const motArticle = L("Article", "\u0627\u0644\u0645\u0646\u062A\u062C");
  const motQuantite = L("Quantit\u00E9", "\u0627\u0644\u0643\u0645\u064A\u0629");
  const motMontant = L("Montant", "\u0627\u0644\u0645\u0628\u0644\u063A");
  const motReste = L("Reste", "\u0627\u0644\u0628\u0627\u0642\u064A");
  const motPaye = L("Pay\u00E9", "\u0627\u0644\u0645\u062F\u0641\u0648\u0639");
  const motTotal = L("Total", "\u0627\u0644\u0645\u062C\u0645\u0648\u0639");
  const motCliente = L("Cliente", "\u0627\u0644\u0632\u0628\u0648\u0646\u0629");
  const motStock = L("Stock", "\u0627\u0644\u0645\u062E\u0632\u0648\u0646");
  const motRupture = L("Rupture", "\u0646\u0641\u0627\u062F");
  const motDate = L("Date", "\u0627\u0644\u062A\u0627\u0631\u064A\u062E");

  const [onglet, setOnglet] = useState<"ventes" | "charges" | "stock">("ventes");
  const [produits, setProduits] = useState<Produit[]>([]);
  const [ventes, setVentes] = useState<Vente[]>([]);
  const [charges, setCharges] = useState<Charge[]>([]);
  const [recherche, setRecherche] = useState("");
  const [panier, setPanier] = useState<Ligne[]>([]);
  const [clientNom, setClientNom] = useState("");
  const [clientTelephone, setClientTelephone] = useState("");
  const [avance, setAvance] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  // Paiements en cours de modification dans le tableau des ventes
  const [paiements, setPaiements] = useState<{ [id: string]: string }>({});

  // Formulaire des charges
  const [libelleCharge, setLibelleCharge] = useState("");
  const [montantCharge, setMontantCharge] = useState("");
  const [dateCharge, setDateCharge] = useState("");
  const [envoiCharge, setEnvoiCharge] = useState(false);

  async function chargerProduits() {
    const res: Response = await fetch("/api/stock");
    if (res.ok) setProduits(await res.json());
  }

  async function chargerVentes() {
    const res: Response = await fetch("/api/ventes");
    if (res.ok) setVentes(await res.json());
  }

  async function chargerCharges() {
    const res: Response = await fetch("/api/charges");
    if (res.ok) setCharges(await res.json());
  }

  useEffect(() => {
    chargerProduits();
    chargerVentes();
    chargerCharges();
  }, []);

  const r = recherche.toLowerCase().trim();

  const resultats =
    r.length < 2
      ? []
      : produits
          .filter((p) => {
            const texte = [p.nom, p.couleur, p.taille].filter(Boolean).join(" ").toLowerCase();
            return texte.includes(r);
          })
          .slice(0, 15);

  function ajouterAuPanier(p: Produit) {
    const dispo = stockTotal(p);

    if (dispo <= 0) {
      setMessage(
        L(
          `${p.nom} : stock \u00E9puis\u00E9, vente impossible`,
          `${p.nom} : \u0646\u0641\u0627\u062F \u0627\u0644\u0645\u062E\u0632\u0648\u0646`
        )
      );
      return;
    }

    const existe = panier.find((l) => l.productId === p.id);

    if (existe) {
      if (existe.quantite + 1 > dispo) {
        setMessage(
          L(`${p.nom} : seulement ${dispo} pi\u00E8ce(s) en stock`, `${p.nom} : ${dispo}`)
        );
        return;
      }

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
          disponible: dispo,
        },
      ]);
    }

    setMessage(null);
    setRecherche("");
  }

  function majLigne(productId: string, champ: "quantite" | "montant", valeur: string) {
    setPanier(
      panier.map((l) => (l.productId === productId ? { ...l, [champ]: Number(valeur) || 0 } : l))
    );
  }

  function retirer(productId: string) {
    setPanier(panier.filter((l) => l.productId !== productId));
  }

  const total = panier.reduce((s, l) => s + (l.montant || 0), 0);

  const avanceRenseignee = avance.trim() !== "";
  const avanceNum = avanceRenseignee ? Number(avance) || 0 : total;
  const reste = Math.max(0, total - avanceNum);

  const lignesInvalides = panier.filter(
    (l) => l.disponible <= 0 || l.quantite > l.disponible || l.quantite <= 0
  );
  const venteBloquee = panier.length === 0 || lignesInvalides.length > 0;

  async function enregistrer(e: FormEvent) {
    e.preventDefault();
    if (venteBloquee) return;

    setEnvoi(true);
    setMessage(null);

    try {
      const res: Response = await fetch("/api/ventes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientNom,
          clientTelephone,
          avance: avanceRenseignee ? avanceNum : null,
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
          L("Vente enregistr\u00E9e", "\u062A\u0645 \u0627\u0644\u062A\u0633\u062C\u064A\u0644")
        );
        if (data && data.avertissements && data.avertissements.length > 0) {
          setMessage(data.avertissements.join(" | "));
        }
        setPanier([]);
        setClientNom("");
        setClientTelephone("");
        setAvance("");
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

  function paiementAffiche(v: Vente) {
    if (paiements[v.id] !== undefined) return paiements[v.id];
    return String(v.avance || 0);
  }

  async function validerPaiement(v: Vente) {
    const saisi = paiements[v.id];
    if (saisi === undefined) return;

    const montant = Number(saisi) || 0;

    setPaiements((p) => {
      const copie = { ...p };
      delete copie[v.id];
      return copie;
    });

    if (montant === (v.avance || 0)) return;

    const res: Response = await fetch("/api/ventes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: v.id, avance: montant }),
    });

    const data: any = await res.json();
    if (!res.ok) setMessage(data?.error || "Erreur");
    else setMessage(L("Paiement mis \u00E0 jour", "\u062A\u0645 \u0627\u0644\u062A\u062D\u062F\u064A\u062B"));

    chargerVentes();
  }

  async function annuler(v: Vente) {
    const ok = window.confirm(L("Annuler cette vente ?", "\u0625\u0644\u063A\u0627\u0621 \u061F"));
    if (!ok) return;

    await fetch(`/api/ventes?id=${v.id}`, { method: "DELETE" });
    chargerProduits();
    chargerVentes();
  }

  async function ajouterCharge(e: FormEvent) {
    e.preventDefault();

    const libelle = libelleCharge.trim();
    const montant = Number(montantCharge);

    if (!libelle || Number.isNaN(montant) || montant <= 0) {
      setMessage(
        L(
          "Indiquez un intitul\u00E9 et un montant sup\u00E9rieur \u00E0 z\u00E9ro",
          "\u0623\u062F\u062E\u0644 \u0627\u0644\u0628\u064A\u0627\u0646 \u0648\u0627\u0644\u0645\u0628\u0644\u063A"
        )
      );
      return;
    }

    setEnvoiCharge(true);
    setMessage(null);

    try {
      const res: Response = await fetch("/api/charges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ libelle, montant, date: dateCharge || undefined }),
      });

      const data: any = await res.json();

      if (res.ok) {
        setMessage(L("Charge enregistr\u00E9e", "\u062A\u0645 \u0627\u0644\u062A\u0633\u062C\u064A\u0644"));
        setLibelleCharge("");
        setMontantCharge("");
        setDateCharge("");
        chargerCharges();
      } else {
        setMessage(data?.error || "Erreur");
      }
    } catch (err: any) {
      setMessage(err?.message ?? "Erreur de connexion");
    } finally {
      setEnvoiCharge(false);
    }
  }

  async function supprimerCharge(c: Charge) {
    const ok = window.confirm(
      L(`Supprimer la charge "${c.libelle}" ?`, "\u062D\u0630\u0641 \u061F")
    );
    if (!ok) return;

    await fetch(`/api/charges?id=${c.id}`, { method: "DELETE" });
    chargerCharges();
  }

  const limite = Date.now() - TRENTE_JOURS;

  const chargesMois = charges
    .filter((c) => new Date(c.date).getTime() >= limite)
    .reduce((s, c) => s + (c.montant || 0), 0);

  const ventesMois = ventes
    .filter((v) => new Date(v.date).getTime() >= limite)
    .reduce((s, v) => s + (v.total || 0), 0);

  const netMois = ventesMois - chargesMois;

  function boutonOnglet(cle: "ventes" | "charges" | "stock", texte: string) {
    return (
      <button
        type="button"
        className={onglet === cle ? "active" : ""}
        onClick={() => setOnglet(cle)}
        style={{ padding: "8px 16px", fontSize: 14 }}
      >
        {texte}
      </button>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>{titreMagasin}</h1>
      </div>

      <div className="lang-switcher" style={{ marginBottom: 16 }}>
        {boutonOnglet("ventes", titreVentes)}
        {boutonOnglet("charges", titreCharges)}
        {boutonOnglet("stock", titreStock)}
      </div>

      {message && <p className="sync-msg">{message}</p>}

      {onglet === "stock" && <StockClient lectureSeule={lectureSeule} />}

      {onglet === "charges" && (
        <div>
          <div
            style={{
              display: "flex",
              gap: 14,
              flexWrap: "wrap",
              marginBottom: 16,
            }}
          >
            <div
              style={{
                background: "#fdf6f7",
                border: "1px solid #efe1e2",
                borderRadius: 12,
                padding: 14,
                minWidth: 170,
              }}
            >
              <div style={{ fontSize: 12, color: "#8a6b6c", fontWeight: 600 }}>
                {L("Ventes (30 jours)", "\u0627\u0644\u0645\u0628\u064A\u0639\u0627\u062A")}
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>
                {Math.round(ventesMois)}
              </div>
            </div>

            <div
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: 12,
                padding: 14,
                minWidth: 170,
              }}
            >
              <div style={{ fontSize: 12, color: "#8a6b6c", fontWeight: 600 }}>
                {L("Charges (30 jours)", "\u0627\u0644\u0645\u0635\u0627\u0631\u064A\u0641")}
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4, color: "#b91c1c" }}>
                {Math.round(chargesMois)}
              </div>
            </div>

            <div
              style={{
                background: "#ecfdf5",
                border: "1px solid #bbf7d0",
                borderRadius: 12,
                padding: 14,
                minWidth: 170,
              }}
            >
              <div style={{ fontSize: 12, color: "#8a6b6c", fontWeight: 600 }}>
                {L("Revenu net", "\u0627\u0644\u0635\u0627\u0641\u064A")}
              </div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  marginTop: 4,
                  color: netMois >= 0 ? "#166534" : "#b91c1c",
                }}
              >
                {Math.round(netMois)}
              </div>
            </div>
          </div>

          <form onSubmit={ajouterCharge} className="stock-form">
            <input
              type="date"
              value={dateCharge}
              onChange={(e) => setDateCharge(e.target.value)}
              style={{ maxWidth: 180 }}
            />
            <input
              placeholder={L(
                "Intitul\u00E9 de la charge (hygi\u00E8ne, sacs, transport...)",
                "\u0628\u064A\u0627\u0646 \u0627\u0644\u0645\u0635\u0631\u0648\u0641"
              )}
              value={libelleCharge}
              onChange={(e) => setLibelleCharge(e.target.value)}
              style={{ minWidth: 260 }}
            />
            <input
              type="number"
              placeholder={motMontant}
              value={montantCharge}
              onChange={(e) => setMontantCharge(e.target.value)}
              style={{ maxWidth: 150 }}
            />
            <button type="submit" className="btn-primary" disabled={envoiCharge}>
              {envoiCharge
                ? "..."
                : L("Ajouter la charge", "\u0625\u0636\u0627\u0641\u0629")}
            </button>
          </form>

          {charges.length === 0 ? (
            <p className="empty">
              {L("Aucune charge enregistr\u00E9e", "\u0644\u0627 \u062A\u0648\u062C\u062F")}
            </p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{motDate}</th>
                    <th>{L("Intitul\u00E9", "\u0627\u0644\u0628\u064A\u0627\u0646")}</th>
                    <th>{motMontant}</th>
                    <th>{L("Saisie par", "\u0633\u062C\u0644\u062A \u0645\u0646 \u0637\u0631\u0641")}</th>
                    <th>{t("col_actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {charges.map((c) => (
                    <tr key={c.id}>
                      <td>{new Date(c.date).toLocaleDateString(ar ? "ar" : "fr-FR")}</td>
                      <td style={{ fontWeight: 600 }}>{c.libelle}</td>
                      <td style={{ fontWeight: 800, color: "#b91c1c" }}>{c.montant}</td>
                      <td>{c.agent || "-"}</td>
                      <td>
                        <button
                          className="btn-link danger"
                          onClick={() => supprimerCharge(c)}
                          type="button"
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
        </div>
      )}

      {onglet === "ventes" && (
        <div>
          <form onSubmit={enregistrer}>
            <div className="stock-form" style={{ flexDirection: "column", alignItems: "stretch" }}>
              <input
                placeholder={L("Rechercher un article...", "\u0628\u062D\u062B")}
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
                  {resultats.map((p) => {
                    const dispo = stockTotal(p);
                    const rupture = dispo <= 0;

                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => ajouterAuPanier(p)}
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
                        <strong>{p.nom}</strong>
                        {p.couleur ? " - " + p.couleur : ""}
                        {p.taille ? " - " + p.taille : ""}
                        {" | " + motStock + " "}
                        <span style={{ color: rupture ? "#b91c1c" : "#166534", fontWeight: 700 }}>
                          {dispo}
                        </span>
                        {p.prix ? " | " + p.prix : ""}
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

            {panier.length > 0 && (
              <div className="table-wrap" style={{ marginBottom: 14 }}>
                <table>
                  <thead>
                    <tr>
                      <th>{motArticle}</th>
                      <th>{motCouleur}</th>
                      <th>{motTaille}</th>
                      <th>{motStock}</th>
                      <th>{motQuantite}</th>
                      <th>{motMontant}</th>
                      <th>{t("col_actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {panier.map((l) => {
                      const trop = l.quantite > l.disponible || l.disponible <= 0;

                      return (
                        <tr key={l.productId} style={{ background: trop ? "#fef2f2" : undefined }}>
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
                          <td
                            style={{
                              fontWeight: 700,
                              color: l.disponible > 0 ? "#166534" : "#b91c1c",
                            }}
                          >
                            {l.disponible}
                          </td>
                          <td>
                            <input
                              type="number"
                              min={1}
                              max={l.disponible}
                              value={l.quantite}
                              onChange={(e) => majLigne(l.productId, "quantite", e.target.value)}
                              className="notes-input"
                              style={{
                                width: 65,
                                borderColor: trop ? "#b91c1c" : undefined,
                                color: trop ? "#b91c1c" : undefined,
                                fontWeight: trop ? 700 : undefined,
                              }}
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
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {lignesInvalides.length > 0 && (
              <p style={{ color: "#b91c1c", fontWeight: 700, fontSize: 13, margin: "0 0 10px" }}>
                {L(
                  "Quantit\u00E9 sup\u00E9rieure au stock disponible : la vente ne peut pas \u00EAtre enregistr\u00E9e.",
                  "\u0627\u0644\u0643\u0645\u064A\u0629 \u0623\u0643\u0628\u0631 \u0645\u0646 \u0627\u0644\u0645\u062E\u0632\u0648\u0646"
                )}
              </p>
            )}

            <div className="stock-form">
              <input
                placeholder={motCliente}
                value={clientNom}
                onChange={(e) => setClientNom(e.target.value)}
              />
              <input
                placeholder={t("col_phone")}
                value={clientTelephone}
                onChange={(e) => setClientTelephone(e.target.value)}
              />
              <input
                type="number"
                placeholder={L(
                  "Avance (seulement si paiement partiel)",
                  "\u0627\u0644\u062A\u0633\u0628\u064A\u0642 (\u0627\u062E\u062A\u064A\u0627\u0631\u064A)"
                )}
                value={avance}
                onChange={(e) => setAvance(e.target.value)}
                style={{ minWidth: 230 }}
              />
              <div style={{ display: "flex", alignItems: "center", gap: 14, fontWeight: 700 }}>
                <span>
                  {motTotal} : {total}
                </span>
                <span style={{ color: "#166534" }}>
                  {motPaye} : {avanceNum}
                </span>
                <span style={{ color: reste > 0 ? "#b45309" : "#166534" }}>
                  {motReste} : {reste}
                </span>
              </div>
              <button type="submit" className="btn-primary" disabled={envoi || venteBloquee}>
                {envoi ? "..." : L("Enregistrer la vente", "\u062A\u0633\u062C\u064A\u0644")}
              </button>
            </div>
          </form>

          <h2 style={{ fontSize: 16, marginTop: 22 }}>{titreVentes}</h2>

          {ventes.length === 0 ? (
            <p className="empty">{L("Aucune vente", "\u0644\u0627 \u062A\u0648\u062C\u062F")}</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{motDate}</th>
                    <th>{motArticle}</th>
                    <th>{motCouleur}</th>
                    <th>{motTaille}</th>
                    <th>{motMontant}</th>
                    <th>{motCliente}</th>
                    <th>{t("col_phone")}</th>
                    <th>{motPaye}</th>
                    <th>{motReste}</th>
                    <th>{t("col_actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {ventes.map((v) => (
                    <tr key={v.id}>
                      <td>{new Date(v.date).toLocaleDateString(ar ? "ar" : "fr-FR")}</td>
                      <td>
                        {v.lignes?.map((l, i) => (
                          <div key={i}>
                            {l.nom} x {l.quantite}
                          </div>
                        ))}
                      </td>
                      <td>
                        {v.lignes?.map((l, i) => (
                          <div key={i}>{l.couleur || "-"}</div>
                        ))}
                      </td>
                      <td>
                        {v.lignes?.map((l, i) => (
                          <div key={i}>{l.taille || "-"}</div>
                        ))}
                      </td>
                      <td style={{ fontWeight: 700 }}>{v.total}</td>
                      <td>{v.clientNom || "-"}</td>
                      <td>{v.clientTelephone || "-"}</td>
                      <td>
                        <input
                          type="number"
                          min={0}
                          max={v.total}
                          value={paiementAffiche(v)}
                          onChange={(e) =>
                            setPaiements({ ...paiements, [v.id]: e.target.value })
                          }
                          onBlur={() => validerPaiement(v)}
                          className="notes-input"
                          style={{ width: 85, fontWeight: 700, color: "#166534" }}
                          title={L(
                            "Modifiez ce montant quand la cliente compl\u00E8te son paiement",
                            "\u0639\u062F\u0644 \u0627\u0644\u0645\u0628\u0644\u063A"
                          )}
                        />
                      </td>
                      <td style={{ fontWeight: 700, color: v.reste > 0 ? "#b45309" : "#166534" }}>
                        {v.reste || 0}
                      </td>
                      <td>
                        <button className="btn-link danger" onClick={() => annuler(v)} type="button">
                          {L("Annuler", "\u0625\u0644\u063A\u0627\u0621")}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
