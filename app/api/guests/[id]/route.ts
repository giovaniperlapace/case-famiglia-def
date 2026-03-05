import { NextResponse } from "next/server";
import { getServerAuthContext } from "@/lib/auth/server";

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const { supabase, user, role } = await getServerAuthContext();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error: timelineError } = await supabase
    .from("guest_status_events")
    .delete()
    .eq("guest_id", id);

  if (timelineError) {
    const status = timelineError.message.toLowerCase().includes("forbidden") ? 403 : 400;
    return NextResponse.json({ error: timelineError.message }, { status });
  }

  const { error: deleteError } = await supabase
    .from("case_alloggio_submissions")
    .delete()
    .eq("id", id);

  if (deleteError) {
    const status = deleteError.message.toLowerCase().includes("forbidden") ? 403 : 400;
    return NextResponse.json({ error: deleteError.message }, { status });
  }

  return NextResponse.json({ ok: true });
}
