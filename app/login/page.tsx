"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">(
    "idle"
  );
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function redirectIfAuthenticated() {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        router.replace("/dashboard");
      }
    }

    void redirectIfAuthenticated();
  }, [router]);

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
          emailRedirectTo: `${appBaseUrl}/auth/callback`,
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
    <main>
      <div className="card" style={{ maxWidth: 520, margin: "0 auto" }}>
        <h1>Login</h1>
        <p className="muted">Use your email to access your submissions dashboard.</p>
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
        {message ? (
          <p
            style={{
              marginTop: 12,
              color: status === "error" ? "var(--danger)" : "var(--accent)",
            }}
          >
            {message}
          </p>
        ) : null}
      </div>
    </main>
  );
}
