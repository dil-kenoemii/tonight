'use client';

import { useState, useEffect } from 'react';
import type { RoomState, Category, Option } from '@/types';
import ParticipantList from './ParticipantList';
import OptionsList from './OptionsList';
import AddOptionForm from './AddOptionForm';
import SpinWheel from './SpinWheel';
import ResultView from './ResultView';
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

interface SpinResult {
  winner: {
    id: number;
    text: string;
    participant_id: number;
    participant_name: string;
  };
  winnerIndex: number;
  totalOptions: number;
  allOptions: Option[];
}

export default function RoomView({ roomCode, participantId }: RoomViewProps) {
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [error, setError] = useState('');
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinResult, setSpinResult] = useState<SpinResult | null>(null);
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
      } catch {
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

  // Check if room status changed to 'decided' (for participants)
  useEffect(() => {
    if (roomState?.room.status === 'decided' && !spinResult && !isSpinning) {
      // Participant detected spin via polling - fetch winner info
      const fetchWinner = async () => {
        const nonVetoedOptions = roomState.options.filter(opt => !opt.is_vetoed);
        const winner = roomState.options.find(opt => opt.id === roomState.room.winner_option_id);

        if (winner) {
          const winnerParticipant = roomState.participants.find(p => p.id === winner.participant_id);
          const winnerIndex = nonVetoedOptions.findIndex(opt => opt.id === winner.id);

          setSpinResult({
            winner: {
              id: winner.id,
              text: winner.text,
              participant_id: winner.participant_id,
              participant_name: winnerParticipant?.name || 'Unknown',
            },
            winnerIndex: winnerIndex >= 0 ? winnerIndex : 0,
            totalOptions: nonVetoedOptions.length,
            allOptions: nonVetoedOptions,
          });
          setIsSpinning(true);
        }
      };

      fetchWinner();
    }
  }, [roomState, spinResult, isSpinning]);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-6 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-4 sm:p-6 md:p-8">
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

  // Check if this is a late joiner (joined after room was decided)
  // Late joiners see the read-only result view instead of interactive UI
  if (roomState.room.status === 'decided' && !spinResult && !isSpinning) {
    return <ResultView roomCode={roomCode} roomState={roomState} />;
  }

  // Count current participant's options
  const currentParticipantOptionCount = roomState.options.filter(
    option => option.participant_id === participantId
  ).length;

  // Get full URL for sharing
  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/room/${roomCode}`
    : '';

  const handleCopyLink = () => {
    copyToClipboard(shareUrl);
  };

  const handleOptionAdded = () => {
    // Option added, polling will update the state automatically
    // We could implement optimistic UI here, but polling is sufficient
  };

  const handleVetoComplete = () => {
    // Veto completed, polling will update the state automatically
  };

  const handleSpin = async () => {
    setIsSpinning(true);
    setError('');

    try {
      const response = await fetch(`/api/rooms/${roomCode}/spin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to spin wheel');
        setIsSpinning(false);
        return;
      }

      // Store spin result and show wheel immediately for host
      setSpinResult(data);
    } catch {
      setError('Network error. Please try again.');
      setIsSpinning(false);
    }
  };

  // Show spin wheel if spinning or room is decided
  if (spinResult && roomState) {
    const nonVetoedOptions = roomState.options.filter(opt => !opt.is_vetoed);

    return (
      <SpinWheel
        options={nonVetoedOptions}
        winnerIndex={spinResult.winnerIndex}
        winnerText={spinResult.winner.text}
        winnerParticipantName={spinResult.winner.participant_name}
        isHost={isHost}
      />
    );
  }

  // Show room view
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

            {/* Shareable Link */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="text-sm text-gray-600 mb-2">Share this link:</div>
              <div className="text-sm text-gray-800 break-all mb-3 font-mono">
                {shareUrl}
              </div>
              <button
                onClick={handleCopyLink}
                className="px-6 h-11 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors duration-200"
              >
                {copied ? 'Copied ✓' : 'Copy Link'}
              </button>
            </div>
          </div>

          {/* Participants */}
          <ParticipantList participants={roomState.participants} />
        </div>

        {/* Options Section */}
        <div className="bg-white rounded-lg shadow-xl p-4 sm:p-6 md:p-8 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Options</h2>
          <OptionsList
            options={roomState.options}
            participants={roomState.participants}
            currentParticipantId={participantId}
            roomCode={roomCode}
            onVetoComplete={handleVetoComplete}
          />
          <AddOptionForm
            roomCode={roomCode}
            currentOptionCount={currentParticipantOptionCount}
            onOptionAdded={handleOptionAdded}
          />
        </div>

        {/* Host Controls */}
        {isHost && (
          <div className="bg-white rounded-lg shadow-xl p-6">
            {(() => {
              const nonVetoedOptions = roomState.options.filter(opt => !opt.is_vetoed);
              const totalOptions = roomState.options.length;
              const canSpin = nonVetoedOptions.length >= 2;

              let message = '';
              if (totalOptions === 0) {
                message = 'Add at least 2 options to spin';
              } else if (nonVetoedOptions.length === 0) {
                message = 'All options have been vetoed! Add more options.';
              } else if (nonVetoedOptions.length === 1) {
                message = 'Need at least 2 non-vetoed options to spin';
              } else {
                message = `Ready to spin with ${nonVetoedOptions.length} options!`;
              }

              return (
                <>
                  <button
                    onClick={handleSpin}
                    disabled={!canSpin || isSpinning}
                    className="w-full h-14 bg-gradient-to-r from-purple-400 to-pink-500 text-white font-bold text-xl rounded-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSpinning ? '🎡 Spinning...' : '🎡 Lock & Spin!'}
                  </button>
                  <p className="text-center text-sm text-gray-500 mt-2">
                    {message}
                  </p>
                </>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
