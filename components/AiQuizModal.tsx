'use client';

import { useState } from 'react';
import type { Category, QuizResponses, AiSuggestion } from '@/types';

interface AiQuizModalProps {
  category: Category;
  roomCode: string;
  onComplete: () => void;
}

interface Question {
  id: string;
  label: string;
  options: string[];
}

const QUESTIONS: Record<Category, Question[]> = {
  eat: [
    { id: 'budget', label: 'What\'s your budget?', options: ['Budget (~2000 Ft)', 'Mid-range (~5000 Ft)', 'Upscale (~10000 Ft)', 'Fine dining (15000+ Ft)'] },
    { id: 'cuisine', label: 'What cuisine sounds good?', options: ['Hungarian', 'International', 'Asian / Middle Eastern', 'Surprise me'] },
    { id: 'vibe', label: 'What vibe are you feeling?', options: ['Quick & casual', 'Sit-down dinner', 'Trendy / hip', 'Cozy & traditional'] },
    { id: 'dietary', label: 'Any dietary needs?', options: ['No restrictions', 'Vegetarian-friendly', 'Gluten-free options', 'Healthy / light'] },
    { id: 'distance', label: 'How far will you go?', options: ['Walking distance', 'Within Budapest', 'Worth the trip', 'Anywhere in the city'] },
  ],
  watch: [
    { id: 'genre', label: 'What genre are you in the mood for?', options: ['Comedy', 'Action / Thriller', 'Drama / Romance', 'Sci-fi / Horror'] },
    { id: 'mood', label: 'What\'s the group mood?', options: ['Light & fun', 'Edge-of-seat intense', 'Thought-provoking', 'Nostalgic / classic'] },
    { id: 'length', label: 'How long do you want to watch?', options: ['Short (< 90 min)', 'Standard (90–120 min)', 'Epic (2+ hours)', 'TV series episode'] },
    { id: 'platform', label: 'Where are you watching?', options: ['Netflix', 'Theater', 'Any streaming', 'Don\'t care'] },
    { id: 'group-size', label: 'Who\'s watching?', options: ['Solo', 'Couple', 'Small group (3–5)', 'Big group (6+)'] },
  ],
  do: [
    { id: 'budget', label: 'What\'s your budget?', options: ['Free', 'Budget (~2000 Ft)', 'Mid-range (~5000 Ft)', 'Premium (10000+ Ft)'] },
    { id: 'energy-level', label: 'How much energy do you have?', options: ['Low-key & relaxed', 'Moderate', 'Active & physical', 'Full send'] },
    { id: 'indoor-outdoor', label: 'Indoor or outdoor?', options: ['Indoor', 'Outdoor', 'Either works', 'Something unique'] },
    { id: 'group-size', label: 'How many people?', options: ['Just me', '2–3 people', '4–6 people', 'Big group (7+)'] },
    { id: 'time-of-day', label: 'When are you going?', options: ['Morning', 'Afternoon', 'Evening / Night', 'All day'] },
  ],
};

export default function AiQuizModal({ category, roomCode, onComplete }: AiQuizModalProps) {
  const [step, setStep] = useState(0);
  const [responses, setResponses] = useState<QuizResponses>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState<AiSuggestion[] | null>(null);
  const [addedCount, setAddedCount] = useState(0);
  const [addingIndex, setAddingIndex] = useState<number | null>(null);
  const [addedIndices, setAddedIndices] = useState<Set<number>>(new Set());

  const questions = QUESTIONS[category];
  const totalQuestions = questions.length;

  const handleAnswer = async (questionId: string, answer: string) => {
    const newResponses = { ...responses, [questionId]: answer };
    setResponses(newResponses);

    if (step < totalQuestions - 1) {
      // Advance to next question
      setStep(step + 1);
    } else {
      // Last question answered — submit to API
      setIsSubmitting(true);
      setError('');

      try {
        const res = await fetch(`/api/rooms/${roomCode}/ai-suggest`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ responses: newResponses }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'Failed to generate suggestions');
          setIsSubmitting(false);
          return;
        }

        setSuggestions(data.suggestions);
      } catch {
        setError('Network error. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleAddSuggestion = async (suggestion: AiSuggestion, index: number) => {
    setAddingIndex(index);
    setError('');

    try {
      const res = await fetch(`/api/rooms/${roomCode}/options`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: suggestion.text,
          source: 'ai',
          ai_metadata: {
            reasoning: suggestion.reasoning,
            confidence: suggestion.confidence,
          },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to add suggestion');
        setAddingIndex(null);
        return;
      }

      setAddedCount(prev => prev + 1);
      setAddedIndices(prev => new Set(prev).add(index));
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setAddingIndex(null);
    }
  };

  // Loading state while generating suggestions
  if (isSubmitting) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-6 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-4 sm:p-6 md:p-8 text-center">
          <div className="text-6xl mb-4 animate-pulse">🤖</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Generating suggestions...</h2>
          <p className="text-gray-600">Our AI is thinking about the perfect options for your group.</p>
        </div>
      </div>
    );
  }

  // Results view — show suggestion cards
  if (suggestions) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-6 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-4 sm:p-6 md:p-8">
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">✨</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">AI Suggestions</h2>
            <p className="text-gray-600 text-sm">
              {addedCount > 0
                ? `${addedCount} added to the room`
                : 'Tap "Add" to include any suggestion as an option'}
            </p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 rounded-lg p-3 mb-4 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-3 mb-6">
            {suggestions.map((suggestion, index) => {
              const isAdded = addedIndices.has(index);
              const isAdding = addingIndex === index;

              return (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="font-semibold text-gray-900 mb-1">
                    {suggestion.text}
                  </div>
                  <div className="text-sm text-gray-500 mb-3">
                    {suggestion.reasoning}
                  </div>
                  <button
                    onClick={() => handleAddSuggestion(suggestion, index)}
                    disabled={isAdded || isAdding}
                    className={`w-full h-11 font-semibold rounded-lg transition-colors duration-200 ${
                      isAdded
                        ? 'bg-green-100 text-green-700 cursor-default'
                        : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50'
                    }`}
                  >
                    {isAdded ? 'Added ✓' : isAdding ? 'Adding...' : 'Add'}
                  </button>
                </div>
              );
            })}
          </div>

          <button
            onClick={onComplete}
            className="w-full h-11 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-colors duration-200"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  // Quiz question view
  const currentQuestion = questions[step];

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-6 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-4 sm:p-6 md:p-8">
        {/* Progress */}
        <div className="text-center mb-6">
          <div className="text-sm text-gray-500 mb-2">
            Question {step + 1} of {totalQuestions}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((step + 1) / totalQuestions) * 100}%` }}
            />
          </div>
        </div>

        {/* Question */}
        <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">
          {currentQuestion.label}
        </h2>

        {error && (
          <div className="bg-red-50 text-red-700 rounded-lg p-3 mb-4 text-sm">
            {error}
          </div>
        )}

        {/* Answer buttons */}
        <div className="space-y-3 mb-6">
          {currentQuestion.options.map((option) => (
            <button
              key={option}
              onClick={() => handleAnswer(currentQuestion.id, option)}
              className="w-full h-12 text-left px-4 bg-gray-50 border border-gray-200 rounded-lg font-medium text-gray-800 hover:bg-blue-50 hover:border-blue-300 transition-colors duration-200"
            >
              {option}
            </button>
          ))}
        </div>

        {/* Skip link */}
        <div className="text-center">
          <button
            onClick={onComplete}
            className="text-sm text-gray-400 hover:text-gray-600 underline"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}
