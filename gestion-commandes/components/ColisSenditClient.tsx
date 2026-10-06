"use client";

import { useEffect, useState } from "react";
import { useLang } from "./LangProvider";

type Colis = {
  code: string;
  statut: string;
  nom: string;
  telephone: string;
  ville: string;
  districtId: number | null;
  produits: string;
  commentaire: string;
  reference: string;
  montant: number;
  frais: number;
  echange: boolean;
  date: string | null;
  commandeId: string | null;
  commandeNumero: string | null;
};

const ROSE_FONCE = "#a45f60";
const ROSE_CLAIR = "#f3d9dc";
const ROSE_PALE = "#fdf6f7";

const pastille = {
  display: "inline-block",
  padding: "3px 9px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 700,
  whiteSpace: "nowrap",
} as const;

const petitBouton = { padding: "6px 12px", fontSize: 12 } as const;

const boutonCreer = {
  background: "#4b508f",
  color: "white",
  border: "none",
  padding: "7px 11px",
  borderRadius: 7,
  cursor: "pointer",
  fontSize: 11,
  fontWeight: 700,
  whiteSpace: "nowrap",
} as const;

const boutonRattacher = {
  background: "#0369a1",
  color: "white",
  border: "none",
  padding: "7px 11px",
  borderRadius: 7,
  cursor: "pointer",
  fontSize: 11,
  fontWeight: 700,
  whiteSpace: "nowrap",
} as const;

const STATUTS: { [cle: string]: { fr: string; ar: string; fond: string; texte: string } } = {
  PENDING: { fr: "En attente", ar: "\u0641\u064A \u0627\u0644\u0627\u0646\u062A\u0638\u0627\u0631", fond: "#fef9c3", texte: "#854d0e" },
  PICKED_UP: { fr: "Ramasse", ar: "\u062A\u0645 \u0627\u0644\u0627\u0633\u062A\u0644\u0627\u0645", fond: "#dbeafe", texte: "#1e40af" },
  IN_TRANSIT: { fr: "En transit", ar: "\u0641\u064A \u0627\u0644\u0637\u0631\u064A\u0642", fond: "#dbeafe", texte: "#1e40af" },
  DELIVERING: { fr: "En livraison", ar: "\u0642\u064A\u062F \u0627\u0644\u062A\u0648\u0635\u064A\u0644", fond: "#e0e7ff", texte: "#3730a3" },
  DELIVERED: { fr: "Livre", ar: "\u062A\u0645 \u0627\u0644\u062A\u0633\u0644\u064A\u0645", fond: "#a7f3d0", texte: "#065f46" },
  RETURNED: { fr: "Retourne", ar: "\u0645\u064F\u0631\u062C\u0639", fond: "#fee2e2", texte: "#991b1b" },
  CANCELED: { fr: "Annule", ar: "\u0645\u0644\u063A\u0649", fond: "#fee2e2", texte: "#991b1b" },
};

// Colis techniques crees par Sendit : ni clients, ni montants
function estTechnique(c: Colis) {
  const commentaire = String(c.commentaire || "").toLowerCase();
  if (commentaire.includes("g\u00E9n\u00E9r\u00E9 par syst")) return true;
  if (commentaire.includes("genere par syst")) return true;
  return String(c.code || "").toUpperCase().startsWith("DYH");
}

function propre(valeur: string) {
  const v = String(valeur || "").trim();
  if (v === "'-" || v === ";" || v === "-") return "";
  return v;
}

