import { useRouter } from "next/router";
import { moods } from "@/lib/moodClassMap"; // define in 10_Styling.md

export default function Step2() {
  const router = useRouter();

  function choose(mood: string) {
    localStorage.setItem("newReflectionMood", mood);
    router.push("/new-reflection/step3");
  }

  return (
    <div className="p-4 max-w-xl mx-auto">
      <h1 className="text-xl font-bold mb-4">Step 2: Select Mood</h1>
      <div className="grid grid-cols-2 gap-4">
        {moods.map((m) => (
          <button
            key={m}
            onClick={() => choose(m)}
            className={`rounded-lg py-6 text-lg font-semibold ${m}`}
          >
            {m}
          </button>
        ))}
      </div>
    </div>
  );
}