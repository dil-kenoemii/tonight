'use client';

import { useState, useEffect } from 'react';

interface AddOptionFormProps {
  roomCode: string;
  currentOptionCount: number;
  onOptionAdded: () => void;
}

export default function AddOptionForm({
  roomCode,
  currentOptionCount,
  onOptionAdded
}: AddOptionFormProps) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-dismiss error after 3 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // If user has 3 options, show confirmation message
  if (currentOptionCount >= 3) {
    return (
      <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg text-center">
        <span className="text-green-700 font-semibold">
          You&apos;ve added your 3 options ✓
        </span>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedText = text.trim();

    // Validate locally
    if (trimmedText.length < 1) {
      setError('Option cannot be empty');
      return;
    }

    if (trimmedText.length > 100) {
      setError('Option must be 100 characters or less');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/rooms/${roomCode}/options`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: trimmedText }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.code === 'OPTION_LIMIT_REACHED') {
          setError('You have already added 3 options');
        } else if (data.code === 'ROOM_LOCKED') {
          setError('Room is no longer accepting options');
        } else if (response.status === 429) {
          setError('Too many requests. Please slow down.');
        } else {
          setError(data.error || 'Failed to add option');
        }
        setIsSubmitting(false);
        return;
      }

      // Success - clear input and notify parent
      setText('');
      setIsSubmitting(false);
      onOptionAdded();
    } catch {
      setError('Network error. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-4">
      <form onSubmit={handleSubmit}>
        <div className="flex gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add an option..."
            maxLength={100}
            disabled={isSubmitting}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={isSubmitting || !text.trim()}
            className="px-6 h-11 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {isSubmitting ? 'Adding...' : 'Add'}
          </button>
        </div>
      </form>

      {/* Error message */}
      {error && (
        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Helper text */}
      <p className="text-sm text-gray-500 mt-2">
        {currentOptionCount} of 3 options added
      </p>
    </div>
  );
}
