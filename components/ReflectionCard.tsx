import MoodBadge from "@/components/MoodBadge";

type ReflectionCardProps = {
  filmTitle: string;
  filmPoster: string | null;
  mood: string;
  reflectionText: string;
  createdAt: string;
};

export default function ReflectionCard({
  filmTitle,
  filmPoster,
  mood,
  reflectionText,
  createdAt,
}: ReflectionCardProps) {
  return (
    <div className="bg-white shadow rounded-lg overflow-hidden mb-4">
      {filmPoster && (
        <img
          src={filmPoster}
          alt={filmTitle}
          className="w-full h-48 object-cover"
        />
      )}
      <div className="p-4">
        <h2 className="text-lg font-semibold mb-2">{filmTitle}</h2>
        <MoodBadge mood={mood} />
        <p className="text-gray-700 mt-2">{reflectionText}</p>
        <p className="text-sm text-gray-500 mt-2">
          {new Date(createdAt).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}