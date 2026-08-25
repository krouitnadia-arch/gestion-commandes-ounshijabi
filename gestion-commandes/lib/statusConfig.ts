export type OrderStatus =
  | "NOUVELLE"
  | "APPELE"
  | "CONFIRMEE"
  | "ANNULEE"
  | "REPORTEE"
  | "RETRAIT_MAGASIN"
  | "EXPEDIEE"
  | "RETOURNEE"
  | "SUPPRIMEE_SENDIT";

export type StatutInfo = {
  color: string;
  bg: string;
  labelFr: string;
  labelAr: string;
};

// Statuts pour lesquels les pieces sont deja revenues au stock
export const STATUTS_STOCK_RENDU: string[] = ["ANNULEE", "RETOURNEE", "SUPPRIMEE_SENDIT"];

export const STATUS_CONFIG: { [statut: string]: StatutInfo } = {
  NOUVELLE: {
    color: "#475569",
    bg: "#e2e8f0",
    labelFr: "Nouvelle",
    labelAr: "\u062C\u062F\u064A\u062F\u0629",
  },
  APPELE: {
    color: "#854d0e",
    bg: "#fef9c3",
    labelFr: "Appel\u00E9e",
    labelAr: "\u062A\u0645 \u0627\u0644\u0627\u062A\u0635\u0627\u0644",
  },
  CONFIRMEE: {
    color: "#166534",
    bg: "#dcfce7",
    labelFr: "Confirm\u00E9e",
    labelAr: "\u0645\u0624\u0643\u062F\u0629",
  },
  ANNULEE: {
    color: "#991b1b",
    bg: "#fee2e2",
    labelFr: "Annul\u00E9e",
    labelAr: "\u0645\u0644\u063A\u0627\u0629",
  },
  REPORTEE: {
    color: "#9a3412",
    bg: "#ffedd5",
    labelFr: "Report\u00E9e",
    labelAr: "\u0645\u0624\u062C\u0644\u0629",
  },
  RETRAIT_MAGASIN: {
    color: "#5b21b6",
    bg: "#ede9fe",
    labelFr: "\u00C0 r\u00E9cup\u00E9rer au magasin",
    labelAr:
      "\u0627\u0644\u0627\u0633\u062A\u0644\u0627\u0645 \u0645\u0646 \u0627\u0644\u0645\u062A\u062C\u0631",
  },
  EXPEDIEE: {
    color: "#0369a1",
    bg: "#e0f2fe",
    labelFr: "Exp\u00E9di\u00E9e",
    labelAr: "\u062A\u0645 \u0627\u0644\u0634\u062D\u0646",
  },
  RETOURNEE: {
    color: "#831843",
    bg: "#fce7f3",
    labelFr: "Retourn\u00E9e",
    labelAr: "\u0645\u0631\u062A\u062C\u0639\u0629",
  },
  SUPPRIMEE_SENDIT: {
    color: "#7f1d1d",
    bg: "#fecaca",
    labelFr: "Supprim\u00E9e sur Sendit",
    labelAr: "\u0645\u062D\u0630\u0648\u0641\u0629 \u0645\u0646 \u0633\u0646\u062F\u064A\u062A",
  },
};

export const STATUS_LIST: OrderStatus[] = [
  "NOUVELLE",
  "APPELE",
  "CONFIRMEE",
  "ANNULEE",
  "REPORTEE",
  "RETRAIT_MAGASIN",
  "EXPEDIEE",
  "RETOURNEE",
  "SUPPRIMEE_SENDIT",
];
