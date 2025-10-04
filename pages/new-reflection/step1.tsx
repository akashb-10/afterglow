import { useState } from "react";
import { useRouter } from "next/router";

export default function Step1() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<any[]>([]);

  async function search() {
    const r = await fetch(`/api/tmdb-search?q=${encodeURIComponent(q)}`);
    const j = await r.json();
    setResults(j.results || []);
  }

  function choose(film: any) {
    localStorage.setItem("newReflectionFilm", JSON.stringify(film));
    router.push("/new-reflection/step2");
  }

  return (
    <div className="p-4 max-w-xl mx-auto">
      <h1 className="text-xl font-bold mb-4">Step 1: Choose Film</h1>
      <input
        className="border rounded px-3 py-2 w-full mb-3"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search film..."
      />
      <button onClick={search} className="bg-indigo-600 text-white px-4 py-2 rounded">
        Search
      </button>
      <div className="mt-4 space-y-2">
        {results.map((f) => (
          <div
            key={f.id}
            onClick={() => choose(f)}
            className="border rounded p-3 hover:bg-gray-100 cursor-pointer"
          >
            {f.title} ({f.year})
          </div>
        ))}
      </div>
    </div>
  );
}