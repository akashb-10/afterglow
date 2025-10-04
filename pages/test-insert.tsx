import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseClient";

export default function TestInsert() {
  const [status, setStatus] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace("/login"); // redirect if not logged in
      } else {
        setReady(true);
      }
    });
  }, [router]);

  async function handleInsert() {
    setStatus("Inserting…");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setStatus("Not signed in");
      return;
    }

    // Example: Insert a film
    const { data: film, error: filmError } = await supabase
      .from("films")
      .insert([
        {
          title: "RLS Test Film",
          director: "Tester",
          year: 2025,
          created_by: user.id,
        },
      ])
      .select("id");

    if (filmError) {
      setStatus("Film insert error: " + filmError.message);
      return;
    }

    setStatus(`Inserted film id ${film[0].id}`);
  }

  if (!ready) return <div className="p-6">Checking login…</div>;

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Test Insert Page</h1>
      <button
        onClick={handleInsert}
        className="bg-indigo-600 text-white px-4 py-2 rounded"
      >
        Insert Test Film
      </button>
      {status && <p className="mt-3">{status}</p>}
    </div>
  );
}