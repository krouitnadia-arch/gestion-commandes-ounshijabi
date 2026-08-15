"use client";

import { useEffect, useState, FormEvent } from "react";
import { useLang } from "./LangProvider";

type Product = {
  id: string;
  nom: string;
  reference: string | null;
  quantite: number;
  seuilAlerte: number;
  prix: number | null;
};

const EMPTY_FORM = { nom: "", reference: "", quantite: "0", seuilAlerte: "5", prix: "" };

export default function StockClient() {
  const { t } = useLang();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/stock");
    if (res.ok) setProducts(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function startEdit(p: Product) {
    setEditingId(p.id);
    setForm({
      nom: p.nom,
      reference: p.reference || "",
      quantite: String(p.quantite),
      seuilAlerte: String(p.seuilAlerte),
      prix: p.prix != null ? String(p.prix) : "",
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!form.nom.trim()) return;

    const payload = {
      nom: form.nom,
      reference: form.reference || null,
      quantite: Number(form.quantite),
      seuilAlerte: Number(form.seuilAlerte),
      prix: form.prix ? Number(form.prix) : null,
    };

    if (editingId) {
      await fetch(`/api/stock/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch(`/api/stock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    resetForm();
    load();
  }

  async function remove(id: string) {
    await fetch(`/api/stock/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <div className="page-header">
        <h1>{t("stock_title")}</h1>
      </div>

      <form onSubmit={submit} className="stock-form">
        <input
          placeholder={t("col_product_name")}
          value={form.nom}
          onChange={(e) => setForm({ ...form, nom: e.target.value })}
        />
        <input
          placeholder={t("col_reference")}
          value={form.reference}
          onChange={(e) => setForm({ ...form, reference: e.target.value })}
        />
        <input
          type="number"
          placeholder={t("col_quantity")}
          value={form.quantite}
          onChange={(e) => setForm({ ...form, quantite: e.target.value })}
        />
        <input
          type="number"
          placeholder={t("col_alert")}
          value={form.seuilAlerte}
          onChange={(e) => setForm({ ...form, seuilAlerte: e.target.value })}
        />
        <input
          type="number"
          placeholder={t("col_price")}
          value={form.prix}
          onChange={(e) => setForm({ ...form, prix: e.target.value })}
        />
        <button type="submit" className="btn-primary">
          {editingId ? t("save") : t("stock_add")}
        </button>
        {editingId && (
          <button type="button" className="btn-secondary" onClick={resetForm}>
            {t("cancel")}
          </button>
        )}
      </form>

      {loading ? (
        <p>…</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t("col_product_name")}</th>
                <th>{t("col_reference")}</th>
                <th>{t("col_quantity")}</th>
                <th>{t("col_alert")}</th>
                <th>{t("col_price")}</th>
                <th>{t("col_actions")}</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className={p.quantite <= p.seuilAlerte ? "row-alert" : ""}>
                  <td>{p.nom}</td>
                  <td>{p.reference}</td>
                  <td>
                    {p.quantite}
                    {p.quantite <= p.seuilAlerte && <span className="tag-alert">{t("low_stock")}</span>}
                  </td>
                  <td>{p.seuilAlerte}</td>
                  <td>{p.prix ?? "—"}</td>
                  <td>
                    <button className="btn-link" onClick={() => startEdit(p)} type="button">
                      {t("edit")}
                    </button>
                    <button className="btn-link danger" onClick={() => remove(p.id)} type="button">
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
