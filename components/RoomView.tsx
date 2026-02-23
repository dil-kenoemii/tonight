'use client';

import { useState, useEffect } from 'react';
import type { RoomState, Category } from '@/types';
import ParticipantList from './ParticipantList';
import OptionsList from './OptionsList';
import AddOptionForm from './AddOptionForm';
import useCopyToClipboard from '@/hooks/useCopyToClipboard';

interface RoomViewProps {
  roomCode: string;
  participantId: number;
}

const categoryLabels: Record<Category, string> = {
  eat: '🍕 Where to Eat',
  watch: '🎬 What to Watch',
  do: '🎯 What to Do',
};

export default function RoomView({ roomCode, participantId }: RoomViewProps) {
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [error, setError] = useState('');
  const { copyToClipboard, copied } = useCopyToClipboard();

  // Polling for room updates
  useEffect(() => {
    const fetchRoomState = async () => {
      try {
        const response = await fetch(`/api/rooms/${roomCode}`);
        const data = await response.json();

        if (response.ok) {
          setRoomState(data);
          setError('');
        } else {
          setError(data.error || 'Failed to load room');
        }
      } catch (err) {
        setError('Failed to connect to server');
      }
    };

    // Initial fetch
    fetchRoomState();

    // Poll every 2 seconds
    const interval = setInterval(fetchRoomState, 2000);

    // Cleanup on unmount
    return () => clearInterval(interval);
  }, [roomCode]);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-6 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
          <div className="text-center">
            <div className="text-6xl mb-4">❌</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
            <p className="text-gray-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

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

  const currentParticipant = roomState.participants.find(p => p.id === participantId);
  const isHost = currentParticipant?.is_host || false;

  // Get full URL for sharing
  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/room/${roomCode}`
    : '';

  const handleCopyLink = () => {
    copyToClipboard(shareUrl);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-6">
      <div className="max-w-2xl mx-auto">
        {/* Room Header */}
        <div className="bg-white rounded-lg shadow-xl p-8 mb-6">
          <div className="text-center mb-6">
            <div className="font-mono text-5xl tracking-widest font-bold text-gray-900 mb-3">
              {roomCode}
            </div>
            <div className="text-2xl text-gray-700 mb-4">
              {categoryLabels[roomState.room.category]}
            </div>

            {/* Shareable Link */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="text-sm text-gray-600 mb-2">Share this link:</div>
              <div className="text-sm text-gray-800 break-all mb-3 font-mono">
                {shareUrl}
              </div>
              <button
                onClick={handleCopyLink}
                className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors duration-200"
              >
                {copied ? 'Copied ✓' : 'Copy Link'}
              </button>
            </div>
          </div>

          {/* Participants */}
          <ParticipantList participants={roomState.participants} />
        </div>

        {/* Options Section */}
        <div className="bg-white rounded-lg shadow-xl p-8 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Options</h2>
          <OptionsList options={roomState.options} />
          <AddOptionForm roomCode={roomCode} participantId={participantId} />
        </div>

        {/* Host Controls */}
        {isHost && (
          <div className="bg-white rounded-lg shadow-xl p-6">
            <button
              disabled
              className="w-full h-14 bg-gradient-to-r from-purple-400 to-pink-500 text-white font-bold text-xl rounded-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              🎡 Lock & Spin!
            </button>
            <p className="text-center text-sm text-gray-500 mt-2">
              Add at least 2 options to spin
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
