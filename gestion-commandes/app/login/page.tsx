"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/components/LangProvider";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function LoginPage() {
  const { t } = useLang();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      setError(t("login_error"));
    }
    setLoading(false);
  }

  return (
    <div className="login-page">
      <div className="login-lang">
        <LanguageSwitcher />
      </div>
      <form className="login-card" onSubmit={handleSubmit}>
        <h1>{t("appName")}</h1>
        <h2>{t("login_title")}</h2>
        {error && <p className="error">{error}</p>}
        <label>
          {t("login_email")}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label>
          {t("login_password")}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        <button className="btn-primary" type="submit" disabled={loading}>
          {t("login_submit")}
        </button>
      </form>
    </div>
  );
}
