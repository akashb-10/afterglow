import { moodClassMap } from "@/lib/moodClassMap";

export default function MoodBadge({ mood }: { mood: string }) {
  const classes = moodClassMap[mood] || "bg-gray-200 text-gray-800";
  return (
    <span className={`px-2 py-1 rounded text-sm font-medium ${classes}`}>
      {mood}
    </span>
  );
}