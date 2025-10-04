import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function ReflectionDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [r, setR] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    supabase.from("reflections")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data, error }) => {
        if (error) console.error(error);
        else setR(data);
      });
  }, [id]);

  if (!r) return <p>Loading...</p>;

  return (
    <div className="p-4 max-w-xl mx-auto">
      <h1 className="text-xl font-bold mb-2">{r.mood}</h1>
      {r.pull_quote && <blockquote className="italic mb-4">“{r.pull_quote}”</blockquote>}
      {r.static_card_url && (
        <img src={r.static_card_url} alt="Card" className="rounded-lg shadow mb-4" />
      )}
      {r.animated_card_url && (
        <video controls className="rounded-lg shadow mb-4">
          <source src={r.animated_card_url} type="video/mp4" />
        </video>
      )}
      <p className="text-sm text-gray-500">
        Created at {new Date(r.created_at).toLocaleString()}
      </p>
    </div>
  );
}