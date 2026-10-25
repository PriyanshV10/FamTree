import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { createClient } from "@supabase/supabase-js";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing tree ID" }, { status: 400 });
    }

    if (isSupabaseConfigured()) {
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

      // 1. If service role key is configured, bypass RLS completely
      if (serviceRoleKey && supabaseUrl) {
        const adminClient = createClient(supabaseUrl, serviceRoleKey, {
          auth: { persistSession: false },
        });
        await adminClient.from("relationships").delete().eq("tree_id", id);
        await adminClient.from("people").delete().eq("tree_id", id);
        await adminClient.from("family_tree_members").delete().eq("tree_id", id);
        const { error } = await adminClient.from("family_trees").delete().eq("id", id);
        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
        return NextResponse.json({ success: true, bypassedRLS: true });
      }

      // 2. Otherwise use server client with user's authenticated session
      const serverClient = await getSupabaseServerClient();
      if (serverClient) {
        await serverClient.from("relationships").delete().eq("tree_id", id);
        await serverClient.from("people").delete().eq("tree_id", id);
        await serverClient.from("family_tree_members").delete().eq("tree_id", id);
        const { error } = await serverClient.from("family_trees").delete().eq("id", id);
        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
