import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AppRole = "admin" | "manager" | "responsabile_casa" | null;

export async function getServerAuthContext() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { supabase, user: null, role: null as AppRole, appUserId: null as string | null };
  }

  const { data: role, error: roleError } = await supabase.rpc("current_user_role");
  let appUserId: string | null = null;

  const { data: byAuthUser } = await supabase
    .from("app_utenti")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (byAuthUser?.id) {
    appUserId = byAuthUser.id;
  } else if (user.email) {
    const { data: byEmailUser } = await supabase
      .from("app_utenti")
      .select("id")
      .ilike("email", user.email)
      .maybeSingle();

    if (byEmailUser?.id) {
      appUserId = byEmailUser.id;
    }
  }

  if (roleError) {
    return { supabase, user, role: null as AppRole, appUserId };
  }

  return { supabase, user, role: (role ?? null) as AppRole, appUserId };
}
