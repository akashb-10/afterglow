import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import ReflectionCard from "@/components/ReflectionCard";

type Reflection = {
  id: string;
  film: {
    title: string;
    poster_url: string | null;
  };
  mood: string;
  reflection_text: string;
  created_at: string;
};

export default function Timeline() {
  const [reflections, setReflections] = useState<Reflection[]>([]);

  useEffect(() => {
    async function fetchReflections() {
      const { data, error } = await supabase
        .from("reflections")
        .select("id, mood, reflection_text, created_at, film:films(title, poster_url)")
        .order("created_at", { ascending: false });

      if (error) {
        console.error(error);
      } else {
        setReflections(data || []);
      }
    }
    fetchReflections();
  }, []);

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">🎬 Your Film Journal</h1>
      {reflections.length === 0 ? (
        <p className="text-gray-600">No reflections yet.</p>
      ) : (
        reflections.map((r) => (
          <ReflectionCard
            key={r.id}
            filmTitle={r.film.title}
            filmPoster={r.film.poster_url}
            mood={r.mood}
            reflectionText={r.reflection_text}
            createdAt={r.created_at}
          />
        ))
      )}
    </div>
  );
}