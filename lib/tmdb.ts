export interface TMDBFilm {
  id: number;
  title: string;
  release_date?: string;
  poster_path?: string;
  popularity?: number;
}

export async function searchFilms(title: string): Promise<TMDBFilm[]> {
  const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY;
  if (!apiKey) {
    console.error("TMDB API key missing");
    return [];
  }

  const url = `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(
    title
  )}`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    let results: TMDBFilm[] = data.results || [];

    // Sort by popularity (highest first), fallback release_date (newest first)
    results.sort((a, b) => {
      if (b.popularity && a.popularity) {
        return b.popularity - a.popularity;
      }
      const dateA = a.release_date ? new Date(a.release_date).getTime() : 0;
      const dateB = b.release_date ? new Date(b.release_date).getTime() : 0;
      return dateB - dateA;
    });

    return results;
  } catch (err) {
    console.error("Error searching TMDB:", err);
    return [];
  }
}