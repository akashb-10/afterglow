import { useEffect, useRef, useState } from "react";
import RecordRTC from "recordrtc";

export function AudioRecorder({
  onSave,
}: {
  onSave: (blob: Blob) => void;
}) {
  const [recording, setRecording] = useState(false);
  const [recorder, setRecorder] = useState<any>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const r = new RecordRTC(stream, { type: "audio" });
    r.startRecording();
    setRecorder(r);
    setRecording(true);
  }

  async function stopRecording() {
    if (!recorder) return;
    await recorder.stopRecording(async () => {
      const blob = recorder.getBlob();
      setRecording(false);
      if (audioRef.current) {
        audioRef.current.src = URL.createObjectURL(blob);
      }
      onSave(blob);
    });
  }

  return (
    <div className="mt-4">
      <button
        onClick={recording ? stopRecording : startRecording}
        className={`px-4 py-2 rounded ${
          recording ? "bg-red-600 text-white" : "bg-indigo-600 text-white"
        }`}
      >
        {recording ? "Stop Recording" : "Start Recording"}
      </button>
      <audio ref={audioRef} controls className="mt-3 w-full" />
    </div>
  );
}