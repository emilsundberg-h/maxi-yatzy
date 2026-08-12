"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuthStore } from "@/lib/store/useAuthStore";

export default function LoginPage() {
  const router = useRouter();
  const { signInWithPassword, signUp } = useAuthStore();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setInfo(null);
    setSubmitting(true);
    try {
      if (mode === "signin") {
        const { error } = await signInWithPassword(email, password);
        if (error) {
          setError(error);
          return;
        }
        router.push("/");
      } else {
        const { error, needsEmailConfirmation } = await signUp(email, password);
        if (error) {
          setError(error);
          return;
        }
        if (needsEmailConfirmation) {
          setInfo("Kolla din inkorg — bekräfta e-postadressen för att logga in.");
        } else {
          router.push("/");
        }
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-5 p-6 text-center">
      <div className="text-[10px] font-extrabold tracking-[.32em] text-gold">MAXI YATZY</div>
      <h1 className="font-serif text-3xl font-semibold text-paper">
        {mode === "signin" ? "Logga in" : "Skapa konto"}
      </h1>

      <form onSubmit={handleSubmit} className="flex w-full flex-col gap-3">
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="E-post"
          className="w-full rounded-xl border border-gold/20 bg-surface px-3 py-2.5 text-paper placeholder:text-muted-dim focus:border-gold/50 focus:outline-none"
        />
        <input
          type="password"
          required
          minLength={6}
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Lösenord"
          className="w-full rounded-xl border border-gold/20 bg-surface px-3 py-2.5 text-paper placeholder:text-muted-dim focus:border-gold/50 focus:outline-none"
        />

        {error && <p className="text-sm text-red-400">{error}</p>}
        {info && <p className="text-sm text-gold-bright">{info}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="mt-1 w-full rounded-2xl px-6 py-3 font-extrabold tracking-[.08em] text-[var(--color-ink)] shadow-[0_12px_26px_rgba(0,0,0,.4)] disabled:opacity-50"
          style={{ background: "var(--color-accent-grad)" }}
        >
          {submitting ? "..." : mode === "signin" ? "LOGGA IN" : "SKAPA KONTO"}
        </button>
      </form>

      <button
        type="button"
        onClick={() => {
          setMode(mode === "signin" ? "signup" : "signin");
          setError(null);
          setInfo(null);
        }}
        className="text-sm text-paper-dim hover:text-gold-bright"
      >
        {mode === "signin" ? "Inget konto än? Skapa ett" : "Har du redan ett konto? Logga in"}
      </button>
    </div>
  );
}
