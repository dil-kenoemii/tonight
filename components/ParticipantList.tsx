'use client';

import type { Participant } from '@/types';

interface ParticipantListProps {
  participants: Participant[];
}

export default function ParticipantList({ participants }: ParticipantListProps) {
  const participantCount = participants.length;
  const countText = participantCount === 1 ? '1 person deciding' : `${participantCount} people deciding`;

  return (
    <div>
      <h3 className="text-lg font-bold text-gray-900 mb-3">
        Participants ({countText})
      </h3>
      <ol className="space-y-2">
        {participants.map((participant) => (
          <li
            key={participant.id}
            className="flex items-center text-gray-700 bg-gray-50 rounded-lg px-4 py-2"
          >
            <span className="font-medium">{participant.name}</span>
            {participant.is_host && (
              <span className="ml-2 text-yellow-500" title="Host">
                ⭐
              </span>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