export default function ColisSenditClient() {
  const { lang } = useLang();
  const ar = lang === "ar";
  const L = (fr: string, arabe: string) => (ar ? arabe : fr);

  const [colis, setColis] = useState<Colis[]>([]);
  const [chargement, setChargement] = useState(true);
  const [occupe, setOccupe] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [jours, setJours] = useState(45);
  const [techniques, setTechniques] = useState(false);
  const [seulementEchanges, setSeulementEchanges] = useState(false);

  async function charger(nbJours: number) {
    setChargement(true);
    setMessage(null);

    try {
      const res: Response = await fetch(`/api/sendit/colis?jours=${nbJours}`);
      const data: any = await res.json();

      if (res.ok) setColis(Array.isArray(data.colis) ? data.colis : []);
      else setMessage(data?.error || "Erreur");
    } catch (e: any) {
      setMessage(e?.message ?? "Erreur de connexion");
    } finally {
      setChargement(false);
    }
  }

  useEffect(() => {
    charger(jours);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jours]);

  async function importer(c: Colis, action: "creer" | "rattacher") {
    const question =
      action === "rattacher"
        ? L(
            `Rattacher le colis ${c.code} \u00E0 la commande ${c.commandeNumero} ?`,
            "\u0631\u0628\u0637 \u061F"
          )
        : L(`Cr\u00E9er une commande pour le colis ${c.code} ?`, "\u0625\u0646\u0634\u0627\u0621 \u061F");

    const ok = window.confirm(question);
    if (!ok) return;

    setOccupe(c.code);
    setMessage(null);

    try {
      const res: Response = await fetch("/api/sendit/colis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          code: c.code,
          orderId: c.commandeId,
          nom: propre(c.nom),
          telephone: propre(c.telephone),
          ville: c.ville,
          districtId: c.districtId,
          produits: c.produits,
          commentaire: propre(c.commentaire),
          montant: c.montant,
          frais: c.frais,
          statut: c.statut,
          echange: c.echange,
          date: c.date,
        }),
      });

      const data: any = await res.json();

      if (res.ok) {
        setMessage(
          action === "rattacher"
            ? L(
                `Colis ${c.code} rattach\u00E9 \u00E0 la commande ${c.commandeNumero}`,
                "\u062A\u0645 \u0627\u0644\u0631\u0628\u0637"
              )
            : L(
                `Commande cr\u00E9\u00E9e : ${data?.order?.numero || c.code}`,
                "\u062A\u0645 \u0627\u0644\u0625\u0646\u0634\u0627\u0621"
              )
        );
        setColis((liste) => liste.filter((x) => x.code !== c.code));
      } else {
        setMessage(data?.error || "Erreur");
      }
    } catch (e: any) {
      setMessage(e?.message ?? "Erreur de connexion");
    } finally {
      setOccupe(null);
    }
  }

  const visibles = colis.filter((c) => {
    if (!techniques && estTechnique(c)) return false;
    if (seulementEchanges && !c.echange) return false;
    return true;
  });

  const nbTechniques = colis.filter(estTechnique).length;
  const nbEchanges = colis.filter((c) => c.echange && !estTechnique(c)).length;

  return (
    <div>
      <div className="page-header">
        <h1>{L("Colis cr\u00E9\u00E9s sur Sendit", "\u0637\u0631\u0648\u062F \u0633\u0646\u062F\u064A\u062A")}</h1>
        <button className="btn-primary" onClick={() => charger(jours)} disabled={chargement}>
          {chargement ? L("Chargement...", "\u062C\u0627\u0631\u064D") : L("Actualiser", "\u062A\u062D\u062F\u064A\u062B")}
        </button>
      </div>

      <div
        style={{
          background: ROSE_PALE,
          border: `1px solid ${ROSE_CLAIR}`,
          borderRadius: 12,
          padding: "11px 14px",
          marginBottom: 14,
          fontSize: 13,
          color: ROSE_FONCE,
          lineHeight: 1.5,
        }}
      >
        {L(
          "Ces colis existent chez Sendit mais pas dans l'application : vous les avez cr\u00E9\u00E9s \u00E0 la main. Importez-les pour qu'ils soient suivis et comptabilis\u00E9s. Le stock n'est pas touch\u00E9.",
          "\u0647\u0630\u0647 \u0627\u0644\u0637\u0631\u0648\u062F \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629 \u0641\u064A \u0627\u0644\u062A\u0637\u0628\u064A\u0642"
        )}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        <button
          type="button"
          className={jours === 45 ? "btn-primary" : "btn-secondary"}
          onClick={() => setJours(45)}
          style={petitBouton}
        >
          {L("45 jours", "45")}
        </button>
        <button
          type="button"
          className={jours === 15 ? "btn-primary" : "btn-secondary"}
          onClick={() => setJours(15)}
          style={petitBouton}
        >
          {L("15 jours", "15")}
        </button>
        <button
          type="button"
          className={jours === 7 ? "btn-primary" : "btn-secondary"}
          onClick={() => setJours(7)}
          style={petitBouton}
        >
          {L("7 jours", "7")}
        </button>
        <button
          type="button"
          className={seulementEchanges ? "btn-primary" : "btn-secondary"}
          onClick={() => setSeulementEchanges(!seulementEchanges)}
          style={petitBouton}
        >
          {L("\u00C9changes seulement", "\u0627\u0644\u062A\u0628\u0627\u062F\u0644 \u0641\u0642\u0637")} ({nbEchanges})
        </button>
        {nbTechniques > 0 && (
          <button
            type="button"
            className={techniques ? "btn-primary" : "btn-secondary"}
            onClick={() => setTechniques(!techniques)}
            style={petitBouton}
          >
            {L("Colis techniques", "\u062A\u0642\u0646\u064A")} ({nbTechniques})
          </button>
        )}
      </div>

      {message && <p className="sync-msg">{message}</p>}

      {chargement ? (
        <p>...</p>
      ) : visibles.length === 0 ? (
        <p className="empty">
          {L(
            "Aucun colis cr\u00E9\u00E9 \u00E0 la main sur cette p\u00E9riode",
            "\u0644\u0627 \u062A\u0648\u062C\u062F"
          )}
        </p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{L("Date", "\u0627\u0644\u062A\u0627\u0631\u064A\u062E")}</th>
                <th>{L("Colis", "\u0627\u0644\u0637\u0631\u062F")}</th>
                <th>{L("Client", "\u0627\u0644\u0632\u0628\u0648\u0646")}</th>
                <th>{L("T\u00E9l\u00E9phone", "\u0627\u0644\u0647\u0627\u062A\u0641")}</th>
                <th>{L("Ville", "\u0627\u0644\u0645\u062F\u064A\u0646\u0629")}</th>
                <th>{L("Articles", "\u0627\u0644\u0645\u0646\u062A\u062C\u0627\u062A")}</th>
                <th>{L("Montant", "\u0627\u0644\u0645\u0628\u0644\u063A")}</th>
                <th>{L("Frais", "\u0627\u0644\u0631\u0633\u0648\u0645")}</th>
                <th>{L("Suivi", "\u0627\u0644\u062A\u062A\u0628\u0639")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((c) => {
                const info = STATUTS[String(c.statut || "").toUpperCase()];
                const enCours = occupe === c.code;

                return (
                  <tr key={c.code} style={{ background: c.echange ? "#fff7ed" : undefined }}>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {c.date ? String(c.date).slice(0, 10) : "-"}
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: 12 }}>{c.code}</div>
                      {c.echange && (
                        <span
                          style={{ ...pastille, background: "#fed7aa", color: "#9a3412", marginTop: 4 }}
                        >
                          {L("\u00C9change", "\u062A\u0628\u0627\u062F\u0644")}
                        </span>
                      )}
                      {c.reference ? (
                        <div style={{ fontSize: 10, color: "#8a6b6c", marginTop: 3 }}>
                          {L("R\u00E9f.", "\u0645\u0631\u062C\u0639")} {c.reference}
                        </div>
                      ) : null}
                    </td>
                    <td>{propre(c.nom) || "-"}</td>
                    <td>{propre(c.telephone) || "-"}</td>
                    <td>{c.ville || "-"}</td>
                    <td style={{ maxWidth: 260, fontSize: 12 }}>
                      {c.produits || "-"}
                      {propre(c.commentaire) ? (
                        <div style={{ color: "#8a6b6c", fontSize: 11, marginTop: 3 }}>
                          {propre(c.commentaire)}
                        </div>
                      ) : null}
                    </td>
                    <td style={{ fontWeight: 700 }}>{c.montant}</td>
                    <td style={{ color: "#0369a1", fontWeight: 700 }}>{c.frais}</td>
                    <td>
                      <span
                        style={{
                          ...pastille,
                          background: info ? info.fond : "#e2e8f0",
                          color: info ? info.texte : "#475569",
                        }}
                      >
                        {info ? L(info.fr, info.ar) : c.statut || "-"}
                      </span>
                    </td>
                    <td>
                      {c.commandeId ? (
                        <button
                          type="button"
                          style={boutonRattacher}
                          onClick={() => importer(c, "rattacher")}
                          disabled={enCours}
                        >
                          {enCours
                            ? "..."
                            : L(`Rattacher \u00E0 ${c.commandeNumero}`, "\u0631\u0628\u0637")}
                        </button>
                      ) : (
                        <button
                          type="button"
                          style={boutonCreer}
                          onClick={() => importer(c, "creer")}
                          disabled={enCours}
                        >
                          {enCours ? "..." : L("Cr\u00E9er la commande", "\u0625\u0646\u0634\u0627\u0621")}
                        </button>
                      )}
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
