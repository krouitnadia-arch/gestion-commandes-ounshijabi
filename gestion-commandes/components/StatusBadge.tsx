"use client";

import { STATUS_CONFIG, OrderStatus } from "@/lib/statusConfig";
import { useLang } from "./LangProvider";

export default function StatusBadge({ statut }: { statut: OrderStatus }) {
  const { lang } = useLang();
  const cfg = STATUS_CONFIG[statut];
  const label = lang === "ar" ? cfg.labelAr : cfg.labelFr;

  return (
    <span
      className="status-badge"
      style={{ color: cfg.color, backgroundColor: cfg.bg }}
    >
      {label}
    </span>
  );
}
