'use client';

interface AddOptionFormProps {
  roomCode: string;
  participantId: number;
}

export default function AddOptionForm({ roomCode, participantId }: AddOptionFormProps) {
  // Placeholder - will implement full functionality in Milestone 3
  return (
    <div className="mt-4">
      <input
        type="text"
        placeholder="Add an option..."
        disabled
        className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
      />
      <p className="text-sm text-gray-500 mt-2">
        Option submission coming in Milestone 3
      </p>
    </div>
  );
}
