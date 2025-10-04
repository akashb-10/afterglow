import { useRouter } from "next/router";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { MoodBadge } from "@/components/MoodBadge";

export default function FilmPage() {
  const router = useRouter();
  const { id } = router.query;
  const [film, setFilm] = useState<any>(null);

  const [mood, setMood] = useState("");
  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    loadFilm();
  }, [id]);

  async function loadFilm() {
    const { data, error } = await supabase
      .from("films")
      .select("id, title, poster_url, reflections(id, reflection_text, mood, created_at, voice_path)")
      .eq("id", id)
      .single();

    if (!error) setFilm(data);
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      mediaRecorderRef.current = rec;
      chunksRef.current = [];

      rec.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      rec.onstop = () => setStatus("Processing recording…");

      rec.start();
      setRecording(true);
      setStatus("Recording…");
    } catch {
      setStatus("Microphone access denied.");
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  }

  async function addReflection() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/login");
      return;
    }

    let voicePath: string | null = null;
    if (chunksRef.current.length > 0) {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      const filePath = `${user.id}/${Date.now()}.webm`;
      const { error: uploadError } = await supabase.storage
        .from("voices")
        .upload(filePath, blob, { cacheControl: "3600", upsert: false });
      if (uploadError) {
        setStatus("Audio upload failed.");
        return;
      }
      voicePath = filePath;
      chunksRef.current = [];
    }

    const { error } = await supabase.from("reflections").insert([
      {
        film_id: id,
        mood,
        reflection_text: text,
        voice_path: voicePath,
        transcription_status: voicePath ? "pending" : "done",
        created_by: user.id,
      },
    ]);

    if (error) {
      setStatus("Error adding reflection.");
    } else {
      setMood("");
      setText("");
      setStatus("Reflection added!");
      await loadFilm();
    }
  }

  if (!film) return <div>Loading…</div>;

  return (
    <div>
      {/* Film header */}
      <div className="flex gap-6 items-start mb-8">
        {film.poster_url ? (
          <img
            src={film.poster_url}
            alt={film.title}
            className="w-28 h-40 object-cover rounded-xl shadow-card"
          />
        ) : (
          <div className="w-28 h-40 rounded-xl bg-gray-200 flex items-center justify-center text-xs text-gray-500">
            No Poster
          </div>
        )}
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight">{film.title}</h1>
          <p className="text-gray-500 mt-1">All your reflections for this film.</p>
        </div>
      </div>

      {/* Reflections */}
      <div className="space-y-4 mb-10">
        {film.reflections.length === 0 ? (
          <p className="italic text-gray-600">No reflections yet.</p>
        ) : (
          film.reflections.map((r: any) => (
            <article key={r.id} className="p-4 bg-white border border-gray-200 rounded-xl shadow-card">
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <MoodBadge mood={r.mood} />
                <time>{new Date(r.created_at).toLocaleDateString()}</time>
              </div>
              {r.reflection_text && (
                <p className="mt-2 text-gray-900 leading-relaxed">{r.reflection_text}</p>
              )}
              {r.voice_path && (
                <div className="mt-2">
                  <audio
                    controls
                    className="w-full"
                    src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/voices/${r.voice_path}`}
                  />
                </div>
              )}
            </article>
          ))
        )}
      </div>

      {/* Add reflection */}
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
        <h2 className="text-lg font-semibold mb-3">Add a Reflection</h2>

        <select
          className="w-full border rounded-lg p-2 text-sm mb-2"
          value={mood}
          onChange={(e) => setMood(e.target.value)}
        >
          <option value="">Select mood</option>
          <option value="Haunted">Haunted</option>
          <option value="Uplifted">Uplifted</option>
          <option value="Confused">Confused</option>
          <option value="Grateful">Grateful</option>
          <option value="Devastated">Devastated</option>
          <option value="Exhilarated">Exhilarated</option>
          <option value="Pensive">Pensive</option>
          <option value="Inspired">Inspired</option>
        </select>

        <textarea
          rows={4}
          className="w-full border rounded-lg p-2 text-sm mb-2"
          placeholder="Write your thoughts…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        <div className="flex items-center gap-2 mb-2">
          {!recording ? (
            <button onClick={startRecording} className="bg-red-600 text-white px-3 py-1 rounded-md text-sm">
              Record Voice
            </button>
          ) : (
            <button onClick={stopRecording} className="bg-gray-700 text-white px-3 py-1 rounded-md text-sm">
              Stop Recording
            </button>
          )}

          <button onClick={addReflection} className="bg-indigo-600 text-white px-3 py-1 rounded-md text-sm">
            Save Reflection
          </button>
        </div>

        {status && <p className="text-sm text-gray-600">{status}</p>}
      </div>
    </div>
  );
}