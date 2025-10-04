import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const q = String(req.query.q || "").trim();
    if (!q) return res.status(400).json({ error: "Missing query" });

    const url =
      `https://api.themoviedb.org/3/search/movie?` +
      `query=${encodeURIComponent(q)}&include_adult=false&language=en-US&page=1&api_key=${process.env.TMDB_API_KEY}`;

    const r = await fetch(url);
    if (!r.ok) return res.status(502).json({ error: "TMDb upstream error" });

    const data = await r.json();
    const results = (data.results || []).slice(0, 5).map((f: any) => ({
      id: f.id,
      title: f.title,
      year: f.release_date ? String(f.release_date).slice(0, 4) : "",
      poster_url: f.poster_path ? `https://image.tmdb.org/t/p/w500${f.poster_path}` : null,
    }));

    res.status(200).json({ results });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e.message || "Server error" });
  }
}