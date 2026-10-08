"use client";

import { useEffect, useState, FormEvent } from "react";
import { useLang } from "./LangProvider";

const ROSE_FONCE = "#a45f60";
const ROSE_CLAIR = "#f3d9dc";
const ROSE_PALE = "#fdf6f7";

type Ligne = { libelle: string; montant: number; auto?: string };

type Modele = {
  id: string;
  date: string;
  nom: string;
  atelier: string | null;
  phase: string;
  quantite: number;
  prixVente: number;
  emballageUnitaire: number;
  lignes: Ligne[];
  notes: string | null;
};

type Config = { mois: string; lignes: Ligne[]; piecesEstimees: number };

type Bilan = {
  caSendit: number;
  fraisSendit: number;
  vireSendit: number;
  colisSendit: number;
  facturesSendit: number;
  senditErreur: string | null;
  caLivraisons: number;
  caMagasin: number;
  retours: number;
  caNet: number;
  chargesFixes: number;
  coutsDirects: number;
  resultat: number;
  nbLivrees: number;
  nbVentes: number;
};

const PHASES = [
  { cle: "ETUDE", fr: "En \u00E9tude", ar: "\u0642\u064A\u062F \u0627\u0644\u062F\u0631\u0627\u0633\u0629", fond: "#e2e8f0", texte: "#475569" },
  { cle: "ECHANTILLON", fr: "En attente d'\u00E9chantillon", ar: "\u0628\u0627\u0646\u062A\u0638\u0627\u0631 \u0627\u0644\u0639\u064A\u0646\u0629", fond: "#fef9c3", texte: "#854d0e" },
  { cle: "COUPE", fr: "En coupe", ar: "\u0642\u064A\u062F \u0627\u0644\u0642\u0635", fond: "#e0e7ff", texte: "#3730a3" },
  { cle: "PRODUCTION", fr: "En production", ar: "\u0642\u064A\u062F \u0627\u0644\u0625\u0646\u062A\u0627\u062C", fond: "#e0f2fe", texte: "#0369a1" },
  { cle: "FINIE", fr: "Finie", ar: "\u0645\u0646\u062A\u0647\u064A\u0629", fond: "#a7f3d0", texte: "#065f46" },
];

const LIGNES_MODELE = ["Tissu", "Patronnage", "\u00C9chantillon", "Accessoires", "Transport"];

const pastille = {
  display: "inline-block",
  padding: "4px 10px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 700,
  whiteSpace: "nowrap",
} as const;

const carte = {
  background: "#ffffff",
  border: `1px solid ${ROSE_CLAIR}`,
  borderRadius: 14,
  padding: 18,
  marginBottom: 16,
} as const;

const ligneCalcul = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  padding: "5px 0",
  fontSize: 13,
} as const;

const resume = {
  display: "flex",
  gap: 14,
  flexWrap: "wrap",
  alignItems: "center",
  fontSize: 12,
  color: "#8a6b6c",
} as const;

function moisActuel() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function jourISO(valeur: string) {
  return String(valeur || "").slice(0, 10);
}

function phaseInfo(cle: string) {
  return PHASES.find((p) => p.cle === cle) || PHASES[0];
}

function arrondi(n: number) {
  return Math.round(n * 100) / 100;
}

