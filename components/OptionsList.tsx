'use client';

import { useState } from 'react';
import type { Option, Participant } from '@/types';
import VetoConfirmationModal from './VetoConfirmationModal';

interface OptionsListProps {
  options: Option[];
  participants: Participant[];
  currentParticipantId: number;
  roomCode: string;
  onVetoComplete: () => void;
}

export default function OptionsList({
  options,
  participants,
  currentParticipantId,
  roomCode,
  onVetoComplete,
}: OptionsListProps) {
  const [vetoModalOpen, setVetoModalOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<Option | null>(null);
  const [isVetoing, setIsVetoing] = useState(false);
  const [error, setError] = useState('');

  if (options.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No options yet. Add the first one below!
      </div>
    );
  }

  // Helper to get participant name by ID
  const getParticipantName = (participantId: number): string => {
    const participant = participants.find(p => p.id === participantId);
    return participant?.name || 'Unknown';
  };

  // Check if current participant has already vetoed
  const currentParticipant = participants.find(p => p.id === currentParticipantId);
  const hasAlreadyVetoed = currentParticipant?.has_vetoed || false;

  const handleVetoClick = (option: Option) => {
    setSelectedOption(option);
    setVetoModalOpen(true);
  };

  const handleVetoConfirm = async () => {
    if (!selectedOption) return;

    setIsVetoing(true);
    setError('');

    try {
      const response = await fetch(
        `/api/rooms/${roomCode}/options/${selectedOption.id}/veto`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (data.code === 'CANNOT_VETO_OWN') {
          setError('You cannot veto your own option');
        } else if (data.code === 'ALREADY_USED_VETO') {
          setError('You have already used your veto');
        } else if (data.code === 'ROOM_LOCKED') {
          setError('Room is no longer accepting vetos');
        } else {
          setError(data.error || 'Failed to veto option');
        }
        setIsVetoing(false);
        setVetoModalOpen(false);
        return;
      }

      // Success
      setIsVetoing(false);
      setVetoModalOpen(false);
      setSelectedOption(null);
      onVetoComplete();
    } catch (err) {
      setError('Network error. Please try again.');
      setIsVetoing(false);
      setVetoModalOpen(false);
    }
  };

  const handleVetoCancel = () => {
    setVetoModalOpen(false);
    setSelectedOption(null);
  };

  return (
    <>
      <div className="mb-4 space-y-2">
        {options.map((option) => {
          const isVetoed = option.is_vetoed;
          const isOwnOption = option.participant_id === currentParticipantId;
          const canVeto = !isOwnOption && !hasAlreadyVetoed && !isVetoed;

          return (
            <div
              key={option.id}
              className={`rounded-lg px-4 py-3 border ${
                isVetoed
                  ? 'bg-red-50 border-red-200'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p
                    className={`font-medium mb-1 ${
                      isVetoed
                        ? 'line-through text-gray-400'
                        : 'text-gray-800'
                    }`}
                  >
                    {option.text}
                  </p>
                  <p className="text-sm text-gray-500">
                    Added by {getParticipantName(option.participant_id)}
                  </p>
                  {isVetoed && option.vetoed_by_id && (
                    <p className="text-sm text-red-600 mt-1">
                      Vetoed by {getParticipantName(option.vetoed_by_id)}
                    </p>
                  )}
                </div>

                {/* Veto button */}
                {canVeto && (
                  <button
                    onClick={() => handleVetoClick(option)}
                    className="flex-shrink-0 w-8 h-8 bg-red-100 hover:bg-red-200 text-red-600 rounded-full flex items-center justify-center transition-colors duration-200"
                    title="Veto this option"
                  >
                    ❌
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Veto confirmation modal */}
      {selectedOption && (
        <VetoConfirmationModal
          isOpen={vetoModalOpen}
          optionText={selectedOption.text}
          onConfirm={handleVetoConfirm}
          onCancel={handleVetoCancel}
        />
      )}
    </>
  );
}
