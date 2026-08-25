"use client";

import { useEffect, useState } from "react";
import { useLang } from "./LangProvider";
import { STATUS_CONFIG } from "@/lib/statusConfig";

const ROSE = "#c78283";
const ROSE_FONCE = "#a45f60";
const ROSE_CLAIR = "#f3d9dc";
const ROSE_PALE = "#fdf6f7";

type ProduitCmd = {
  nom: string;
  quantite: number;
  total: any;
  couleur?: string;
  taille?: string;
};

type Commande = {
  id: string;
  numero: string;
  clientNom: string;
  clientTelephone: string;
  clientVille: string | null;
  senditCode: string | null;
  statut: string;
  total: number;
  dateCommande: string;
  produits: ProduitCmd[];
};

type LigneRetour = {
  nom: string;
  couleur: string | null;
  taille: string | null;
  quantite: number;
  montant: number;
  destination: string;
};

type Retour = {
  id: string;
  date: string;
  numero: string | null;
  senditCode: string | null;
  clientNom: string | null;
  lignes: LigneRetour[];
  total: number;
  complet: boolean;
  notes: string | null;
  agent: string | null;
};

type Choix = { coche: boolean; quantite: number; destination: string };

const pastille = {
  display: "inline-block",
  padding: "3px 9px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 700,
  whiteSpace: "nowrap",
} as const;

