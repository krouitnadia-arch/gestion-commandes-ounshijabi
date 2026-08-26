"use client";

import { useEffect, useState, FormEvent } from "react";
import { useLang } from "./LangProvider";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  actif: boolean;
};

// Deux roles proposes desormais. Les anciens restent affiches pour les
// comptes deja crees, mais ne sont plus proposes a la creation.
const ROLES = ["ADMIN", "EMPLOYE"];

const LIBELLES: { [role: string]: string } = {
  ADMIN: "Administratrice",
  EMPLOYE: "Employ\u00E9e",
  CONFIRMATION: "Confirmation (ancien r\u00F4le)",
  EXPEDITION: "Exp\u00E9dition (ancien r\u00F4le)",
  STOCK: "Stock (ancien r\u00F4le)",
};

const TEXTE_EMPLOYE =
  "Acc\u00E8s complet aux Commandes, \u00E0 l'Exp\u00E9dition, aux Retours et au Magasin. " +
  "Le Stock est consultable mais non modifiable, et le tableau de bord n'est pas affich\u00E9.";

const TEXTE_ADMIN =
  "Acc\u00E8s complet, y compris la modification du stock, la gestion des comptes " +
  "et le tableau de bord.";

function libelle(role: string) {
  return LIBELLES[role] || role;
}

function optionsPour(roleActuel: string) {
  return ROLES.includes(roleActuel) ? ROLES : [...ROLES, roleActuel];
}

const EMPTY_FORM = { name: "", email: "", password: "", role: "EMPLOYE" };

export default function UsersClient() {
  const { t } = useLang();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res: Response = await fetch("/api/users");
    if (res.ok) setUsers(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const res: Response = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      setForm(EMPTY_FORM);
      load();
    } else {
      const data: any = await res.json();
      setError(data.error || "Erreur");
    }
  }

  async function toggleActive(u: UserRow) {
    await fetch(`/api/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actif: !u.actif }),
    });
    load();
  }

  async function changeRole(u: UserRow, role: string) {
    await fetch(`/api/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    load();
  }

  async function remove(u: UserRow) {
    const ok = window.confirm(`Supprimer le compte de ${u.name} ?`);
    if (!ok) return;
    await fetch(`/api/users/${u.id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <div className="page-header">
        <h1>{t("users_title")}</h1>
      </div>

      <div
        style={{
          background: "#fdf6f7",
          border: "1px solid #efe1e2",
          borderRadius: 10,
          padding: "12px 14px",
          fontSize: 13,
          color: "#8a6b6c",
          margin: "0 0 14px",
          lineHeight: 1.6,
        }}
      >
        <div style={{ marginBottom: 6 }}>
          <strong style={{ color: "#a45f60" }}>{libelle("EMPLOYE")}</strong> : {TEXTE_EMPLOYE}
        </div>
        <div>
          <strong style={{ color: "#a45f60" }}>{libelle("ADMIN")}</strong> : {TEXTE_ADMIN}
        </div>
      </div>

      <form onSubmit={submit} className="stock-form">
        <input
          placeholder={t("col_name")}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <input
          type="email"
          placeholder={t("col_email")}
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
        <input
          type="password"
          placeholder={t("login_password")}
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
        />
        <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {libelle(r)}
            </option>
          ))}
        </select>
        <button type="submit" className="btn-primary">
          {t("users_add")}
        </button>
      </form>
      {error && <p className="error">{error}</p>}

      {loading ? (
        <p>...</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t("col_name")}</th>
                <th>{t("col_email")}</th>
                <th>{t("col_role")}</th>
                <th>{t("col_active")}</th>
                <th>{t("col_actions")}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>
                    <select value={u.role} onChange={(e) => changeRole(u, e.target.value)}>
                      {optionsPour(u.role).map((r) => (
                        <option key={r} value={r}>
                          {libelle(r)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <button
                      className={u.actif ? "toggle-yes" : "toggle-no"}
                      onClick={() => toggleActive(u)}
                      type="button"
                    >
                      {u.actif ? "\u2713" : "\u2715"}
                    </button>
                  </td>
                  <td>
                    <button className="btn-link danger" onClick={() => remove(u)} type="button">
                      {t("delete")}
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
