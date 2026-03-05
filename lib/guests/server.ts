import type { SupabaseClient } from "@supabase/supabase-js";

export type GuestTimelineEvent = {
  id: string;
  guest_id: string;
  event_type: string;
  from_status: string | null;
  to_status: string | null;
  effective_date: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
};

export async function getGuestTimeline(supabase: SupabaseClient, guestId: string) {
  const { data, error } = await supabase
    .from("guest_status_events")
    .select("id,guest_id,event_type,from_status,to_status,effective_date,payload,created_at")
    .eq("guest_id", guestId)
    .order("effective_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as GuestTimelineEvent[];
}