export default function ProductionClient() {
  const { lang } = useLang();
  const ar = lang === "ar";
  const L = (fr: string, arabe: string) => (ar ? arabe : fr);

  const [onglet, setOnglet] = useState<"suivi" | "cout">("suivi");
  const [modeles, setModeles] = useState<Modele[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const [nom, setNom] = useState("");
  const [atelier, setAtelier] = useState("");
  const [quantite, setQuantite] = useState("");
  const [prixVente, setPrixVente] = useState("");
  const [dateModele, setDateModele] = useState("");

  const [filtrePhase, setFiltrePhase] = useState("");
  const [recherche, setRecherche] = useState("");

  const [mois, setMois] = useState(moisActuel());
  const [config, setConfig] = useState<Config | null>(null);
  const [piecesReelles, setPiecesReelles] = useState(0);
  const [magasinReel, setMagasinReel] = useState(0);
  const [base, setBase] = useState<"estimation" | "reel">("estimation");
  const [bilan, setBilan] = useState<Bilan | null>(null);
  const [bilanEnCours, setBilanEnCours] = useState(false);

  const [ouverts, setOuverts] = useState<{ [id: string]: boolean }>({});
  const [brouillons, setBrouillons] = useState<{ [id: string]: Modele }>({});

  function basculer(id: string) {
    setOuverts((etat) => ({ ...etat, [id]: !etat[id] }));
  }

  async function chargerModeles() {
    const res: Response = await fetch("/api/production");
    if (res.ok) setModeles(await res.json());
  }

  async function chargerConfig(m: string) {
    const res: Response = await fetch(`/api/production/charges-fixes?mois=${m}`);
    const data: any = await res.json();

    if (res.ok) {
      setConfig({
        mois: data.config.mois,
        lignes: Array.isArray(data.config.lignes) ? data.config.lignes : [],
        piecesEstimees: data.config.piecesEstimees || 400,
      });
      setPiecesReelles(data.piecesReelles || 0);
      setMagasinReel(data.magasinReel || 0);
    } else {
      setMessage(data?.error || "Erreur");
    }
  }

  async function chargerBilan(m: string) {
    setBilanEnCours(true);
    try {
      const res: Response = await fetch(`/api/production/bilan?mois=${m}`);
      const data: any = await res.json();
      if (res.ok) setBilan(data);
      else setMessage(data?.error || "Erreur");
    } catch (e: any) {
      setMessage(e?.message ?? "Erreur");
    } finally {
      setBilanEnCours(false);
    }
  }

  useEffect(() => {
    chargerModeles();
  }, []);

  useEffect(() => {
    if (onglet !== "cout") return;
    chargerConfig(mois);
    chargerBilan(mois);
  }, [onglet, mois]);

  async function ajouterModele(e: FormEvent) {
    e.preventDefault();
    if (!nom.trim()) return;

    const res: Response = await fetch("/api/production", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nom,
        atelier,
        quantite: Number(quantite) || 0,
        prixVente: Number(prixVente) || 0,
        date: dateModele || undefined,
      }),
    });

    const data: any = await res.json();

    if (res.ok) {
      setMessage(L("Mod\u00E8le ajout\u00E9", "\u062A\u0645\u062A \u0627\u0644\u0625\u0636\u0627\u0641\u0629"));
      setNom("");
      setAtelier("");
      setQuantite("");
      setPrixVente("");
      setDateModele("");
      chargerModeles();
    } else {
      setMessage(data?.error || "Erreur");
    }
  }

  async function majModele(id: string, champs: Record<string, unknown>) {
    const res: Response = await fetch("/api/production", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...champs }),
    });

    const data: any = await res.json();
    if (!res.ok) setMessage(data?.error || "Erreur");

    await chargerModeles();
    if (onglet === "cout") {
      chargerConfig(mois);
      chargerBilan(mois);
    }
  }

  async function changerDate(m: Modele, valeur: string) {
    if (!valeur || valeur === jourISO(m.date)) return;
    await majModele(m.id, { date: valeur });
    setMessage(
      L(
        `${m.nom} : date chang\u00E9e au ${valeur}`,
        `${m.nom} : ${valeur}`
      )
    );
  }

  async function supprimerModele(m: Modele) {
    const ok = window.confirm(L(`Supprimer le mod\u00E8le "${m.nom}" ?`, "\u062D\u0630\u0641 \u061F"));
    if (!ok) return;

    await fetch(`/api/production?id=${m.id}`, { method: "DELETE" });
    chargerModeles();
  }

  async function enregistrerConfig(nouvelle: Config) {
    setConfig(nouvelle);

    const res: Response = await fetch("/api/production/charges-fixes", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mois: nouvelle.mois,
        lignes: nouvelle.lignes,
        piecesEstimees: nouvelle.piecesEstimees,
      }),
    });

    if (res.ok) chargerBilan(mois);
  }

  function majLigneFixe(index: number, champ: "libelle" | "montant", valeur: string) {
    if (!config) return;
    const lignes = config.lignes.map((l, i) =>
      i === index ? { ...l, [champ]: champ === "montant" ? Number(valeur) || 0 : valeur } : l
    );
    setConfig({ ...config, lignes });
  }

  function retirerLigneFixe(index: number) {
    if (!config) return;
    const lignes = config.lignes.filter((_, i) => i !== index);
    enregistrerConfig({ ...config, lignes });
  }

  function ajouterLigneFixe() {
    if (!config) return;
    enregistrerConfig({ ...config, lignes: [...config.lignes, { libelle: "", montant: 0 }] });
  }

  function utiliserMagasinReel() {
    if (!config) return;
    const lignes = config.lignes.map((l) =>
      l.auto === "MAGASIN" ? { ...l, montant: magasinReel } : l
    );
    enregistrerConfig({ ...config, lignes });
    setMessage(L(`Charges magasin r\u00E9elles : ${magasinReel}`, `${magasinReel}`));
  }

  function brouillon(m: Modele): Modele {
    if (brouillons[m.id]) return brouillons[m.id];

    const lignes =
      m.lignes && m.lignes.length > 0
        ? m.lignes
        : LIGNES_MODELE.map((libelle) => ({ libelle, montant: 0 }));

    return { ...m, lignes };
  }

  function majBrouillon(m: Modele, champs: Partial<Modele>) {
    const actuel = brouillon(m);
    setBrouillons({ ...brouillons, [m.id]: { ...actuel, ...champs } });
  }

  function majLigneModele(m: Modele, index: number, champ: "libelle" | "montant", valeur: string) {
    const actuel = brouillon(m);
    const lignes = actuel.lignes.map((l, i) =>
      i === index ? { ...l, [champ]: champ === "montant" ? Number(valeur) || 0 : valeur } : l
    );
    majBrouillon(m, { lignes });
  }

  async function enregistrerModele(m: Modele) {
    const b = brouillon(m);

    await majModele(m.id, {
      quantite: b.quantite,
      prixVente: b.prixVente,
      emballageUnitaire: b.emballageUnitaire,
      lignes: b.lignes,
    });

    setBrouillons((etat) => {
      const copie = { ...etat };
      delete copie[m.id];
      return copie;
    });

    setMessage(L("Co\u00FBts enregistr\u00E9s", "\u062A\u0645 \u0627\u0644\u062D\u0641\u0638"));
  }

  const totalFixe = config ? config.lignes.reduce((s, l) => s + (l.montant || 0), 0) : 0;
  const piecesRetenues =
    base === "reel" ? Math.max(1, piecesReelles) : Math.max(1, config?.piecesEstimees || 400);
  const partParPiece = totalFixe / piecesRetenues;

  const r = recherche.toLowerCase().trim();

  const listeSuivi = modeles.filter((m) => {
    if (filtrePhase && m.phase !== filtrePhase) return false;
    if (!r) return true;
    return [m.nom, m.atelier].filter(Boolean).join(" ").toLowerCase().includes(r);
  });

  const modelesDuMois = modeles.filter((m) => String(m.date).slice(0, 7) === mois);

  return (
    <div>
      <div className="page-header">
        <h1>{L("Production", "\u0627\u0644\u0625\u0646\u062A\u0627\u062C")}</h1>
      </div>

      <div className="lang-switcher" style={{ marginBottom: 16 }}>
        <button
          type="button"
          className={onglet === "suivi" ? "active" : ""}
          onClick={() => setOnglet("suivi")}
          style={{ padding: "8px 16px", fontSize: 14 }}
        >
          {L("Suivi de production", "\u0645\u062A\u0627\u0628\u0639\u0629 \u0627\u0644\u0625\u0646\u062A\u0627\u062C")}
        </button>
        <button
          type="button"
          className={onglet === "cout" ? "active" : ""}
          onClick={() => setOnglet("cout")}
          style={{ padding: "8px 16px", fontSize: 14 }}
        >
          {L("Co\u00FBt de revient", "\u062A\u0643\u0644\u0641\u0629 \u0627\u0644\u0625\u0646\u062A\u0627\u062C")}
        </button>
      </div>

      {message && <p className="sync-msg">{message}</p>}

      {onglet === "suivi" && (
        <div>
          <form onSubmit={ajouterModele} className="stock-form">
            <input
              type="date"
              value={dateModele}
              onChange={(e) => setDateModele(e.target.value)}
              style={{ maxWidth: 170 }}
            />
            <input
              placeholder={L("Nom du mod\u00E8le", "\u0627\u0633\u0645 \u0627\u0644\u0645\u0648\u062F\u064A\u0644")}
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              style={{ minWidth: 200 }}
              required
            />
            <input
              placeholder={L("Atelier", "\u0627\u0644\u0648\u0631\u0634\u0629")}
              value={atelier}
              onChange={(e) => setAtelier(e.target.value)}
              style={{ minWidth: 160 }}
            />
            <input
              type="number"
              placeholder={L("Quantit\u00E9", "\u0627\u0644\u0643\u0645\u064A\u0629")}
              value={quantite}
              onChange={(e) => setQuantite(e.target.value)}
              style={{ maxWidth: 130 }}
            />
            <input
              type="number"
              placeholder={L("Prix de vente", "\u0633\u0639\u0631 \u0627\u0644\u0628\u064A\u0639")}
              value={prixVente}
              onChange={(e) => setPrixVente(e.target.value)}
              style={{ maxWidth: 140 }}
            />
            <button type="submit" className="btn-primary">
              {L("Ajouter le mod\u00E8le", "\u0625\u0636\u0627\u0641\u0629")}
            </button>
          </form>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            <input
              placeholder={L("Rechercher un mod\u00E8le...", "\u0628\u062D\u062B")}
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              className="notes-input"
              style={{ width: 220 }}
            />
            <button
              type="button"
              className={filtrePhase === "" ? "btn-primary" : "btn-secondary"}
              onClick={() => setFiltrePhase("")}
              style={{ padding: "6px 12px", fontSize: 12 }}
            >
              {L("Toutes", "\u0627\u0644\u0643\u0644")} ({modeles.length})
            </button>
            {PHASES.map((p) => {
              const nb = modeles.filter((m) => m.phase === p.cle).length;
              return (
                <button
                  key={p.cle}
                  type="button"
                  className={filtrePhase === p.cle ? "btn-primary" : "btn-secondary"}
                  onClick={() => setFiltrePhase(p.cle)}
                  style={{ padding: "6px 12px", fontSize: 12 }}
                >
                  {L(p.fr, p.ar)} ({nb})
                </button>
              );
            })}
          </div>

          {listeSuivi.length === 0 ? (
            <p className="empty">{L("Aucun mod\u00E8le", "\u0644\u0627 \u062A\u0648\u062C\u062F")}</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{L("Date", "\u0627\u0644\u062A\u0627\u0631\u064A\u062E")}</th>
                    <th>{L("Mod\u00E8le", "\u0627\u0644\u0645\u0648\u062F\u064A\u0644")}</th>
                    <th>{L("Atelier", "\u0627\u0644\u0648\u0631\u0634\u0629")}</th>
                    <th>{L("Quantit\u00E9", "\u0627\u0644\u0643\u0645\u064A\u0629")}</th>
                    <th>{L("Phase", "\u0627\u0644\u0645\u0631\u062D\u0644\u0629")}</th>
                    <th>{L("Actions", "\u0625\u062C\u0631\u0627\u0621\u0627\u062A")}</th>
                  </tr>
                </thead>
                <tbody>
                  {listeSuivi.map((m) => {
                    const info = phaseInfo(m.phase);

                    return (
                      <tr key={m.id}>
                        <td>
                          <input
                            type="date"
                            defaultValue={jourISO(m.date)}
                            onBlur={(e) => changerDate(m, e.target.value)}
                            className="notes-input"
                            style={{ width: 150 }}
                          />
                        </td>
                        <td style={{ fontWeight: 700 }}>{m.nom}</td>
                        <td>
                          <input
                            defaultValue={m.atelier || ""}
                            onBlur={(e) => majModele(m.id, { atelier: e.target.value })}
                            className="notes-input"
                            style={{ width: 130 }}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            defaultValue={m.quantite}
                            onBlur={(e) => majModele(m.id, { quantite: Number(e.target.value) || 0 })}
                            className="notes-input"
                            style={{ width: 80, fontWeight: 700 }}
                          />
                        </td>
                        <td>
                          <div style={{ ...pastille, background: info.fond, color: info.texte }}>
                            {L(info.fr, info.ar)}
                          </div>
                          <select
                            value={m.phase}
                            onChange={(e) => majModele(m.id, { phase: e.target.value })}
                            style={{ display: "block", marginTop: 6, fontSize: 12 }}
                          >
                            {PHASES.map((p) => (
                              <option key={p.cle} value={p.cle}>
                                {L(p.fr, p.ar)}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn-link danger"
                            onClick={() => supprimerModele(m)}
                          >
                            {L("Supprimer", "\u062D\u0630\u0641")}
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
      )}

      {onglet === "cout" && (
        <div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: ROSE_FONCE }}>
              {L("Mois", "\u0627\u0644\u0634\u0647\u0631")}
            </label>
            <input
              type="month"
              value={mois}
              onChange={(e) => setMois(e.target.value)}
              className="notes-input"
              style={{ width: 160 }}
            />
            {bilanEnCours && (
              <span style={{ fontSize: 12, color: "#8a6b6c" }}>
                {L("Lecture des factures Sendit...", "\u062C\u0627\u0631\u064D")}
              </span>
            )}
          </div>

          <div style={carte}>
            <h2 style={{ fontSize: 16, margin: "0 0 12px", color: ROSE_FONCE }}>
              {L("Charges fixes du mois", "\u0627\u0644\u0645\u0635\u0627\u0631\u064A\u0641 \u0627\u0644\u062B\u0627\u0628\u062A\u0629")}
            </h2>

            {config &&
              config.lignes.map((l, i) => (
                <div
                  key={i}
                  style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}
                >
                  <input
                    value={l.libelle}
                    onChange={(e) => majLigneFixe(i, "libelle", e.target.value)}
                    onBlur={() => config && enregistrerConfig(config)}
                    className="notes-input"
                    style={{ flex: 1, minWidth: 160 }}
                  />
                  <input
                    type="number"
                    value={l.montant}
                    onChange={(e) => majLigneFixe(i, "montant", e.target.value)}
                    onBlur={() => config && enregistrerConfig(config)}
                    className="notes-input"
                    style={{ width: 110, fontWeight: 700 }}
                  />
                  {l.auto === "MAGASIN" && (
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={utiliserMagasinReel}
                      style={{ padding: "5px 10px", fontSize: 11 }}
                    >
                      {L(`R\u00E9el : ${magasinReel}`, `${magasinReel}`)}
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn-link danger"
                    onClick={() => retirerLigneFixe(i)}
                  >
                    x
                  </button>
                </div>
              ))}

            <button
              type="button"
              className="btn-secondary"
              onClick={ajouterLigneFixe}
              style={{ padding: "6px 12px", fontSize: 12, marginTop: 6 }}
            >
              {L("+ Ajouter une ligne", "+ \u0633\u0637\u0631")}
            </button>

            <div style={{ borderTop: `1px solid ${ROSE_CLAIR}`, marginTop: 14, paddingTop: 12 }}>
              <div style={{ ...ligneCalcul, fontWeight: 800 }}>
                <span>{L("Total des charges fixes", "\u0627\u0644\u0645\u062C\u0645\u0648\u0639")}</span>
                <span>{Math.round(totalFixe)}</span>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "10px 0" }}>
                <button
                  type="button"
                  className={base === "estimation" ? "btn-primary" : "btn-secondary"}
                  onClick={() => setBase("estimation")}
                  style={{ padding: "6px 12px", fontSize: 12 }}
                >
                  {L(`Estimation : ${config?.piecesEstimees || 400} pi\u00E8ces`, "\u062A\u0642\u062F\u064A\u0631")}
                </button>
                <button
                  type="button"
                  className={base === "reel" ? "btn-primary" : "btn-secondary"}
                  onClick={() => setBase("reel")}
                  style={{ padding: "6px 12px", fontSize: 12 }}
                >
                  {L(`R\u00E9el : ${piecesReelles} pi\u00E8ces`, `${piecesReelles}`)}
                </button>
                <input
                  type="number"
                  value={config?.piecesEstimees || 400}
                  onChange={(e) =>
                    config &&
                    setConfig({ ...config, piecesEstimees: Number(e.target.value) || 400 })
                  }
                  onBlur={() => config && enregistrerConfig(config)}
                  className="notes-input"
                  style={{ width: 100 }}
                  title={L("Modifier l'estimation", "\u062A\u0639\u062F\u064A\u0644")}
                />
              </div>

              <div style={{ ...ligneCalcul, fontWeight: 800, color: ROSE_FONCE }}>
                <span>{L("Part des charges fixes par pi\u00E8ce", "\u0627\u0644\u062D\u0635\u0629 \u0644\u0643\u0644 \u0642\u0637\u0639\u0629")}</span>
                <span>{arrondi(partParPiece)}</span>
              </div>

              <p style={{ fontSize: 11, color: "#a08788", margin: "6px 0 0" }}>
                {L(
                  "Les pi\u00E8ces r\u00E9elles ne comptent que les mod\u00E8les termin\u00E9s ce mois-ci.",
                  "\u0627\u0644\u0645\u0648\u062F\u064A\u0644\u0627\u062A \u0627\u0644\u0645\u0646\u062A\u0647\u064A\u0629 \u0641\u0642\u0637"
                )}
              </p>
            </div>
          </div>

          {modelesDuMois.length === 0 ? (
            <p className="empty">
              {L("Aucun mod\u00E8le ce mois-ci", "\u0644\u0627 \u062A\u0648\u062C\u062F")}
            </p>
          ) : (
            modelesDuMois.map((m) => {
              const b = brouillon(m);
              const info = phaseInfo(m.phase);
              const ouvert = Boolean(ouverts[m.id]);

              const totalLignes = b.lignes.reduce((s, l) => s + (l.montant || 0), 0);
              const emballage = (b.emballageUnitaire || 0) * (b.quantite || 0);
              const totalDirect = totalLignes + emballage;
              const q = Math.max(1, b.quantite || 0);
              const directParPiece = totalDirect / q;
              const revientParPiece = directParPiece + partParPiece;
              const coutTotal = revientParPiece * (b.quantite || 0);
              const margeParPiece = (b.prixVente || 0) - revientParPiece;
              const margePourcent = b.prixVente > 0 ? (margeParPiece / b.prixVente) * 100 : 0;
              const contribution = margeParPiece * (b.quantite || 0);

              return (
                <div key={m.id} style={carte}>
                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "center",
                      flexWrap: "wrap",
                      justifyContent: "space-between",
                    }}
                  >
                    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                      <h3 style={{ fontSize: 16, margin: 0, color: ROSE_FONCE }}>{m.nom}</h3>
                      <span style={{ ...pastille, background: info.fond, color: info.texte }}>
                        {L(info.fr, info.ar)}
                      </span>
                      {m.atelier && (
                        <span style={{ fontSize: 12, color: "#8a6b6c" }}>{m.atelier}</span>
                      )}
                      <input
                        type="date"
                        defaultValue={jourISO(m.date)}
                        onBlur={(e) => changerDate(m, e.target.value)}
                        className="notes-input"
                        style={{ width: 150 }}
                        title={L("Changer le mois du mod\u00E8le", "\u062A\u063A\u064A\u064A\u0631 \u0627\u0644\u062A\u0627\u0631\u064A\u062E")}
                      />
                    </div>

                    <button
                      type="button"
                      className={ouvert ? "btn-primary" : "btn-secondary"}
                      onClick={() => basculer(m.id)}
                      style={{ padding: "6px 14px", fontSize: 12 }}
                    >
                      {ouvert
                        ? L("Masquer les d\u00E9tails", "\u0625\u062E\u0641\u0627\u0621")
                        : L("D\u00E9tails", "\u0627\u0644\u062A\u0641\u0627\u0635\u064A\u0644")}
                    </button>
                  </div>

                  <div style={{ ...resume, marginTop: 10 }}>
                    <span>
                      {L("Quantit\u00E9", "\u0627\u0644\u0643\u0645\u064A\u0629")} :{" "}
                      <strong style={{ color: "#3f3030" }}>{b.quantite}</strong>
                    </span>
                    <span>
                      {L("Prix de vente", "\u0633\u0639\u0631 \u0627\u0644\u0628\u064A\u0639")} :{" "}
                      <strong style={{ color: "#3f3030" }}>{b.prixVente}</strong>
                    </span>
                    <span>
                      {L("Co\u00FBt de revient", "\u062A\u0643\u0644\u0641\u0629 \u0627\u0644\u0642\u0637\u0639\u0629")} :{" "}
                      <strong style={{ color: ROSE_FONCE }}>{arrondi(revientParPiece)}</strong>
                    </span>
                    <span>
                      {L("Contribution", "\u0627\u0644\u0645\u0633\u0627\u0647\u0645\u0629")} :{" "}
                      <strong style={{ color: contribution >= 0 ? "#166534" : "#b91c1c" }}>
                        {arrondi(contribution)}
                      </strong>
                    </span>
                  </div>

                  {ouvert && (
                    <div style={{ marginTop: 16 }}>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                        <label style={{ fontSize: 12, color: "#8a6b6c" }}>
                          {L("Quantit\u00E9", "\u0627\u0644\u0643\u0645\u064A\u0629")}
                          <input
                            type="number"
                            value={b.quantite}
                            onChange={(e) =>
                              majBrouillon(m, { quantite: Number(e.target.value) || 0 })
                            }
                            className="notes-input"
                            style={{ width: 90, marginInlineStart: 6 }}
                          />
                        </label>
                        <label style={{ fontSize: 12, color: "#8a6b6c" }}>
                          {L("Prix de vente", "\u0633\u0639\u0631 \u0627\u0644\u0628\u064A\u0639")}
                          <input
                            type="number"
                            value={b.prixVente}
                            onChange={(e) =>
                              majBrouillon(m, { prixVente: Number(e.target.value) || 0 })
                            }
                            className="notes-input"
                            style={{ width: 90, marginInlineStart: 6 }}
                          />
                        </label>
                        <label style={{ fontSize: 12, color: "#8a6b6c" }}>
                          {L("Emballage / pi\u00E8ce", "\u0627\u0644\u062A\u063A\u0644\u064A\u0641")}
                          <input
                            type="number"
                            value={b.emballageUnitaire}
                            onChange={(e) =>
                              majBrouillon(m, { emballageUnitaire: Number(e.target.value) || 0 })
                            }
                            className="notes-input"
                            style={{ width: 90, marginInlineStart: 6 }}
                          />
                        </label>
                      </div>

                      {b.lignes.map((l, i) => (
                        <div
                          key={i}
                          style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}
                        >
                          <input
                            value={l.libelle}
                            onChange={(e) => majLigneModele(m, i, "libelle", e.target.value)}
                            className="notes-input"
                            style={{ flex: 1, minWidth: 150 }}
                          />
                          <input
                            type="number"
                            value={l.montant}
                            onChange={(e) => majLigneModele(m, i, "montant", e.target.value)}
                            className="notes-input"
                            style={{ width: 110, fontWeight: 700 }}
                          />
                          <button
                            type="button"
                            className="btn-link danger"
                            onClick={() =>
                              majBrouillon(m, { lignes: b.lignes.filter((_, j) => j !== i) })
                            }
                          >
                            x
                          </button>
                        </div>
                      ))}

                      <div style={{ display: "flex", gap: 8, marginTop: 6, marginBottom: 12 }}>
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() =>
                            majBrouillon(m, { lignes: [...b.lignes, { libelle: "", montant: 0 }] })
                          }
                          style={{ padding: "6px 12px", fontSize: 12 }}
                        >
                          {L("+ Ajouter une ligne", "+ \u0633\u0637\u0631")}
                        </button>
                        <button
                          type="button"
                          className="btn-primary"
                          onClick={() => enregistrerModele(m)}
                          style={{ padding: "6px 14px", fontSize: 12 }}
                        >
                          {L("Enregistrer", "\u062D\u0641\u0638")}
                        </button>
                      </div>

                      <div
                        style={{
                          background: ROSE_PALE,
                          border: `1px solid ${ROSE_CLAIR}`,
                          borderRadius: 12,
                          padding: 14,
                        }}
                      >
                        <div style={ligneCalcul}>
                          <span>
                            {L("Emballage", "\u0627\u0644\u062A\u063A\u0644\u064A\u0641")} (
                            {b.emballageUnitaire} x {b.quantite})
                          </span>
                          <span>{arrondi(emballage)}</span>
                        </div>
                        <div style={{ ...ligneCalcul, fontWeight: 800 }}>
                          <span>{L("Total des charges directes", "\u0627\u0644\u0645\u062C\u0645\u0648\u0639 \u0627\u0644\u0645\u0628\u0627\u0634\u0631")}</span>
                          <span>{arrondi(totalDirect)}</span>
                        </div>
                        <div style={ligneCalcul}>
                          <span>{L("Charges directes par pi\u00E8ce", "\u0644\u0643\u0644 \u0642\u0637\u0639\u0629")}</span>
                          <span>{arrondi(directParPiece)}</span>
                        </div>
                        <div style={ligneCalcul}>
                          <span>{L("Part des charges fixes", "\u062D\u0635\u0629 \u0627\u0644\u062B\u0627\u0628\u062A\u0629")}</span>
                          <span>{arrondi(partParPiece)}</span>
                        </div>

                        <div
                          style={{
                            ...ligneCalcul,
                            fontWeight: 800,
                            color: ROSE_FONCE,
                            borderTop: `1px solid ${ROSE_CLAIR}`,
                            marginTop: 6,
                            paddingTop: 10,
                          }}
                        >
                          <span>{L("Co\u00FBt de revient par pi\u00E8ce", "\u062A\u0643\u0644\u0641\u0629 \u0627\u0644\u0642\u0637\u0639\u0629")}</span>
                          <span>{arrondi(revientParPiece)}</span>
                        </div>
                        <div style={{ ...ligneCalcul, fontWeight: 800 }}>
                          <span>{L("Co\u00FBt total du mod\u00E8le", "\u0627\u0644\u062A\u0643\u0644\u0641\u0629 \u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A\u0629")}</span>
                          <span>{arrondi(coutTotal)}</span>
                        </div>

                        <div
                          style={{
                            ...ligneCalcul,
                            fontWeight: 800,
                            color: margeParPiece >= 0 ? "#166534" : "#b91c1c",
                            borderTop: `1px solid ${ROSE_CLAIR}`,
                            marginTop: 6,
                            paddingTop: 10,
                          }}
                        >
                          <span>{L("Marge par pi\u00E8ce", "\u0627\u0644\u0631\u0628\u062D \u0644\u0643\u0644 \u0642\u0637\u0639\u0629")}</span>
                          <span>
                            {arrondi(margeParPiece)} ({arrondi(margePourcent)} %)
                          </span>
                        </div>
                        <div
                          style={{
                            ...ligneCalcul,
                            fontWeight: 800,
                            fontSize: 15,
                            color: contribution >= 0 ? "#166534" : "#b91c1c",
                          }}
                        >
                          <span>{L("Contribution du mod\u00E8le", "\u0645\u0633\u0627\u0647\u0645\u0629 \u0627\u0644\u0645\u0648\u062F\u064A\u0644")}</span>
                          <span>{arrondi(contribution)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}

          {bilan && (
            <div style={{ ...carte, background: ROSE_PALE }}>
              <h2 style={{ fontSize: 16, margin: "0 0 12px", color: ROSE_FONCE }}>
                {L("Bilan r\u00E9el du mois", "\u062D\u0635\u064A\u0644\u0629 \u0627\u0644\u0634\u0647\u0631")}
              </h2>

              {bilan.senditErreur && (
                <p style={{ fontSize: 12, color: "#b91c1c", fontWeight: 700, margin: "0 0 10px" }}>
                  {L("Facturation Sendit indisponible : ", "")}
                  {bilan.senditErreur}
                </p>
              )}

              <div style={ligneCalcul}>
                <span>
                  {L("Encaiss\u00E9 Sendit", "\u0645\u062F\u0627\u062E\u064A\u0644 \u0633\u0646\u062F\u064A\u062A")} (
                  {bilan.colisSendit} {L("colis", "\u0637\u0631\u062F")})
                </span>
                <span style={{ fontWeight: 700 }}>{bilan.caSendit}</span>
              </div>
              <div style={ligneCalcul}>
                <span>
                  {L("Ventes magasin", "\u0645\u0628\u064A\u0639\u0627\u062A \u0627\u0644\u0645\u062A\u062C\u0631")} ({bilan.nbVentes})
                </span>
                <span style={{ fontWeight: 700 }}>{bilan.caMagasin}</span>
              </div>
              <div
                style={{
                  ...ligneCalcul,
                  fontWeight: 800,
                  borderTop: `1px solid ${ROSE_CLAIR}`,
                  marginTop: 6,
                  paddingTop: 10,
                }}
              >
                <span>{L("Chiffre d'affaires r\u00E9el", "\u0631\u0642\u0645 \u0627\u0644\u0645\u0639\u0627\u0645\u0644\u0627\u062A \u0627\u0644\u0641\u0639\u0644\u064A")}</span>
                <span>{bilan.caNet}</span>
              </div>

              <div style={{ ...ligneCalcul, color: "#b91c1c", marginTop: 8 }}>
                <span>{L("Charges fixes", "\u0627\u0644\u0645\u0635\u0627\u0631\u064A\u0641 \u0627\u0644\u062B\u0627\u0628\u062A\u0629")}</span>
                <span>- {bilan.chargesFixes}</span>
              </div>
              <div style={{ ...ligneCalcul, color: "#b91c1c" }}>
                <span>{L("Charges de production", "\u062A\u0643\u0627\u0644\u064A\u0641 \u0627\u0644\u0625\u0646\u062A\u0627\u062C")}</span>
                <span>- {bilan.coutsDirects}</span>
              </div>

              <div
                style={{
                  ...ligneCalcul,
                  fontWeight: 800,
                  fontSize: 17,
                  color: bilan.resultat >= 0 ? "#166534" : "#b91c1c",
                  borderTop: `1px solid ${ROSE_CLAIR}`,
                  marginTop: 8,
                  paddingTop: 12,
                }}
              >
                <span>{L("R\u00E9sultat du mois", "\u0646\u062A\u064A\u062C\u0629 \u0627\u0644\u0634\u0647\u0631")}</span>
                <span>{bilan.resultat}</span>
              </div>

              <div
                style={{
                  borderTop: `1px solid ${ROSE_CLAIR}`,
                  marginTop: 14,
                  paddingTop: 10,
                  fontSize: 12,
                  color: "#8a6b6c",
                }}
              >
                <div style={ligneCalcul}>
                  <span>{L("Vir\u00E9 sur votre compte", "\u0627\u0644\u0645\u062D\u0648\u0644")}</span>
                  <span>{bilan.vireSendit}</span>
                </div>
                <div style={ligneCalcul}>
                  <span>{L("Frais de livraison retenus", "\u0631\u0633\u0648\u0645 \u0627\u0644\u062A\u0648\u0635\u064A\u0644")}</span>
                  <span>{bilan.fraisSendit}</span>
                </div>
                <div style={ligneCalcul}>
                  <span>
                    {L("Pour m\u00E9moire : command\u00E9 et livr\u00E9", "\u0644\u0644\u0630\u0643\u0631\u0649")} ({bilan.nbLivrees})
                  </span>
                  <span>{bilan.caLivraisons}</span>
                </div>
              </div>

              <p style={{ fontSize: 11, color: "#a08788", margin: "10px 0 0", lineHeight: 1.6 }}>
                {L(
                  "Le chiffre d'affaires vient des factures Sendit pay\u00E9es ce mois-ci, frais de livraison exclus. Les retours n'en sont pas d\u00E9duits : un colis retourn\u00E9 n'est jamais pay\u00E9 par Sendit.",
                  "\u0645\u0646 \u0641\u0648\u0627\u062A\u064A\u0631 \u0633\u0646\u062F\u064A\u062A \u0627\u0644\u0645\u062F\u0641\u0648\u0639\u0629"
                )}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
