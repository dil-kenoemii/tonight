'use client';

import { useState } from 'react';
import CreateRoomModal from '@/components/CreateRoomModal';
import type { Category } from '@/types';

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCategoryClick = (category: Category) => {
    setSelectedCategory(category);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCategory(null);
  };

  const handleSubmit = async (hostName: string) => {
    // Modal component will handle the API call and redirect
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-6">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-12 mt-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            SpinDecide
          </h1>
          <p className="text-gray-600">
            Let the wheel decide!
          </p>
        </div>

        {/* Category Buttons */}
        <div className="space-y-4 mb-12">
          <button
            onClick={() => handleCategoryClick('eat')}
            className="w-full h-16 bg-gradient-to-r from-orange-400 to-red-500 text-white font-bold text-xl rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
          >
            🍕 Where to Eat
          </button>

          <button
            onClick={() => handleCategoryClick('watch')}
            className="w-full h-16 bg-gradient-to-r from-purple-400 to-pink-500 text-white font-bold text-xl rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
          >
            🎬 What to Watch
          </button>

          <button
            onClick={() => handleCategoryClick('do')}
            className="w-full h-16 bg-gradient-to-r from-green-400 to-teal-500 text-white font-bold text-xl rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
          >
            🎯 What to Do
          </button>
        </div>

        {/* Recent Decisions - Placeholder */}
        <div className="mt-16">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            Recent Decisions
          </h2>
          <div className="bg-white rounded-lg shadow-md p-6 text-center text-gray-500">
            No recent decisions yet
          </div>
        </div>
      </div>

      {/* Modal */}
      {selectedCategory && (
        <CreateRoomModal
          isOpen={isModalOpen}
          category={selectedCategory}
          onClose={handleCloseModal}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}
