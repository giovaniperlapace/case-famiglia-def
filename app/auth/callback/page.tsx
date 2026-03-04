"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function sanitizeNextPath(input: string | null): string {
  if (!input || !input.startsWith("/")) return "/dashboard";
  if (input.startsWith("//")) return "/dashboard";
  return input;
}

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    async function run() {
      const code = searchParams.get("code");
      const nextPath = sanitizeNextPath(searchParams.get("next"));
      const supabase = createSupabaseBrowserClient();

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          router.replace("/login?error=auth");
          return;
        }
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.replace("/login?error=auth");
        return;
      }

      router.replace(nextPath);
    }

    void run();
  }, [router, searchParams]);

  return (
    <>
      <h1>Completing sign-in</h1>
      <p className="muted">Please wait...</p>
    </>
  );
}

export default function AuthCallbackPage() {
  return (
    <main>
      <div className="card" style={{ maxWidth: 520, margin: "0 auto" }}>
        <Suspense fallback={<p>Loading session...</p>}>
          <AuthCallbackContent />
        </Suspense>
      </div>
    </main>
  );
}
