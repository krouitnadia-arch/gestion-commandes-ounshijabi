"use client";

import { useEffect, useState, FormEvent } from "react";
import { useLang } from "./LangProvider";

type Role = "ADMIN" | "CONFIRMATION" | "EXPEDITION" | "STOCK";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: Role;
  actif: boolean;
};

const ROLES: Role[] = ["ADMIN", "CONFIRMATION", "EXPEDITION", "STOCK"];

const EMPTY_FORM = { name: "", email: "", password: "", role: "CONFIRMATION" as Role };

export default function UsersClient() {
  const { t } = useLang();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/users");
    if (res.ok) setUsers(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setForm(EMPTY_FORM);
      load();
    } else {
      const data = await res.json();
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

  async function changeRole(u: UserRow, role: Role) {
    await fetch(`/api/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    load();
  }

  async function remove(u: UserRow) {
    await fetch(`/api/users/${u.id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <div className="page-header">
        <h1>{t("users_title")}</h1>
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
        <select
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {t(`role_${r}` as any)}
            </option>
          ))}
        </select>
        <button type="submit" className="btn-primary">
          {t("users_add")}
        </button>
      </form>
      {error && <p className="error">{error}</p>}

      {loading ? (
        <p>…</p>
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
                    <select value={u.role} onChange={(e) => changeRole(u, e.target.value as Role)}>
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {t(`role_${r}` as any)}
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
                      {u.actif ? "✓" : "✕"}
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
