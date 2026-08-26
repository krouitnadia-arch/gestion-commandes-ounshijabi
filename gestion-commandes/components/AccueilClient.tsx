"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLang } from "./LangProvider";
import { STATUS_CONFIG } from "@/lib/statusConfig";
import {
  IconeCommandes,
  IconeExpedition,
  IconeRetours,
  IconeMagasin,
  IconeStock,
  IconeChiffres,
} from "./Icones";

const ROSE_FONCE = "#A45F60";
const ROSE_CLAIR = "#F3D9DC";
const ROSE_PALE = "#FDF6F7";

type Donnees = {
  commandes: {
    totalMois: number;
    jour: number;
    semaine: number;
    web: number;
    instagram: number;
    parStatut: { [cle: string]: number };
  };
  chiffreAffaires: {
    jour: number;
    semaine: number;
    mois: number;
    fraisMois: number;
    netJour: number;
    netSemaine: number;
    netMois: number;
  };
  retours: { nombre: number; mois: number; semaine: number; jour: number };
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

type Indicateur = { libelle: string; valeur: number | string; couleur?: string; note?: string };

export default function AccueilClient({ nom, role }: { nom: string; role: string }) {
  const { lang } = useLang();
  const ar = lang === "ar";
  const L = (fr: string, arabe: string) => (ar ? arabe : fr);

  // Le tableau de bord n'est visible que par l'administratrice
  const voirTableauBord = role === "ADMIN";

  const [d, setD] = useState<Donnees | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [onglet, setOnglet] = useState("ca");

  useEffect(() => {
    if (!voirTableauBord) return;

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
  }, [voirTableauBord]);

  const rubriques = [
    {
      href: "/commandes",
      fr: "Commandes",
      ar: "\u0627\u0644\u0637\u0644\u0628\u0627\u062A",
      descFr: "Recevoir, confirmer par WhatsApp, suivre les statuts",
      descAr: "\u0627\u0633\u062A\u0642\u0628\u0627\u0644 \u0648\u062A\u0623\u0643\u064A\u062F \u0627\u0644\u0637\u0644\u0628\u0627\u062A",
      Icone: IconeCommandes,
      roles: ["ADMIN", "EMPLOYE", "CONFIRMATION"],
    },
    {
      href: "/expedition",
      fr: "Exp\u00E9dition",
      ar: "\u0627\u0644\u0634\u062D\u0646",
      descFr: "Envoyer les colis \u00E0 Sendit et suivre les livraisons",
      descAr: "\u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0637\u0631\u0648\u062F \u0648\u0645\u062A\u0627\u0628\u0639\u062A\u0647\u0627",
      Icone: IconeExpedition,
      roles: ["ADMIN", "EMPLOYE", "EXPEDITION"],
    },
    {
      href: "/retours",
      fr: "Retours",
      ar: "\u0627\u0644\u0645\u0631\u062A\u062C\u0639\u0627\u062A",
      descFr: "Enregistrer les colis revenus et remettre les pi\u00E8ces en stock",
      descAr: "\u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u0645\u0631\u062A\u062C\u0639\u0627\u062A",
      Icone: IconeRetours,
      roles: ["ADMIN", "EMPLOYE", "EXPEDITION", "STOCK"],
    },
    {
      href: "/magasin",
      fr: "Magasin",
      ar: "\u0627\u0644\u0645\u062A\u062C\u0631",
      descFr: "Enregistrer les ventes en boutique et leurs avances",
      descAr: "\u062A\u0633\u062C\u064A\u0644 \u0645\u0628\u064A\u0639\u0627\u062A \u0627\u0644\u0645\u062A\u062C\u0631",
      Icone: IconeMagasin,
      roles: ["ADMIN", "EMPLOYE", "STOCK"],
    },
    {
      href: "/stock",
      fr: "Stock",
      ar: "\u0627\u0644\u0645\u062E\u0632\u0648\u0646",
      descFr: "Quantit\u00E9s du site, du magasin et autres articles",
      descAr: "\u0643\u0645\u064A\u0627\u062A \u0627\u0644\u0645\u0648\u0642\u0639 \u0648\u0627\u0644\u0645\u062A\u062C\u0631",
      Icone: IconeStock,
      roles: ["ADMIN", "EMPLOYE", "STOCK"],
    },
  ].filter((r) => r.roles.includes(role));

  const onglets = [
    {
      cle: "ca",
      fr: "Chiffre d'affaires",
      ar: "\u0631\u0642\u0645 \u0627\u0644\u0645\u0639\u0627\u0645\u0644\u0627\u062A",
      Icone: IconeChiffres,
    },
    {
      cle: "commandes",
      fr: "Commandes",
      ar: "\u0627\u0644\u0637\u0644\u0628\u0627\u062A",
      Icone: IconeCommandes,
    },
    {
      cle: "retours",
      fr: "Retours",
      ar: "\u0627\u0644\u0645\u0631\u062A\u062C\u0639\u0627\u062A",
      Icone: IconeRetours,
    },
    {
      cle: "magasin",
      fr: "Magasin",
      ar: "\u0627\u0644\u0645\u062A\u062C\u0631",
      Icone: IconeMagasin,
    },
    {
      cle: "stock",
      fr: "Stock",
      ar: "\u0627\u0644\u0645\u062E\u0632\u0648\u0646",
      Icone: IconeStock,
    },
  ];

  function indicateurs(): Indicateur[] {
    if (!d) return [];

    if (onglet === "ca")
      return [
        {
          libelle: L("Chiffre d'affaires net du mois", "\u0635\u0627\u0641\u064A \u0627\u0644\u0634\u0647\u0631"),
          valeur: d.chiffreAffaires.netMois,
          couleur: ROSE_FONCE,
          note: L("ventes - retours, hors livraison", "\u0628\u062F\u0648\u0646 \u0627\u0644\u062A\u0648\u0635\u064A\u0644"),
        },
        {
          libelle: L("Ventes du mois", "\u0645\u0628\u064A\u0639\u0627\u062A \u0627\u0644\u0634\u0647\u0631"),
          valeur: d.chiffreAffaires.mois,
        },
        {
          libelle: L("Retours du mois", "\u0645\u0631\u062A\u062C\u0639\u0627\u062A \u0627\u0644\u0634\u0647\u0631"),
          valeur: d.retours.mois,
          couleur: "#b91c1c",
          note: L(`${d.retours.nombre} retour(s)`, `${d.retours.nombre}`),
        },
        {
          libelle: L("Cette semaine (net)", "\u0647\u0630\u0627 \u0627\u0644\u0623\u0633\u0628\u0648\u0639"),
          valeur: d.chiffreAffaires.netSemaine,
        },
        {
          libelle: L("Aujourd'hui (net)", "\u0627\u0644\u064A\u0648\u0645"),
          valeur: d.chiffreAffaires.netJour,
        },
        {
          libelle: L("Frais de livraison du mois", "\u0631\u0633\u0648\u0645 \u0627\u0644\u062A\u0648\u0635\u064A\u0644"),
          valeur: d.chiffreAffaires.fraisMois,
          couleur: "#0369a1",
          note: L("pay\u00E9s \u00E0 Sendit", "\u062A\u062F\u0641\u0639 \u0644\u0633\u0646\u062F\u064A\u062A"),
        },
      ];

    if (onglet === "commandes")
      return [
        {
          libelle: L("Commandes du mois", "\u0637\u0644\u0628\u0627\u062A \u0627\u0644\u0634\u0647\u0631"),
          valeur: d.commandes.totalMois,
          couleur: ROSE_FONCE,
        },
        {
          libelle: L("Cette semaine", "\u0647\u0630\u0627 \u0627\u0644\u0623\u0633\u0628\u0648\u0639"),
          valeur: d.commandes.semaine,
        },
        {
          libelle: L("Aujourd'hui", "\u0627\u0644\u064A\u0648\u0645"),
          valeur: d.commandes.jour,
        },
        {
          libelle: L("Site web", "\u0627\u0644\u0645\u0648\u0642\u0639"),
          valeur: d.commandes.web,
        },
        {
          libelle: "Instagram",
          valeur: d.commandes.instagram,
        },
      ];

    if (onglet === "retours")
      return [
        {
          libelle: L("Montant des retours du mois", "\u0645\u0628\u0644\u063A \u0627\u0644\u0634\u0647\u0631"),
          valeur: d.retours.mois,
          couleur: "#b91c1c",
        },
        {
          libelle: L("Cette semaine", "\u0647\u0630\u0627 \u0627\u0644\u0623\u0633\u0628\u0648\u0639"),
          valeur: d.retours.semaine,
        },
        {
          libelle: L("Aujourd'hui", "\u0627\u0644\u064A\u0648\u0645"),
          valeur: d.retours.jour,
        },
        {
          libelle: L("Nombre de retours", "\u0639\u062F\u062F \u0627\u0644\u0645\u0631\u062A\u062C\u0639\u0627\u062A"),
          valeur: d.retours.nombre,
        },
      ];

    if (onglet === "magasin")
      return [
        {
          libelle: L("Ventes du mois", "\u0645\u0628\u064A\u0639\u0627\u062A \u0627\u0644\u0634\u0647\u0631"),
          valeur: d.magasin.caMois,
          couleur: ROSE_FONCE,
        },
        {
          libelle: L("Ventes aujourd'hui", "\u0627\u0644\u064A\u0648\u0645"),
          valeur: d.magasin.caJour,
        },
        {
          libelle: L("Nombre de ventes", "\u0639\u062F\u062F \u0627\u0644\u0645\u0628\u064A\u0639\u0627\u062A"),
          valeur: d.magasin.nombre,
        },
        {
          libelle: L("Reste \u00E0 encaisser", "\u0627\u0644\u0628\u0627\u0642\u064A"),
          valeur: d.magasin.resteAEncaisser,
          couleur: d.magasin.resteAEncaisser > 0 ? "#b45309" : "#166534",
        },
      ];

    return [
      {
        libelle: L("Articles", "\u0627\u0644\u0645\u0646\u062A\u062C\u0627\u062A"),
        valeur: d.stock.articles,
        couleur: ROSE_FONCE,
        note: L(`${d.stock.variantes} variantes`, `${d.stock.variantes}`),
      },
      {
        libelle: L("Pi\u00E8ces disponibles", "\u0627\u0644\u0642\u0637\u0639"),
        valeur: d.stock.pieces,
      },
      {
        libelle: L("Valeur du stock", "\u0642\u064A\u0645\u0629 \u0627\u0644\u0645\u062E\u0632\u0648\u0646"),
        valeur: d.stock.valeur,
      },
      {
        libelle: L("Variantes en rupture", "\u0646\u0641\u0627\u062F"),
        valeur: d.stock.ruptures,
        couleur: d.stock.ruptures > 0 ? "#b91c1c" : "#166534",
      },
      {
        libelle: L("Autres articles", "\u0645\u0646\u062A\u062C\u0627\u062A \u0623\u062E\u0631\u0649"),
        valeur: d.stock.locaux,
      },
    ];
  }

  return (
    <div>
      <div
        style={{
          background: ROSE_PALE,
          border: `1px solid ${ROSE_CLAIR}`,
          borderRadius: 16,
          padding: "26px 24px",
          marginBottom: 26,
          textAlign: "center",
        }}
      >
        <img
          src="/logo.svg"
          alt="Ouns Hijabi"
          style={{ width: "100%", maxWidth: 260, height: "auto" }}
        />
        <div style={{ marginTop: 10, fontSize: 16, fontWeight: 700, color: ROSE_FONCE }}>
          {L(`Bonjour ${nom}`, `\u0645\u0631\u062D\u0628\u0627 ${nom}`)}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
          gap: 14,
          marginBottom: 30,
        }}
      >
        {rubriques.map((r) => {
          const Icone = r.Icone;
          return (
            <Link
              key={r.href}
              href={r.href}
              style={{
                background: "#ffffff",
                border: `1px solid ${ROSE_CLAIR}`,
                borderRadius: 14,
                padding: 18,
                textDecoration: "none",
                color: ROSE_FONCE,
                display: "block",
              }}
            >
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  background: ROSE_CLAIR,
                  color: ROSE_FONCE,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 12,
                }}
              >
                <Icone taille={22} />
              </div>
              <div style={{ fontSize: 17, fontWeight: 800 }}>{ar ? r.ar : r.fr}</div>
              <div style={{ fontSize: 12, marginTop: 5, color: "#8a6b6c", lineHeight: 1.5 }}>
                {ar ? r.descAr : r.descFr}
              </div>
            </Link>
          );
        })}
      </div>

      {voirTableauBord && (
        <div>
          <h2 style={{ fontSize: 17, marginBottom: 12, color: ROSE_FONCE }}>
            {L(
              "Tableau de bord - 30 derniers jours",
              "\u0644\u0648\u062D\u0629 \u0627\u0644\u0645\u0639\u0644\u0648\u0645\u0627\u062A"
            )}
          </h2>

          {erreur && <p className="sync-msg">{erreur}</p>}
          {!d && !erreur && <p>...</p>}

          {d && (
            <div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: -1 }}>
                {onglets.map((o) => {
                  const Icone = o.Icone;
                  const estActif = onglet === o.cle;
                  return (
                    <button
                      key={o.cle}
                      type="button"
                      onClick={() => setOnglet(o.cle)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "10px 16px",
                        borderRadius: "12px 12px 0 0",
                        border: `1px solid ${ROSE_CLAIR}`,
                        borderBottom: estActif ? "1px solid #ffffff" : `1px solid ${ROSE_CLAIR}`,
                        background: estActif ? "#ffffff" : ROSE_PALE,
                        color: estActif ? ROSE_FONCE : "#9c7d7e",
                        fontWeight: estActif ? 800 : 600,
                        fontSize: 13,
                        cursor: "pointer",
                      }}
                    >
                      <Icone taille={17} />
                      {ar ? o.ar : o.fr}
                    </button>
                  );
                })}
              </div>

              <div
                style={{
                  background: "#ffffff",
                  border: `1px solid ${ROSE_CLAIR}`,
                  borderRadius: "0 14px 14px 14px",
                  padding: 20,
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                    gap: 16,
                  }}
                >
                  {indicateurs().map((i, index) => (
                    <div
                      key={index}
                      style={{
                        background: ROSE_PALE,
                        border: `1px solid ${ROSE_CLAIR}`,
                        borderRadius: 12,
                        padding: 16,
                      }}
                    >
                      <div style={{ fontSize: 12, color: "#8a6b6c", fontWeight: 600 }}>
                        {i.libelle}
                      </div>
                      <div
                        style={{
                          fontSize: 26,
                          fontWeight: 800,
                          marginTop: 6,
                          color: i.couleur || "#3f3030",
                        }}
                      >
                        {i.valeur}
                      </div>
                      {i.note && (
                        <div style={{ fontSize: 11, color: "#a08788", marginTop: 4 }}>{i.note}</div>
                      )}
                    </div>
                  ))}
                </div>

                {onglet === "commandes" && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 18 }}>
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
                            background: info ? info.bg : "#eee",
                            color: info ? info.color : "#475569",
                          }}
                        >
                          {info ? (ar ? info.labelAr : info.labelFr) : s} :{" "}
                          {d.commandes.parStatut[s]}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
