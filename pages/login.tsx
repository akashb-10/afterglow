import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setStatus("Sending magic link…");

    // Redirect back to /callback on the SAME origin (works in dev & prod)
    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/callback`
        : "http://localhost:3000/callback";

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });

    if (error) {
      console.error(error);
      setStatus("Error: " + error.message);
    } else {
      setStatus("Check your email for a magic link ✉️");
    }
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Sign in</h1>
      <form onSubmit={sendLink} className="space-y-3">
        <input
          type="email"
          required
          className="w-full border rounded px-3 py-2"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button className="w-full bg-indigo-600 text-white rounded px-4 py-2">
          Send magic link
        </button>
      </form>
      {status && <p className="mt-3">{status}</p>}
    </div>
  );
}