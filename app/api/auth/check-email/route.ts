import { NextResponse } from "next/server";
import { checkLoginAccess } from "@/lib/auth/login-access";

type CheckEmailBody = {
  email?: unknown;
};

export async function POST(req: Request) {
  let body: CheckEmailBody;
  try {
    body = (await req.json()) as CheckEmailBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = await checkLoginAccess(body.email);
  if (!result.ok) {
    return NextResponse.json(
      {
        code: result.code,
        error: result.message ?? "Non è stato possibile verificare questo indirizzo email.",
      },
      { status: result.status }
    );
  }

  return NextResponse.json({ ok: true });
}
