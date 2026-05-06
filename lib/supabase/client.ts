import { createBrowserClient } from "@supabase/ssr";

const SUPABASE_STORAGE_KEY_PREFIX = "sb-";

export function clearSupabaseBrowserSessionStorage() {
  if (typeof window === "undefined") return;

  for (const storage of [window.localStorage, window.sessionStorage]) {
    for (let index = storage.length - 1; index >= 0; index -= 1) {
      const key = storage.key(index);
      if (key?.startsWith(SUPABASE_STORAGE_KEY_PREFIX)) {
        storage.removeItem(key);
      }
    }
  }
}

export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  return createBrowserClient(url, key, {
    auth: { flowType: "pkce" },
  });
}
