import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AppRole = "admin" | "manager" | "responsabile_casa" | null;

export async function getServerAuthContext() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { supabase, user: null, role: null as AppRole };
  }

  const { data: role, error: roleError } = await supabase.rpc("current_user_role");

  if (roleError) {
    return { supabase, user, role: null as AppRole };
  }

  return { supabase, user, role: (role ?? null) as AppRole };
}
