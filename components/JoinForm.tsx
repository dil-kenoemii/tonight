'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { RoomState, Category } from '@/types';

interface JoinFormProps {
  roomCode: string;
}

const categoryLabels: Record<Category, string> = {
  eat: '🍕 Where to Eat',
  watch: '🎬 What to Watch',
  do: '🎯 What to Do',
};

export default function JoinForm({ roomCode }: JoinFormProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [fetchError, setFetchError] = useState('');
  const router = useRouter();

  // Fetch room state on mount
  useEffect(() => {
    const fetchRoomState = async () => {
      try {
        const response = await fetch(`/api/rooms/${roomCode}`);
        const data = await response.json();

        if (!response.ok) {
          setFetchError(data.error || 'Failed to load room');
          return;
        }

        setRoomState(data);
      } catch {
        setFetchError('Failed to connect to server');
      }
    };

    fetchRoomState();
  }, [roomCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate name
    const trimmedName = name.trim();
    if (trimmedName.length < 1 || trimmedName.length > 50) {
      setError('Name must be between 1 and 50 characters');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/rooms/${roomCode}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: trimmedName }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle specific error codes
        if (data.code === 'DUPLICATE_NAME') {
          setError('This name is already taken');
        } else if (data.code === 'ROOM_NOT_FOUND') {
          setError('Room not found');
        } else if (response.status === 429) {
          setError('Too many requests. Please try again in a minute.');
        } else {
          setError(data.error || 'Failed to join room');
        }
        setIsLoading(false);
        return;
      }

      // Success - reload page to show room view
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
      setIsLoading(false);
    }
  };

  // Show error if room fetch failed
  if (fetchError) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-6 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-4 sm:p-6 md:p-8">
          <div className="text-center">
            <div className="text-6xl mb-4">❌</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
            <p className="text-gray-600">{fetchError}</p>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state while fetching room
  if (!roomState) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Loading room...</p>
        </div>
      </div>
    );
  }

  const participantCount = roomState.participants.length;
  const participantText = participantCount === 1 ? '1 person deciding' : `${participantCount} people deciding`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-6">
      <div className="max-w-md mx-auto mt-8">
        {/* Room Info */}
        <div className="text-center mb-8">
          <div className="mb-4">
            <div className="font-mono text-5xl tracking-widest font-bold text-gray-900 mb-2">
              {roomCode}
            </div>
            <div className="text-xl text-gray-700 mb-2">
              {categoryLabels[roomState.room.category]}
            </div>
            <div className="text-gray-600">
              {participantText}
            </div>
          </div>
        </div>

        {/* Join Form */}
        <div className="bg-white rounded-lg shadow-xl p-4 sm:p-6 md:p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Join the Room
          </h2>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label
                htmlFor="name"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                What&apos;s your name?
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={50}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="Enter your name"
                disabled={isLoading}
                autoFocus
              />
            </div>

            {/* Error message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={isLoading || !name.trim()}
              className="w-full h-12 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {isLoading ? 'Joining...' : 'Join Room'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
