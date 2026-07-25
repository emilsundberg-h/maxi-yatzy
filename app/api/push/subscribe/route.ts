import { NextResponse } from "next/server";
import { createClient, getUser } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const subscription = body?.subscription;
  const endpoint = subscription?.endpoint;
  if (!subscription || typeof endpoint !== "string") {
    return NextResponse.json({ error: "Ogiltig prenumeration." }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint,
      subscription,
      user_agent: typeof body?.userAgent === "string" ? body.userAgent.slice(0, 400) : null,
    },
    { onConflict: "endpoint" },
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
