'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Category } from '@/types';

interface CreateRoomModalProps {
  isOpen: boolean;
  category: Category;
  onClose: () => void;
}

const categoryLabels: Record<Category, string> = {
  eat: '🍕 Where to Eat',
  watch: '🎬 What to Watch',
  do: '🎯 What to Do',
};

export default function CreateRoomModal({
  isOpen,
  category,
  onClose,
}: CreateRoomModalProps) {
  const [hostName, setHostName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate name
    const trimmedName = hostName.trim();
    if (trimmedName.length < 1 || trimmedName.length > 50) {
      setError('Name must be between 1 and 50 characters');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category,
          hostName: trimmedName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          setError('Too many requests. Please try again in a minute.');
        } else {
          setError(data.error || 'Failed to create room');
        }
        setIsLoading(false);
        return;
      }

      // Success - redirect to room page
      router.push(`/room/${data.code}`);
    } catch {
      setError('Network error. Please try again.');
      setIsLoading(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl leading-none"
          disabled={isLoading}
        >
          ×
        </button>

        {/* Category header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {categoryLabels[category]}
          </h2>
          <p className="text-gray-600">Create a new room and invite friends</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="hostName"
              className="block text-sm font-semibold text-gray-700 mb-2"
            >
              What&apos;s your name?
            </label>
            <input
              type="text"
              id="hostName"
              value={hostName}
              onChange={(e) => setHostName(e.target.value)}
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
            disabled={isLoading || !hostName.trim()}
            className="w-full h-12 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {isLoading ? 'Creating Room...' : 'Create Room'}
          </button>
        </form>
      </div>
    </div>
  );
}
