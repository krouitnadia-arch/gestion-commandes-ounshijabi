"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLang } from "./LangProvider";
import { STATUS_CONFIG } from "@/lib/statusConfig";

type Donnees = {
  commandes: {
    totalMois: number;
    jour: number;
    semaine: number;
    web: number;
    instagram: number;
    parStatut: { [cle: string]: number };
  };
  chiffreAffaires: { jour: number; semaine: number; mois: number; fraisMois: number };
  magasin: { nombre: number; caMois: number; caJour: number; resteAEncaisser: number };
  stock: {
    variantes: number;
    articles: number;
    pieces: number;
    valeur: number;
    ruptures: number;
    locaux: number;
  };
};

const carte = {
  background: "white",
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  padding: 18,
  minWidth: 180,
  flex: 1,
} as const;

const grandNombre = { fontSize: 26, fontWeight: 800, marginTop: 6 } as const;
const libelle = { fontSize: 12, color: "#64748b", fontWeight: 600 } as const;

export default function AccueilClient({ nom }: { nom: string }) {
  const { lang } = useLang();
  const ar = lang === "ar";
  const L = (fr: string, arabe: string) => (ar ? arabe : fr);

  const [d, setD] = useState<Donnees | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    async function charger() {
      try {
        const res: Response = await fetch("/api/tableau-bord");
        const data: any = await res.json();
        if (res.ok) setD(data);
        else setErreur(data?.error || "Erreur");
      } catch (e: any) {
        setErreur(e?.message ?? "Erreur");
      }
    }
    charger();
  }, []);

  const rubriques = [
    {
      href: "/commandes",
      fr: "Commandes",
      ar: "\u0627\u0644\u0637\u0644\u0628\u0627\u062A",
      descFr: "Recevoir, confirmer par WhatsApp, suivre les statuts",
      descAr: "\u0627\u0644\u0637\u0644\u0628\u0627\u062A",
      fond: "#eef2ff",
      texte: "#3730a3",
    },
    {
      href: "/expedition",
      fr: "Expedition",
      ar: "\u0627\u0644\u0634\u062D\u0646",
      descFr: "Envoyer les colis a Sendit et suivre les livraisons",
      descAr: "\u0627\u0644\u0634\u062D\u0646",
      fond: "#ecfeff",
      texte: "#155e75",
    },
    {
      href: "/magasin",
      fr: "Magasin",
      ar: "\u0627\u0644\u0645\u062A\u062C\u0631",
      descFr: "Enregistrer les ventes en boutique et leurs avances",
      descAr: "\u0627\u0644\u0645\u0628\u064A\u0639\u0627\u062A",
      fond: "#f0fdf4",
      texte: "#166534",
    },
    {
      href: "/stock",
      fr: "Stock",
      ar: "\u0627\u0644\u0645\u062E\u0632\u0648\u0646",
      descFr: "Quantites du site, du magasin et autres articles",
      descAr: "\u0627\u0644\u0645\u062E\u0632\u0648\u0646",
      fond: "#fff7ed",
      texte: "#9a3412",
    },
  ];

  return (
    <div>
      <div className="page-header">
        <h1>{L(`Bonjour ${nom}`, `\u0645\u0631\u062D\u0628\u0627 ${nom}`)}</h1>
      </div>

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 28 }}>
        {rubriques.map((r) => (
          <Link
            key={r.href}
            href={r.href}
            style={{
              ...carte,
              background: r.fond,
              textDecoration: "none",
              color: r.texte,
              minWidth: 220,
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 800 }}>{ar ? r.ar : r.fr}</div>
            <div style={{ fontSize: 12, marginTop: 6, opacity: 0.85 }}>
              {ar ? r.descAr : r.descFr}
            </div>
          </Link>
        ))}
      </div>

      <h2 style={{ fontSize: 17, marginBottom: 12 }}>
        {L("Tableau de bord - 30 derniers jours", "\u0644\u0648\u062D\u0629 \u0627\u0644\u0645\u0639\u0644\u0648\u0645\u0627\u062A")}
      </h2>

      {erreur && <p className="sync-msg">{erreur}</p>}
      {!d && !erreur && <p>...</p>}

      {d && (
        <div>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 16 }}>
            <div style={carte}>
              <div style={libelle}>
                {L("Chiffre d'affaires du mois", "\u0631\u0642\u0645 \u0627\u0644\u0645\u0639\u0627\u0645\u0644\u0627\u062A")}
              </div>
              <div style={{ ...grandNombre, color: "#166534" }}>{d.chiffreAffaires.mois}</div>
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                {L("articles seuls, hors livraison", "\u0628\u062F\u0648\u0646 \u0627\u0644\u062A\u0648\u0635\u064A\u0644")}
              </div>
            </div>

            <div style={carte}>
              <div style={libelle}>{L("Dont cette semaine", "\u0647\u0630\u0627 \u0627\u0644\u0623\u0633\u0628\u0648\u0639")}</div>
              <div style={grandNombre}>{d.chiffreAffaires.semaine}</div>
            </div>

            <div style={carte}>
              <div style={libelle}>{L("Dont aujourd'hui", "\u0627\u0644\u064A\u0648\u0645")}</div>
              <div style={grandNombre}>{d.chiffreAffaires.jour}</div>
            </div>

            <div style={carte}>
              <div style={libelle}>
                {L("Frais de livraison du mois", "\u0631\u0633\u0648\u0645 \u0627\u0644\u062A\u0648\u0635\u064A\u0644")}
              </div>
              <div style={{ ...grandNombre, color: "#0369a1" }}>{d.chiffreAffaires.fraisMois}</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 16 }}>
            <div style={carte}>
              <div style={libelle}>{L("Commandes du mois", "\u0637\u0644\u0628\u0627\u062A \u0627\u0644\u0634\u0647\u0631")}</div>
              <div style={grandNombre}>{d.commandes.totalMois}</div>
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                {L(
                  `${d.commandes.web} site - ${d.commandes.instagram} Instagram`,
                  `${d.commandes.web} / ${d.commandes.instagram}`
                )}
              </div>
            </div>

            <div style={carte}>
              <div style={libelle}>{L("Cette semaine", "\u0647\u0630\u0627 \u0627\u0644\u0623\u0633\u0628\u0648\u0639")}</div>
              <div style={grandNombre}>{d.commandes.semaine}</div>
            </div>

            <div style={carte}>
              <div style={libelle}>{L("Aujourd'hui", "\u0627\u0644\u064A\u0648\u0645")}</div>
              <div style={grandNombre}>{d.commandes.jour}</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 22 }}>
            {Object.keys(d.commandes.parStatut).map((s) => {
              const info = STATUS_CONFIG[s];
              return (
                <span
                  key={s}
                  style={{
                    display: "inline-block",
                    padding: "6px 12px",
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 700,
                    background: info ? info.bg : "#e2e8f0",
                    color: info ? info.color : "#475569",
                  }}
                >
                  {info ? (ar ? info.labelAr : info.labelFr) : s} : {d.commandes.parStatut[s]}
                </span>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 16 }}>
            <div style={carte}>
              <div style={libelle}>{L("Ventes magasin du mois", "\u0645\u0628\u064A\u0639\u0627\u062A \u0627\u0644\u0645\u062A\u062C\u0631")}</div>
              <div style={grandNombre}>{d.magasin.caMois}</div>
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                {L(`${d.magasin.nombre} vente(s)`, `${d.magasin.nombre}`)}
              </div>
            </div>

            <div style={carte}>
              <div style={libelle}>{L("Ventes aujourd'hui", "\u0627\u0644\u064A\u0648\u0645")}</div>
              <div style={grandNombre}>{d.magasin.caJour}</div>
            </div>

            <div style={carte}>
              <div style={libelle}>{L("Reste a encaisser", "\u0627\u0644\u0628\u0627\u0642\u064A")}</div>
              <div style={{ ...grandNombre, color: d.magasin.resteAEncaisser > 0 ? "#b45309" : "#166534" }}>
                {d.magasin.resteAEncaisser}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <div style={carte}>
              <div style={libelle}>{L("Articles en stock", "\u0627\u0644\u0645\u0646\u062A\u062C\u0627\u062A")}</div>
              <div style={grandNombre}>{d.stock.articles}</div>
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                {L(`${d.stock.variantes} variantes`, `${d.stock.variantes}`)}
              </div>
            </div>

            <div style={carte}>
              <div style={libelle}>{L("Pieces disponibles", "\u0627\u0644\u0642\u0637\u0639")}</div>
              <div style={grandNombre}>{d.stock.pieces}</div>
            </div>

            <div style={carte}>
              <div style={libelle}>{L("Valeur du stock", "\u0642\u064A\u0645\u0629 \u0627\u0644\u0645\u062E\u0632\u0648\u0646")}</div>
              <div style={{ ...grandNombre, color: "#3730a3" }}>{d.stock.valeur}</div>
            </div>

            <div style={carte}>
              <div style={libelle}>{L("Variantes en rupture", "\u0646\u0641\u0627\u062F")}</div>
              <div style={{ ...grandNombre, color: d.stock.ruptures > 0 ? "#b91c1c" : "#166534" }}>
                {d.stock.ruptures}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
