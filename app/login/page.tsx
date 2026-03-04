"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function sanitizeNextPath(input: string | null): string {
  if (!input || !input.startsWith("/")) return "/dashboard";
  if (input.startsWith("//")) return "/dashboard";
  return input;
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">(
    "idle"
  );
  const [message, setMessage] = useState<string | null>(null);
  const nextPath = sanitizeNextPath(
    searchParams.get("next") || searchParams.get("redirectedFrom")
  );

  useEffect(() => {
    async function redirectIfAuthenticated() {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        router.replace(nextPath);
      }
    }

    void redirectIfAuthenticated();
  }, [nextPath, router]);

  const authErrorMessage =
    searchParams.get("error") === "auth"
      ? "Sessione non valida o scaduta. Richiedi un nuovo magic link."
      : null;
  const visibleMessage = message ?? authErrorMessage;
  const visibleMessageIsError = status === "error" || Boolean(authErrorMessage);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage(null);

    const appBaseUrl =
      process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "") ||
      window.location.origin;

    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${appBaseUrl}/auth/callback?next=${encodeURIComponent(nextPath)}`,
        },
      });

      if (error) {
        setStatus("error");
        setMessage(error.message);
        return;
      }

      setStatus("sent");
      setMessage("Magic link sent. Check your email.");
    } catch {
      setStatus("error");
      setMessage("Unable to send login link.");
    }
  }

  return (
    <>
      <h1>Accedi</h1>
      <p className="muted">Inserisci la tua email per ricevere un link di accesso.</p>
      <form onSubmit={handleSubmit} style={{ marginTop: "1rem" }}>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          style={{
            width: "100%",
            marginTop: 8,
            padding: 10,
            borderRadius: 8,
            border: "1px solid var(--border)",
          }}
        />
        <button
          type="submit"
          disabled={status === "loading"}
          style={{
            marginTop: 12,
            padding: "10px 14px",
            borderRadius: 8,
            background: "var(--accent)",
            color: "white",
            border: "none",
          }}
        >
          {status === "loading" ? "Sending..." : "Send magic link"}
        </button>
      </form>
      {visibleMessage ? (
        <p
          style={{
            marginTop: 12,
            color: visibleMessageIsError ? "var(--danger)" : "var(--accent)",
          }}
        >
          {visibleMessage}
        </p>
      ) : null}
    </>
  );
}

export default function LoginPage() {
  return (
    <main>
      <div className="card" style={{ maxWidth: 520, margin: "0 auto" }}>
        <Suspense fallback={<p>Loading...</p>}>
          <LoginContent />
        </Suspense>
      </div>
    </main>
  );
}
