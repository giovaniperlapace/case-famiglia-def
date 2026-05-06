"use client";

import { Suspense, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { EmailOtpType } from "@supabase/supabase-js";
import {
  clearSupabaseBrowserSessionStorage,
  createSupabaseBrowserClient,
} from "@/lib/supabase/client";

const OTP_TYPES: readonly EmailOtpType[] = [
  "signup",
  "magiclink",
  "recovery",
  "invite",
  "email",
  "email_change",
];

function isOtpType(value: string | null): value is EmailOtpType {
  return Boolean(value && OTP_TYPES.includes(value as EmailOtpType));
}

function sanitizeNextPath(input: string | null): string | null {
  if (!input) return null;
  if (!input.startsWith("/")) return null;
  if (input.startsWith("//")) return null;
  return input;
}

async function resolveAuthorizedPostLoginPath() {
  const supabase = createSupabaseBrowserClient();
  const { data: role } = await supabase.rpc("current_user_role");
  if (!role) return null;
  return role === "admin" ? "/admin" : "/dashboard";
}

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasStartedRef = useRef(false);

  useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    async function run() {
      const code = searchParams.get("code");
      const tokenHash = searchParams.get("token_hash");
      const token = searchParams.get("token");
      const otpType = searchParams.get("type");
      const explicitNextPath = sanitizeNextPath(searchParams.get("next"));

      if (code || tokenHash || token) {
        clearSupabaseBrowserSessionStorage();
      }

      const supabase = createSupabaseBrowserClient();

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          router.replace("/login?error=auth");
          return;
        }

        // Avoid transient false negatives from an immediate getSession()
        // right after successful code exchange.
        const defaultDestination = await resolveAuthorizedPostLoginPath();
        if (!defaultDestination) {
          await supabase.auth.signOut();
          router.replace("/login?error=not_registered");
          return;
        }

        const destination = explicitNextPath ?? defaultDestination;
        router.replace(destination);
        return;
      }

      if ((tokenHash || token) && isOtpType(otpType)) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash ?? token ?? "",
          type: otpType,
        });
        if (error) {
          router.replace("/login?error=auth");
          return;
        }

        const defaultDestination = await resolveAuthorizedPostLoginPath();
        if (!defaultDestination) {
          await supabase.auth.signOut();
          router.replace("/login?error=not_registered");
          return;
        }

        const destination = explicitNextPath ?? defaultDestination;
        router.replace(destination);
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.replace("/login?error=auth");
        return;
      }

      const defaultDestination = await resolveAuthorizedPostLoginPath();
      if (!defaultDestination) {
        await supabase.auth.signOut();
        router.replace("/login?error=not_registered");
        return;
      }

      const destination = explicitNextPath ?? defaultDestination;
      router.replace(destination);
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
