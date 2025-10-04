// components/Header.tsx
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function Header() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Left: Logo */}
        <Link href="/" className="text-lg font-bold text-indigo-700 hover:opacity-80">
          🎥 Reflections
        </Link>

        {/* Right: Nav */}
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/timeline" className="hover:text-indigo-600">
            Timeline
          </Link>
          <Link href="/new-film" className="hover:text-indigo-600">
            Add Film
          </Link>
          {user ? (
            <button
              onClick={handleSignOut}
              className="px-3 py-1 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700"
            >
              Sign out
            </button>
          ) : (
            <Link
              href="/login"
              className="px-3 py-1 rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}