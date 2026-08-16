export type OrderStatus =
  | "NOUVELLE"
  | "APPELE"
  | "CONFIRMEE"
  | "ANNULEE"
  | "REPORTEE"
  | "RETRAIT_MAGASIN"
  | "EXPEDIEE";

export const STATUS_CONFIG: Record
  OrderStatus,
  { color: string; bg: string; labelFr: string; labelAr: string }
> = {
  NOUVELLE: { color: "#475569", bg: "#e2e8f0", labelFr: "Nouvelle", labelAr: "جديدة" },
  APPELE: { color: "#854d0e", bg: "#fef9c3", labelFr: "Appelé", labelAr: "تم الاتصال" },
  CONFIRMEE: { color: "#166534", bg: "#dcfce7", labelFr: "Confirmée", labelAr: "مؤكدة" },
  ANNULEE: { color: "#991b1b", bg: "#fee2e2", labelFr: "Annulée", labelAr: "ملغاة" },
  REPORTEE: { color: "#9a3412", bg: "#ffedd5", labelFr: "Reportée", labelAr: "مؤجلة" },
  RETRAIT_MAGASIN: {
    color: "#5b21b6",
    bg: "#ede9fe",
    labelFr: "À récupérer au magasin",
    labelAr: "الاستلام من المتجر",
  },
  EXPEDIEE: { color: "#0369a1", bg: "#e0f2fe", labelFr: "Expédiée", labelAr: "تم الشحن" },
};

export const STATUS_LIST: OrderStatus[] = [
  "NOUVELLE",
  "APPELE",
  "CONFIRMEE",
  "ANNULEE",
  "REPORTEE",
  "RETRAIT_MAGASIN",
  "EXPEDIEE",
];
