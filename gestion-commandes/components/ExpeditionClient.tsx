"use client";

import { useEffect, useState } from "react";
import { useLang } from "./LangProvider";
import { OrderStatus } from "@/lib/statusConfig";

type Produit = {
  nom: string;
  quantite: number;
  total: string;
  couleur?: string;
  taille?: string;
};

type Order = {
  id: string;
  wooId: number;
  numero: string;
  clientNom: string;
  clientTelephone: string;
  clientAdresse: string | null;
  clientVille: string | null;
  produits: Produit[];
  total: number;
  statut: OrderStatus;
  saisiLivraison: boolean;
  senditCode: string | null;
};

type District = { id: number; name: string; arabic_name?: string };

const listeNue = { listStyle: "none", margin: 0, padding: 0 } as const;

const boutonSendit = {
  background: "#4b508f",
  color: "white",
  border: "none",
  padding: "8px 12px",
  borderRadius: 8,
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 700,
  whiteSpace: "nowrap",
} as const;

function Variante({
  valeur,
  couleurFond,
  couleurTexte,
}: {
  valeur?: string;
  couleurFond: string;
  couleurTexte: string;
}) {
  if (!valeur) return <span style={{ color: "#94a3b8" }}>—</span>;
  return (
    <span
      style={{
        display: "inline-block",
        background: couleurFond,
        color: couleurTexte,
        padding: "3px 9px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      {valeur}
    </span>
  );
}

function normaliser(texte: string) {
  return (texte || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function districtParDefaut(ville: string | null, districts: District[]) {
  const v = normaliser(ville || "");
  if (!v) return "";

  const exact = districts.find((d) => normaliser(d.name) === v);
  if (exact) return String(exact.id);

  const partiel = districts.find((d) => normaliser(d.name).includes(v));
  return partiel ? String(partiel.id) : "";
}

export default function ExpeditionClient() {
  const { t, lang } = useLang();
  const L = (fr: string, ar: string) => (lang === "ar" ? ar : fr);

  const [orders, setOrders] = useState<Order[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [choix, setChoix] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [envoi, setEnvoi] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [copie, setCopie] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/orders");
    if (res.ok) {
      const all: Order[] = await res.json();
      setOrders(all.filter((o) => o.statut === "CONFIRMEE"));
    }
    setLoading(false);
  }

  async function chargerDistricts() {
    try {
      const res = await fetch("/api/sendit");
      const data = await res.json();
      if (res.ok && Array.isArray(data.liste)) setDistricts(data.liste);
      else setMessage(data.error || null);
    } catch {
      setMessage("Zones Sendit indisponibles");
    }
  }

  useEffect(() => {
    load();
    chargerDistricts();
  }, []);

  useEffect(() => {
    if (districts.length === 0 || orders.length === 0) return;
    setChoix((actuel) => {
      const suivant = { ...actuel };
      for (const o of orders) {
        if (!suivant[o.id]) suivant[o.id] = districtParDefaut(o.clientVille, districts);
      }
      return suivant;
    });
  }, [districts, orders]);

  async function toggleLivraison(order: Order) {
