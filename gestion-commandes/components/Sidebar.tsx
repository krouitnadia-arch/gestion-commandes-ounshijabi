"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLang } from "./LangProvider";
import LanguageSwitcher from "./LanguageSwitcher";
import {
  IconeAccueil,
  IconeCommandes,
  IconeExpedition,
  IconeRetours,
  IconeMagasin,
  IconeStock,
  IconeUtilisateurs,
} from "./Icones";

type Role = "ADMIN" | "CONFIRMATION" | "EXPEDITION" | "STOCK";

const LIENS: {
  href: string;
  fr: string;
  ar: string;
  roles: Role[];
  icone: (p: { taille?: number }) => JSX.Element;
}[] = [
  {
    href: "/",
    fr: "Accueil",
    ar: "\u0627\u0644\u0631\u0626\u064A\u0633\u064A\u0629",
    roles: ["ADMIN", "CONFIRMATION", "EXPEDITION", "STOCK"],
    icone: IconeAccueil,
  },
  {
    href: "/commandes",
    fr: "Commandes",
    ar: "\u0627\u0644\u0637\u0644\u0628\u0627\u062A",
    roles: ["ADMIN", "CONFIRMATION"],
    icone: IconeCommandes,
  },
  {
    href: "/expedition",
    fr: "Exp\u00E9dition",
    ar: "\u0627\u0644\u0634\u062D\u0646",
    roles: ["ADMIN", "EXPEDITION"],
    icone: IconeExpedition,
  },
  {
    href: "/retours",
    fr: "Retours",
    ar: "\u0627\u0644\u0645\u0631\u062A\u062C\u0639\u0627\u062A",
    roles: ["ADMIN", "EXPEDITION", "STOCK"],
    icone: IconeRetours,
  },
  {
    href: "/magasin",
    fr: "Magasin",
    ar: "\u0627\u0644\u0645\u062A\u062C\u0631",
    roles: ["ADMIN", "STOCK"],
    icone: IconeMagasin,
  },
  {
    href: "/stock",
    fr: "Stock",
    ar: "\u0627\u0644\u0645\u062E\u0632\u0648\u0646",
    roles: ["ADMIN", "STOCK"],
    icone: IconeStock,
  },
  {
    href: "/utilisateurs",
    fr: "Utilisateurs",
    ar: "\u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645\u0648\u0646",
    roles: ["ADMIN"],
    icone: IconeUtilisateurs,
  },
];

export default function Sidebar({ role, name }: { role: Role; name: string }) {
  const { t, lang } = useLang();
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  function actif(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <aside className="sidebar">
      <div
        style={{
          padding: "8px 10px 18px",
          borderBottom: "1px solid rgba(199,130,131,0.25)",
          marginBottom: 14,
          textAlign: "center",
        }}
      >
        <img
          src="/logo.svg"
          alt="Ouns Hijabi"
          style={{ width: "100%", maxWidth: 145, height: "auto", display: "inline-block" }}
        />
      </div>

      <nav className="sidebar-nav">
        {LIENS.filter((l) => l.roles.includes(role)).map((l) => {
          const Icone = l.icone;
          const estActif = actif(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={estActif ? "active" : ""}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: estActif ? "#C78283" : "transparent",
                color: estActif ? "#ffffff" : "#7a4c4d",
                borderRadius: 9,
                padding: "10px 12px",
                fontWeight: estActif ? 700 : 500,
                textDecoration: "none",
              }}
            >
              <Icone taille={19} />
              <span>{lang === "ar" ? l.ar : l.fr}</span>
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <LanguageSwitcher />
        <div className="sidebar-user">{name}</div>
        <button className="btn-link" onClick={logout} type="button">
          {t("nav_logout")}
        </button>
      </div>
    </aside>
  );
}
