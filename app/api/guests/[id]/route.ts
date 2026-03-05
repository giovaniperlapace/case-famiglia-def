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

  const { error: deleteError } = await supabase
    .from("case_alloggio_submissions")
    .delete()
    .eq("id", id);

  if (deleteError) {
    const lowered = deleteError.message.toLowerCase();
    const status = lowered.includes("forbidden") || lowered.includes("permission denied") ? 403 : 400;
    return NextResponse.json({ error: deleteError.message }, { status });
  }

  return NextResponse.json({ ok: true });
}
