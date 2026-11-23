"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button, Field, Input } from "./ui";

export default function LoginForm() {
  const params = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Connexion impossible");
      return;
    }
    const next = params.get("next");
    // Navigation complète : le routeur client peut avoir mis en cache la redirection /admin → /login
    // (prefetch fait avant la connexion), router.replace() nous renverrait sur /login.
    window.location.assign(next && next.startsWith("/") && !next.startsWith("//") ? next : "/admin");
  };

  return (
    <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl border border-white/10 bg-neutral-900 p-6 shadow-2xl">
      <div>
        <h1 className="text-lg font-bold text-white">Panel admin</h1>
        <p className="text-sm text-neutral-500">Connecte-toi pour modifier la carte.</p>
      </div>
      <Field label="Identifiant">
        <Input autoFocus autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} />
      </Field>
      <Field label="Mot de passe">
        <Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </Field>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <Button type="submit" variant="primary" disabled={loading || !username || !password} className="w-full">
        {loading ? "Connexion…" : "Se connecter"}
      </Button>
    </form>
  );
}
