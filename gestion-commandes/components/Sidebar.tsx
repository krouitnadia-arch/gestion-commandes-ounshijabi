"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLang } from "./LangProvider";
import LanguageSwitcher from "./LanguageSwitcher";

type Role = "ADMIN" | "CONFIRMATION" | "EXPEDITION" | "STOCK";

const LIENS: { href: string; fr: string; ar: string; roles: Role[] }[] = [
  {
    href: "/commandes",
    fr: "Commandes",
    ar: "\u0627\u0644\u0637\u0644\u0628\u0627\u062A",
    roles: ["ADMIN", "CONFIRMATION"],
  },
  {
    href: "/expedition",
    fr: "Expedition",
    ar: "\u0627\u0644\u0634\u062D\u0646",
    roles: ["ADMIN", "EXPEDITION"],
  },
  {
    href: "/magasin",
    fr: "Magasin",
    ar: "\u0627\u0644\u0645\u062A\u062C\u0631",
    roles: ["ADMIN", "STOCK"],
  },
  {
    href: "/stock",
    fr: "Stock",
    ar: "\u0627\u0644\u0645\u062E\u0632\u0648\u0646",
    roles: ["ADMIN", "STOCK"],
  },
  {
    href: "/utilisateurs",
    fr: "Utilisateurs",
    ar: "\u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645\u0648\u0646",
    roles: ["ADMIN"],
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

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">{t("appName")}</div>
      <nav className="sidebar-nav">
        {LIENS.filter((l) => l.roles.includes(role)).map((l) => (
          <Link key={l.href} href={l.href} className={pathname.startsWith(l.href) ? "active" : ""}>
            {lang === "ar" ? l.ar : l.fr}
          </Link>
        ))}
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