export default function RetoursClient() {
  const { lang } = useLang();
  const ar = lang === "ar";
  const L = (fr: string, arabe: string) => (ar ? arabe : fr);

  const [recherche, setRecherche] = useState("");
  const [resultats, setResultats] = useState<Commande[]>([]);
  const [commande, setCommande] = useState<Commande | null>(null);
  const [choix, setChoix] = useState<{ [index: number]: Choix }>({});
  const [notes, setNotes] = useState("");
  const [retours, setRetours] = useState<Retour[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [chargement, setChargement] = useState(false);

  async function chargerRetours() {
    const res: Response = await fetch("/api/retours");
    if (res.ok) setRetours(await res.json());
  }

  useEffect(() => {
    chargerRetours();
  }, []);

  async function chercher() {
    const q = recherche.trim();
    if (q.length < 2) return;

    setChargement(true);
    setMessage(null);

    try {
      const res: Response = await fetch(`/api/retours?recherche=${encodeURIComponent(q)}`);
      const data: any = await res.json();

      if (res.ok) {
        setResultats(data.commandes || []);
        if ((data.commandes || []).length === 0) {
          setMessage(L("Aucune commande trouv\u00E9e", "\u0644\u0627 \u062A\u0648\u062C\u062F"));
        }
      } else {
        setMessage(data?.error || "Erreur");
      }
    } catch (e: any) {
      setMessage(e?.message ?? "Erreur de connexion");
    } finally {
      setChargement(false);
    }
  }

  function selectionner(c: Commande) {
    setCommande(c);
    setResultats([]);
    setNotes("");

    const initial: { [index: number]: Choix } = {};
    (c.produits || []).forEach((p, i) => {
      initial[i] = {
        coche: true,
        quantite: Math.max(1, Number(p.quantite) || 1),
        destination: "SITE",
      };
    });
    setChoix(initial);
  }

  function majChoix(index: number, champ: keyof Choix, valeur: any) {
    setChoix({ ...choix, [index]: { ...choix[index], [champ]: valeur } });
  }

  function toutVers(destination: string) {
    const copie: { [index: number]: Choix } = {};
    Object.keys(choix).forEach((k) => {
      const i = Number(k);
      copie[i] = { ...choix[i], destination };
    });
    setChoix(copie);
  }

  function montantLigne(p: ProduitCmd, index: number) {
    const c = choix[index];
    if (!c || !c.coche) return 0;
    const quantiteCommande = Math.max(1, Number(p.quantite) || 1);
    const montant = Number(p.total) || 0;
    return (montant / quantiteCommande) * (Number(c.quantite) || 0);
  }

  const totalRetour = (commande?.produits || []).reduce(
    (somme, p, i) => somme + montantLigne(p, i),
    0
  );

  const nbCoches = Object.keys(choix).filter((k) => choix[Number(k)]?.coche).length;

  async function enregistrer() {
    if (!commande || nbCoches === 0) return;

    setEnvoi(true);
    setMessage(null);

    const lignes = Object.keys(choix)
      .map((k) => Number(k))
      .filter((i) => choix[i].coche)
      .map((i) => ({
        index: i,
        quantite: choix[i].quantite,
        destination: choix[i].destination,
      }));

    try {
      const res: Response = await fetch("/api/retours", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: commande.id, lignes, notes }),
      });

      const data: any = await res.json();

      if (res.ok) {
        setMessage(
          L("Retour enregistr\u00E9, articles remis en stock", "\u062A\u0645 \u0627\u0644\u062A\u0633\u062C\u064A\u0644")
        );
        if (data?.avertissements?.length > 0) setMessage(data.avertissements.join(" | "));
        setCommande(null);
        setChoix({});
        setRecherche("");
        setNotes("");
        chargerRetours();
      } else {
        setMessage(data?.error || "Erreur");
      }
    } catch (e: any) {
      setMessage(e?.message ?? "Erreur de connexion");
    } finally {
      setEnvoi(false);
    }
  }

  async function annulerRetour(r: Retour) {
    const ok = window.confirm(
      L(
        "Annuler ce retour ? Les pieces repartiront du stock.",
        "\u0625\u0644\u063A\u0627\u0621 \u061F"
      )
    );
    if (!ok) return;

    await fetch(`/api/retours?id=${r.id}`, { method: "DELETE" });
    chargerRetours();
  }

  function boutonDestination(index: number, valeur: string, texte: string) {
    const actif = choix[index]?.destination === valeur;
    return (
      <button
        type="button"
        onClick={() => majChoix(index, "destination", valeur)}
        style={{
          border: `1px solid ${actif ? ROSE : ROSE_CLAIR}`,
          background: actif ? ROSE : "#ffffff",
          color: actif ? "#ffffff" : ROSE_FONCE,
          borderRadius: 6,
          padding: "4px 10px",
          fontSize: 11,
          fontWeight: 700,
          cursor: "pointer",
          marginInlineEnd: 4,
        }}
      >
        {texte}
      </button>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>{L("Retours", "\u0627\u0644\u0645\u0631\u062A\u062C\u0639\u0627\u062A")}</h1>
      </div>

      {message && <p className="sync-msg">{message}</p>}

      <div className="stock-form">
        <input
          placeholder={L(
            "Code du colis, num\u00E9ro de commande, nom ou t\u00E9l\u00E9phone...",
            "\u0631\u0645\u0632 \u0627\u0644\u0637\u0631\u062F"
          )}
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              chercher();
            }
          }}
          style={{ minWidth: 320 }}
        />
        <button type="button" className="btn-primary" onClick={chercher} disabled={chargement}>
          {chargement ? "..." : L("Rechercher", "\u0628\u062D\u062B")}
        </button>
      </div>

      {resultats.length > 0 && (
        <div className="table-wrap" style={{ marginBottom: 18 }}>
          <table>
            <thead>
              <tr>
                <th>{L("Colis", "\u0627\u0644\u0637\u0631\u062F")}</th>
                <th>{L("N\u00B0 commande", "\u0631\u0642\u0645 \u0627\u0644\u0637\u0644\u0628")}</th>
                <th>{L("Client", "\u0627\u0644\u0632\u0628\u0648\u0646")}</th>
                <th>{L("Ville", "\u0627\u0644\u0645\u062F\u064A\u0646\u0629")}</th>
                <th>{L("Total", "\u0627\u0644\u0645\u062C\u0645\u0648\u0639")}</th>
                <th>{L("Statut", "\u0627\u0644\u062D\u0627\u0644\u0629")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {resultats.map((c) => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 700 }}>{c.senditCode || "-"}</td>
                  <td>{c.numero}</td>
                  <td>{c.clientNom}</td>
                  <td>{c.clientVille || "-"}</td>
                  <td>{c.total}</td>
                  <td>
                    <span
                      style={{
                        ...pastille,
                        background: STATUS_CONFIG[c.statut]?.bg || "#eee",
                        color: STATUS_CONFIG[c.statut]?.color || "#475569",
                      }}
                    >
                      {STATUS_CONFIG[c.statut]
                        ? ar
                          ? STATUS_CONFIG[c.statut].labelAr
                          : STATUS_CONFIG[c.statut].labelFr
                        : c.statut}
                    </span>
                  </td>
                  <td>
                    <button type="button" className="btn-primary" onClick={() => selectionner(c)}>
                      {L("Choisir", "\u0627\u062E\u062A\u064A\u0627\u0631")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {commande && (
        <div
          style={{
            background: ROSE_PALE,
            border: `1px solid ${ROSE_CLAIR}`,
            borderRadius: 14,
            padding: 18,
            marginBottom: 26,
          }}
        >
          <div style={{ marginBottom: 12, fontSize: 14, color: ROSE_FONCE, fontWeight: 700 }}>
            {L("Commande", "\u0627\u0644\u0637\u0644\u0628")} {commande.numero}
            {commande.senditCode ? ` - ${commande.senditCode}` : ""} - {commande.clientNom}
          </div>

          <div style={{ marginBottom: 10 }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => toutVers("SITE")}
              style={{ padding: "6px 12px", fontSize: 12, marginInlineEnd: 6 }}
            >
              {L("Tout vers le Site", "\u0627\u0644\u0643\u0644 \u0644\u0644\u0645\u0648\u0642\u0639")}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => toutVers("MAGASIN")}
              style={{ padding: "6px 12px", fontSize: 12 }}
            >
              {L("Tout vers le Magasin", "\u0627\u0644\u0643\u0644 \u0644\u0644\u0645\u062A\u062C\u0631")}
            </button>
          </div>

          <div className="table-wrap" style={{ marginBottom: 12 }}>
            <table>
              <thead>
                <tr>
                  <th>{L("Retour", "\u0645\u0631\u062A\u062C\u0639")}</th>
                  <th>{L("Article", "\u0627\u0644\u0645\u0646\u062A\u062C")}</th>
                  <th>{L("Couleur", "\u0627\u0644\u0644\u0648\u0646")}</th>
                  <th>{L("Taille", "\u0627\u0644\u0645\u0642\u0627\u0633")}</th>
                  <th>{L("Command\u00E9", "\u0627\u0644\u0643\u0645\u064A\u0629")}</th>
                  <th>{L("Quantit\u00E9 retourn\u00E9e", "\u0627\u0644\u0645\u0631\u062A\u062C\u0639")}</th>
                  <th>{L("Destination du stock", "\u0627\u0644\u0648\u062C\u0647\u0629")}</th>
                  <th>{L("Montant", "\u0627\u0644\u0645\u0628\u0644\u063A")}</th>
                </tr>
              </thead>
              <tbody>
                {(commande.produits || []).map((p, i) => (
                  <tr key={i} style={{ opacity: choix[i]?.coche ? 1 : 0.45 }}>
                    <td>
                      <input
                        type="checkbox"
                        checked={choix[i]?.coche || false}
                        onChange={(e) => majChoix(i, "coche", e.target.checked)}
                        style={{ width: 18, height: 18 }}
                      />
                    </td>
                    <td>{p.nom}</td>
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
                    <td>{p.quantite}</td>
                    <td>
                      <input
                        type="number"
                        min={1}
                        max={Math.max(1, Number(p.quantite) || 1)}
                        value={choix[i]?.quantite ?? 1}
                        onChange={(e) => majChoix(i, "quantite", Number(e.target.value) || 1)}
                        className="notes-input"
                        style={{ width: 70 }}
                        disabled={!choix[i]?.coche}
                      />
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {boutonDestination(i, "SITE", L("Site", "\u0627\u0644\u0645\u0648\u0642\u0639"))}
                      {boutonDestination(i, "MAGASIN", L("Magasin", "\u0627\u0644\u0645\u062A\u062C\u0631"))}
                    </td>
                    <td style={{ fontWeight: 700 }}>{Math.round(montantLigne(p, i))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="stock-form" style={{ marginBottom: 0 }}>
            <input
              placeholder={L("Note sur ce retour", "\u0645\u0644\u0627\u062D\u0638\u0629")}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{ minWidth: 260 }}
            />
            <div style={{ display: "flex", alignItems: "center", fontWeight: 800, color: "#b91c1c" }}>
              {L("Montant du retour", "\u0645\u0628\u0644\u063A \u0627\u0644\u0645\u0631\u062A\u062C\u0639")} :{" "}
              {Math.round(totalRetour)}
            </div>
            <button
              type="button"
              className="btn-primary"
              onClick={enregistrer}
              disabled={envoi || nbCoches === 0}
            >
              {envoi
                ? "..."
                : L("Enregistrer le retour", "\u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u0645\u0631\u062A\u062C\u0639")}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setCommande(null);
                setChoix({});
              }}
            >
              {L("Annuler", "\u0625\u0644\u063A\u0627\u0621")}
            </button>
          </div>
        </div>
      )}

      <h2 style={{ fontSize: 16, marginTop: 10, color: ROSE_FONCE }}>
        {L("Historique des retours", "\u0633\u062C\u0644 \u0627\u0644\u0645\u0631\u062A\u062C\u0639\u0627\u062A")}
      </h2>

      {retours.length === 0 ? (
        <p className="empty">{L("Aucun retour", "\u0644\u0627 \u062A\u0648\u062C\u062F")}</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{L("Date", "\u0627\u0644\u062A\u0627\u0631\u064A\u062E")}</th>
                <th>{L("Colis", "\u0627\u0644\u0637\u0631\u062F")}</th>
                <th>{L("N\u00B0 commande", "\u0631\u0642\u0645 \u0627\u0644\u0637\u0644\u0628")}</th>
                <th>{L("Client", "\u0627\u0644\u0632\u0628\u0648\u0646")}</th>
                <th>{L("Articles", "\u0627\u0644\u0645\u0646\u062A\u062C\u0627\u062A")}</th>
                <th>{L("Destination", "\u0627\u0644\u0648\u062C\u0647\u0629")}</th>
                <th>{L("Montant", "\u0627\u0644\u0645\u0628\u0644\u063A")}</th>
                <th>{L("Note", "\u0645\u0644\u0627\u062D\u0638\u0629")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {retours.map((r) => (
                <tr key={r.id}>
                  <td>{new Date(r.date).toLocaleDateString(ar ? "ar" : "fr-FR")}</td>
                  <td style={{ fontWeight: 700 }}>{r.senditCode || "-"}</td>
                  <td>{r.numero || "-"}</td>
                  <td>{r.clientNom || "-"}</td>
                  <td>
                    {r.lignes?.map((l, i) => (
                      <div key={i}>
                        {l.nom} x {l.quantite}
                        {l.couleur ? ` - ${l.couleur}` : ""}
                        {l.taille ? ` - ${l.taille}` : ""}
                      </div>
                    ))}
                  </td>
                  <td>
                    {r.lignes?.map((l, i) => (
                      <div key={i}>
                        <span
                          style={{
                            ...pastille,
                            background: l.destination === "MAGASIN" ? "#ede9fe" : "#e0f2fe",
                            color: l.destination === "MAGASIN" ? "#5b21b6" : "#0369a1",
                          }}
                        >
                          {l.destination === "MAGASIN"
                            ? L("Magasin", "\u0627\u0644\u0645\u062A\u062C\u0631")
                            : L("Site", "\u0627\u0644\u0645\u0648\u0642\u0639")}
                        </span>
                      </div>
                    ))}
                  </td>
                  <td style={{ fontWeight: 800, color: "#b91c1c" }}>{Math.round(r.total)}</td>
                  <td>{r.notes || "-"}</td>
                  <td>
                    <button
                      type="button"
                      className="btn-link danger"
                      onClick={() => annulerRetour(r)}
                    >
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
  );
}
