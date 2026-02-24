'use client';

import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';

interface RecentDecision {
  id: string;
  code: string;
  category: 'eat' | 'watch' | 'do';
  winner_text: string;
  winner_participant: string;
  participant_count: number;
  created_at: string;
}

const categoryEmojis = {
  eat: '🍕',
  watch: '🎬',
  do: '🎯',
};

const categoryLabels = {
  eat: 'Where to Eat',
  watch: 'What to Watch',
  do: 'What to Do',
};

export default function RecentDecisions() {
  const [decisions, setDecisions] = useState<RecentDecision[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRecentDecisions() {
      try {
        const response = await fetch('/api/recent');
        if (response.ok) {
          const data = await response.json();
          setDecisions(data);
        }
      } catch (error) {
        console.error('Error fetching recent decisions:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchRecentDecisions();
  }, []);

  if (loading) {
    return (
      <div className="mt-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          Recent Decisions
        </h2>
        <div className="flex justify-center items-center py-12">
          <div className="text-4xl">⏳</div>
        </div>
      </div>
    );
  }

  if (decisions.length === 0) {
    return (
      <div className="mt-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          Recent Decisions
        </h2>
        <div className="text-center py-12 text-gray-500">
          <div className="text-4xl mb-4">🎲</div>
          <p>No decisions yet — be the first!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-12">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
        Recent Decisions
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {decisions.map((decision) => {
          const truncatedText =
            decision.winner_text.length > 50
              ? decision.winner_text.slice(0, 50) + '...'
              : decision.winner_text;

          const timeAgo = formatDistanceToNow(new Date(decision.created_at), {
            addSuffix: true,
          });

          return (
            <div
              key={decision.id}
              className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow duration-200"
            >
              <div className="flex items-start gap-3">
                <div className="text-3xl flex-shrink-0">
                  {categoryEmojis[decision.category]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-500 mb-1">
                    {categoryLabels[decision.category]}
                  </div>
                  <div className="font-semibold text-gray-900 mb-2 break-words">
                    {truncatedText}
                  </div>
                  <div className="text-xs text-gray-600">
                    <div>{decision.participant_count} {decision.participant_count === 1 ? 'person' : 'people'}</div>
                    <div className="text-gray-400">{timeAgo}</div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
