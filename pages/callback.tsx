import { useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseClient";

export default function Callback() {
  const router = useRouter();

  useEffect(() => {
    async function run() {
      try {
        // Two possible flows:
        // 1) New GoTrue "code" param (PKCE) → exchange for a session
        // 2) Legacy hash tokens → supabase-js picks it up automatically

        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }

        // At this point, a session should exist
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          // fallback: try to parse hash tokens (legacy)
          // If still no user, push to login
          router.replace("/login");
          return;
        }

        // Go to your app
        router.replace("/timeline");
      } catch (err) {
        console.error(err);
        router.replace("/login");
      }
    }
    run();
  }, [router]);

  return (
    <div className="p-6">Signing you in…</div>
  );
}