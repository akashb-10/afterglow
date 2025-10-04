import { useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function TestAudio() {
  const [status, setStatus] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        await uploadAudio(blob);
      };

      mediaRecorder.start();
      setRecording(true);
      setStatus("Recording…");
    } catch (err) {
      console.error("Error starting recording:", err);
      setStatus("Microphone access denied or unavailable.");
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      setStatus("Processing recording…");
    }
  }

  async function uploadAudio(blob: Blob) {
    setStatus("Uploading…");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setStatus("You must be logged in to upload.");
      return;
    }

    const filePath = `${user.id}/${Date.now()}.webm`;

    const { error: uploadError } = await supabase.storage
      .from("voices")
      .upload(filePath, blob, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload failed:", uploadError.message);
      setStatus("Upload failed.");
      return;
    }

    const { data: signedData, error: signedError } = await supabase.storage
      .from("voices")
      .createSignedUrl(filePath, 60 * 5);

    if (signedError || !signedData) {
      setStatus("Could not get signed URL.");
      return;
    }

    setAudioUrl(signedData.signedUrl);
    setStatus("Upload successful!");
  }

  return (
    <div className="max-w-lg mx-auto p-6 space-y-4">
      <h1 className="text-xl font-bold">Test Audio Recording & Playback</h1>

      {!recording ? (
        <button
          onClick={startRecording}
          className="bg-red-600 text-white px-4 py-2 rounded"
        >
          Start Recording
        </button>
      ) : (
        <button
          onClick={stopRecording}
          className="bg-gray-600 text-white px-4 py-2 rounded"
        >
          Stop Recording
        </button>
      )}

      {status && <p className="text-gray-700">{status}</p>}

      {audioUrl && (
        <div className="mt-4">
          <p className="text-sm text-gray-500">Playback:</p>
          <audio controls src={audioUrl} className="w-full mt-2" />
        </div>
      )}
    </div>
  );
}