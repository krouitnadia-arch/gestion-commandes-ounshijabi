"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLang } from "./LangProvider";
import LanguageSwitcher from "./LanguageSwitcher";

type Role = "ADMIN" | "CONFIRMATION" | "EXPEDITION" | "STOCK";

const LINKS: {
  href: string;
  key: "nav_commandes" | "nav_expedition" | "nav_stock" | "nav_users";
  roles: Role[];
}[] = [
  { href: "/commandes", key: "nav_commandes", roles: ["ADMIN", "CONFIRMATION"] },
  { href: "/expedition", key: "nav_expedition", roles: ["ADMIN", "EXPEDITION"] },
  { href: "/stock", key: "nav_stock", roles: ["ADMIN", "STOCK"] },
  { href: "/utilisateurs", key: "nav_users", roles: ["ADMIN"] },
];

export default function Sidebar({ role, name }: { role: Role; name: string }) {
  const { t } = useLang();
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
        {LINKS.filter((l) => l.roles.includes(role)).map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={pathname.startsWith(l.href) ? "active" : ""}
          >
            {t(l.key)}
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
