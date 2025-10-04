// supabase/functions/process-reflection/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type ReflectionRow = {
  id: string;
  film_id: string | null;
  mood: string | null;
  reflection_text: string | null;
  pull_quote: string | null;
  transcription_status: string | null; // 'pending' | 'done' | 'failed'
  voice_path: string | null;           // <-- private storage key
  voice_note_url: string | null;       // (legacy) may exist but not used for download
};

type FilmRow = {
  title: string | null;
  director: string | null;
  year: number | null;
  poster_url: string | null;
};

const SUPABASE_URL = Deno.env.get("DATABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
const MEDIA_RENDER_URL = Deno.env.get("MEDIA_RENDER_URL")!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  global: { headers: { "x-application-name": "afterglow-edge" } },
});

async function whisperTranscribe(blob: Blob): Promise<string | null> {
  const fd = new FormData();
  fd.append("file", blob, "reflection.webm");
  fd.append("model", "whisper-1");

  const r = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: fd,
  });
  if (!r.ok) {
    console.error("Whisper failed:", await r.text());
    return null;
  }
  const j = await r.json();
  return (j?.text ?? "").trim() || null;
}

async function makePullQuote(text: string): Promise<string | null> {
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Extract one short, cinematic pull-quote (<=14 words). Return ONLY the quote." },
        { role: "user", content: text },
      ],
      temperature: 0.7,
    }),
  });
  if (!r.ok) {
    console.error("GPT failed:", await r.text());
    return null;
  }
  const j = await r.json();
  return (j.choices?.[0]?.message?.content ?? "").trim() || null;
}

async function downloadVoiceBlob(voicePath: string): Promise<Blob | null> {
  const { data, error } = await supabase.storage.from("voices").download(voicePath);
  if (error || !data) {
    console.error("Download failed for", voicePath, error);
    return null;
  }
  const arrBuf = await data.arrayBuffer();
  return new Blob([arrBuf], { type: "audio/webm" });
}

serve(async (req) => {
  try {
    const body = (await req.json()) as { reflection_id?: string };
    const reflectionId = body?.reflection_id;
    if (!reflectionId) {
      return new Response(JSON.stringify({ error: "Missing reflection_id" }), { status: 400 });
    }

    // 1) Fetch reflection
    const { data: r, error: rErr } = await supabase
      .from("reflections")
      .select("id, film_id, mood, reflection_text, pull_quote, transcription_status, voice_path, voice_note_url")
      .eq("id", reflectionId)
      .single<ReflectionRow>();
    if (rErr || !r) {
      console.error("Reflection fetch error:", rErr);
      return new Response("Not found", { status: 404 });
    }

    // 2) Fetch film
    let film: FilmRow | null = null;
    if (r.film_id) {
      const { data: f } = await supabase
        .from("films")
        .select("title, director, year, poster_url")
        .eq("id", r.film_id)
        .single<FilmRow>();
      film = f ?? null;
    }

    // 3) Transcription
    let reflectionText = r.reflection_text?.trim() || null;
    if (!reflectionText && r.voice_path) {
      const audioBlob = await downloadVoiceBlob(r.voice_path);
      if (audioBlob) reflectionText = await whisperTranscribe(audioBlob);
    }

    // 4) Pull quote
    let pullQuote = r.pull_quote?.trim() || null;
    if (!pullQuote && reflectionText) pullQuote = await makePullQuote(reflectionText);

    // 5) Render
    let staticUrl: string | null = null;
    let animatedUrl: string | null = null;
    if (film?.title && film.poster_url && (pullQuote || reflectionText)) {
      const renderPayload = {
        reflectionId: r.id,
        filmTitle: film.title,
        director: film.director ?? "",
        year: film.year ?? "",
        posterUrl: film.poster_url,
        pullQuote: pullQuote ?? reflectionText!.slice(0, 90),
        mood: r.mood ?? "Inspired",
      };
      const rr = await fetch(MEDIA_RENDER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(renderPayload),
      });
      if (rr.ok) {
        const j = await rr.json();
        staticUrl = j?.staticUrl ?? null;
        animatedUrl = j?.animatedUrl ?? null;
      }
    }

    // 6) Update
    const updatePayload: Record<string, unknown> = {};
    if (reflectionText) updatePayload["reflection_text"] = reflectionText;
    if (pullQuote) updatePayload["pull_quote"] = pullQuote;
    if (staticUrl) updatePayload["static_card_url"] = staticUrl;
    if (animatedUrl) updatePayload["animated_card_url"] = animatedUrl;
    if (reflectionText) updatePayload["transcription_status"] = "done";

    if (Object.keys(updatePayload).length > 0) {
      await supabase.from("reflections").update(updatePayload).eq("id", r.id);
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (e) {
    console.error("process-reflection error:", e);
    return new Response("Server error", { status: 500 });
  }
});
