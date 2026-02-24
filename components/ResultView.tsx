'use client';

import { useRouter } from 'next/navigation';
import type { RoomState } from '@/types';

interface ResultViewProps {
  roomCode: string;
  roomState: RoomState;
}

const categoryLabels = {
  eat: '🍕 Where to Eat',
  watch: '🎬 What to Watch',
  do: '🎯 What to Do',
};

export default function ResultView({ roomCode, roomState }: ResultViewProps) {
  const router = useRouter();

  // Find the winner option and participant
  const winnerOption = roomState.options.find(
    (opt) => opt.id === roomState.room.winner_option_id
  );
  const winnerParticipant = winnerOption
    ? roomState.participants.find((p) => p.id === winnerOption.participant_id)
    : null;

  const handleNewRound = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-6">
      <div className="max-w-2xl mx-auto">
        {/* Room Header */}
        <div className="bg-white rounded-lg shadow-xl p-4 sm:p-6 md:p-8 mb-6">
          <div className="text-center mb-6">
            <div className="font-mono text-4xl sm:text-5xl tracking-widest font-bold text-gray-900 mb-3">
              {roomCode}
            </div>
            <div className="text-2xl text-gray-700 mb-4">
              {categoryLabels[roomState.room.category]}
            </div>
          </div>

          {/* Decision Banner */}
          <div className="bg-green-50 border-2 border-green-500 rounded-lg p-6 mb-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-green-700 mb-4">
                This room has decided! 🎉
              </h2>
              {winnerOption && (
                <>
                  <div className="text-3xl font-bold text-gray-900 mb-2">
                    🎉 {winnerOption.text}
                  </div>
                  {winnerParticipant && (
                    <div className="text-lg text-gray-600">
                      Suggested by {winnerParticipant.name}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* New Round Button */}
          <div className="flex justify-center">
            <button
              onClick={handleNewRound}
              className="px-8 h-11 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors duration-200"
            >
              🎲 New Round
            </button>
          </div>
        </div>

        {/* Participants */}
        <div className="bg-white rounded-lg shadow-xl p-4 sm:p-6 md:p-8 mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-3">
            Participants ({roomState.participants.length}{' '}
            {roomState.participants.length === 1 ? 'person' : 'people'})
          </h3>
          <ol className="space-y-2">
            {roomState.participants.map((participant) => (
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

        {/* All Options */}
        <div className="bg-white rounded-lg shadow-xl p-4 sm:p-6 md:p-8">
          <h3 className="text-lg font-bold text-gray-900 mb-3">
            All Options ({roomState.options.length})
          </h3>
          <ul className="space-y-2">
            {roomState.options.map((option) => {
              const participant = roomState.participants.find(
                (p) => p.id === option.participant_id
              );
              const isWinner = option.id === roomState.room.winner_option_id;

              return (
                <li
                  key={option.id}
                  className={`bg-gray-50 rounded-lg px-4 py-3 ${
                    option.is_vetoed ? 'opacity-50' : ''
                  } ${isWinner ? 'ring-2 ring-green-500 bg-green-50' : ''}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p
                        className={`text-gray-900 font-medium ${
                          option.is_vetoed ? 'line-through' : ''
                        }`}
                      >
                        {option.text}
                        {isWinner && ' 🎉'}
                      </p>
                      {participant && (
                        <p className="text-sm text-gray-600 mt-1">
                          by {participant.name}
                        </p>
                      )}
                      {option.is_vetoed && (
                        <p className="text-sm text-red-600 mt-1">❌ Vetoed</p>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
