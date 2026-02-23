'use client';

import type { Option } from '@/types';

interface OptionsListProps {
  options: Option[];
}

export default function OptionsList({ options }: OptionsListProps) {
  if (options.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No options yet. Add the first one below!
      </div>
    );
  }

  // Placeholder - will implement full functionality in Milestone 3
  return (
    <div className="mb-4">
      {options.map((option) => (
        <div
          key={option.id}
          className="bg-gray-50 rounded-lg px-4 py-3 mb-2"
        >
          <p className="text-gray-800">{option.text}</p>
        </div>
      ))}
    </div>
  );
}
