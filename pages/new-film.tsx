import { useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseClient";
import { searchFilms, TMDBFilm } from "@/lib/tmdb";

export default function NewFilm() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TMDBFilm[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const router = useRouter();

  async function handleSearch() {
    if (!query) return;
    setStatus("Searching…");
    const matches = await searchFilms(query);
    setResults(matches);
    setStatus(null);
  }

  async function saveFilm(match: TMDBFilm) {
    setStatus("Saving…");

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/login");
      return;
    }

    const posterUrl = match.poster_path
      ? `https://image.tmdb.org/t/p/w500${match.poster_path}`
      : null;

    const { data, error } = await supabase
      .from("films")
      .insert([
        {
          title: match.title,
          year: match.release_date ? parseInt(match.release_date.split("-")[0]) : null,
          poster_url: posterUrl,
          created_by: user.id,
        },
      ])
      .select("id");

    if (error) {
      console.error(error);
      setStatus("Error saving film");
    } else {
      setStatus("Film saved!");
      router.push(`/film/${data[0].id}`);
    }
  }

  return (
    <div className="max-w-xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Add New Film</h1>

      {/* Search input */}
      <input
        type="text"
        placeholder="Search film by title"
        className="w-full border rounded p-2"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <button
        onClick={handleSearch}
        className="bg-indigo-600 text-white px-4 py-2 rounded mt-2"
      >
        Search
      </button>

      {status && <p className="text-gray-600">{status}</p>}

      {/* Results list */}
      {results.length > 0 && (
        <div className="space-y-3 mt-4">
          <h2 className="text-lg font-semibold">Select a Film</h2>
          {results.slice(0, 6).map((film) => (
            <div
              key={film.id}
              className="p-3 border rounded flex gap-3 cursor-pointer hover:bg-gray-50"
              onClick={() => saveFilm(film)}
            >
              {film.poster_path && (
                <img
                  src={`https://image.tmdb.org/t/p/w92${film.poster_path}`}
                  alt={film.title}
                  className="w-12 h-18 object-cover rounded"
                />
              )}
              <div>
                <p className="font-semibold">{film.title}</p>
                <p className="text-sm text-gray-500">
                  {film.release_date
                    ? new Date(film.release_date).getFullYear()
                    : "Unknown year"}
                </p>
                {film.popularity && (
                  <p className="text-xs text-gray-400">
                    Popularity: {Math.round(film.popularity)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}