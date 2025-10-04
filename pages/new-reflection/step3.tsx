import { useRouter } from "next/router";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import AudioRecorder from "@/components/AudioRecorder";

export default function Step3() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  async function save() {
    const film = JSON.parse(localStorage.getItem("newReflectionFilm") || "{}");
    const mood = localStorage.getItem("newReflectionMood");
    const user = (await supabase.auth.getUser()).data.user;

    let voicePath: string | null = null;

    // If user recorded audio, upload it to Supabase Storage
    if (audioBlob && user) {
      const fileName = `voice-${Date.now()}.webm`;
      const filePath = `${user.id}/${fileName}`;
      const { error: uploadError } = await supabase.storage
        .from("voices")
        .upload(filePath, audioBlob, {
          cacheControl: "3600",
          upsert: false,
          contentType: "audio/webm",
        });

      if (uploadError) {
        console.error("Audio upload failed:", uploadError);
        alert("Error uploading audio");
        return;
      }

      voicePath = filePath;
    }

    // Insert reflection into DB
    const { data, error } = await supabase.from("reflections").insert([
      {
        film_id: film.id,
        mood,
        reflection_text: text || null,
        voice_path: voicePath, // audio path in Supabase
        transcription_status: voicePath ? "pending" : "done",
        created_by: user?.id,
      },
    ]).select("id");

    if (error) {
      console.error(error);
      alert("Error saving reflection");
    } else {
      router.push(`/reflection/${data[0].id}`);
    }
  }

  return (
    <div className="p-4 max-w-xl mx-auto">
      <h1 className="text-xl font-bold mb-4">Step 3: Your Reflection</h1>
      <textarea
        className="w-full border rounded p-2 mb-3"
        rows={6}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type your thoughts..."
      />

      {/* Audio Recorder */}
      <div className="mb-3">
        <AudioRecorder onSave={(blob) => setAudioBlob(blob)} />
        {audioBlob && <p className="text-sm text-gray-600 mt-2">Audio recorded and ready to upload.</p>}
      </div>

      <button
        onClick={save}
        className="bg-indigo-600 text-white px-4 py-2 rounded"
      >
        Save
      </button>
    </div>
  );
}