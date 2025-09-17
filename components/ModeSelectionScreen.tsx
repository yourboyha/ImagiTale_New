import React, { useState } from 'react';
import { Language, WordCategory } from '../types';
import { WORD_CATEGORY_THAI } from '../constants';

interface ModeSelectionScreenProps {
  onStart: (category: WordCategory) => void;
  onSkipToStory: () => void;
  isDebugMode: boolean;
  speak: (text: string, lang?: Language) => void;
}

const ModeSelectionScreen: React.FC<ModeSelectionScreenProps> = ({ onStart, onSkipToStory, isDebugMode, speak }) => {
  const [selectedCategory, setSelectedCategory] = useState<WordCategory | null>(null);

  const categories = Object.values(WordCategory);
  const isStartDisabled = selectedCategory === null;

  const handleCategorySelect = (category: WordCategory) => {
    setSelectedCategory(category);
    speak(WORD_CATEGORY_THAI[category], Language.TH);
  };


  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-50 via-rose-50 to-amber-50 p-4">
      <div className="w-full max-w-2xl bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6 sm:space-y-8 animate-[bounce-in_0.5s_ease-out]">
        <header className="text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-purple-800">เลือกการผจญภัยของคุณ!</h1>
        </header>

        {/* Category Selection */}
        <section>
          <h2 className="text-xl font-semibold text-gray-700 mb-3 text-center">เลือกหมวดหมู่คำศัพท์</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => handleCategorySelect(category)}
                className={`p-3 rounded-xl text-center font-semibold transition-all duration-200 border-2 ${
                  selectedCategory === category
                    ? 'bg-yellow-400 border-yellow-500 text-yellow-900 shadow-lg scale-105'
                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
                }`}
              >
                {WORD_CATEGORY_THAI[category]}
              </button>
            ))}
          </div>
        </section>

        {/* Action Buttons */}
        <footer className="flex flex-col items-center space-y-3 pt-4">
          <button
            onClick={() => selectedCategory && onStart(selectedCategory)}
            disabled={isStartDisabled}
            className="w-full px-8 py-4 bg-green-500 text-white text-2xl font-bold rounded-2xl shadow-lg transition-all duration-300 ease-in-out border-b-4 border-green-700 hover:bg-green-600 active:border-b-2 active:translate-y-1 disabled:bg-gray-300 disabled:border-gray-400 disabled:cursor-not-allowed"
          >
            ไปกันเลย!
          </button>
          {isDebugMode && (
            <button
              onClick={onSkipToStory}
              className="w-full px-8 py-3 bg-gray-700 text-white font-semibold rounded-2xl shadow-md hover:bg-gray-800 transition-colors"
            >
              ข้ามไปที่โหมดนิทาน (Debug)
            </button>
          )}
        </footer>
      </div>
    </div>
  );
};

export default ModeSelectionScreen;