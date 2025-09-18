import React, { useState } from 'react';
import { StoryTone, Language } from '../types';
import { STORY_TONE_THAI } from '../constants';
import AdventureIcon from './icons/AdventureIcon';
import DreamyIcon from './icons/DreamyIcon';
import FunnyIcon from './icons/FunnyIcon';
import HeartwarmingIcon from './icons/HeartwarmingIcon';
import MysteryIcon from './icons/MysteryIcon';
import RelationshipsIcon from './icons/RelationshipsIcon';

interface StoryToneSelectionProps {
  onToneSelected: (tone: StoryTone) => void;
  speak: (text: string, lang?: Language) => void;
}

const toneIconMap: Record<StoryTone, React.FC> = {
  [StoryTone.ADVENTURE]: AdventureIcon,
  [StoryTone.HEARTWARMING]: HeartwarmingIcon,
  [StoryTone.FUNNY]: FunnyIcon,
  [StoryTone.DREAMY]: DreamyIcon,
  [StoryTone.MYSTERY]: MysteryIcon,
  [StoryTone.RELATIONSHIPS]: RelationshipsIcon,
};

const toneColorMap: Record<StoryTone, string> = {
  [StoryTone.ADVENTURE]: "from-orange-400 to-red-500 border-orange-600",
  [StoryTone.HEARTWARMING]: "from-rose-400 to-pink-500 border-rose-600",
  [StoryTone.FUNNY]: "from-amber-300 to-yellow-400 border-amber-500",
  [StoryTone.DREAMY]: "from-violet-400 to-purple-500 border-violet-600",
  [StoryTone.MYSTERY]: "from-gray-500 to-gray-700 border-gray-800",
  [StoryTone.RELATIONSHIPS]: "from-green-400 to-teal-500 border-green-600",
};


const StoryToneSelection: React.FC<StoryToneSelectionProps> = ({ onToneSelected, speak }) => {
  const [selectedTone, setSelectedTone] = useState<StoryTone | null>(null);
  const tones = Object.values(StoryTone);

  const handleToneClick = (tone: StoryTone) => {
    setSelectedTone(tone);
    speak(STORY_TONE_THAI[tone], Language.TH);
  };

  const handleStartStory = () => {
    if (selectedTone) {
      onToneSelected(selectedTone);
    }
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-purple-50 via-rose-50 to-amber-50 p-4 sm:p-8">
      <header className="text-center mb-8 animate-[bounce-in_1s_ease-out]">
        <h1 className="text-4xl sm:text-5xl font-['Lilita_One'] text-purple-700" style={{textShadow: `2px 2px 0px #e9d5ff`}}>
          เลือก<span className="text-pink-500">แนว</span>นิทาน
        </h1>
        <p className="text-lg sm:text-xl text-gray-600 mt-2">อยากฟังนิทานแบบไหนดีนะ?</p>
      </header>

      <main className="w-full max-w-2xl grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6">
        {tones.map((tone, index) => {
          const Icon = toneIconMap[tone];
          const colors = toneColorMap[tone];
          const isSelected = selectedTone === tone;
          return (
            <button
              key={tone}
              onClick={() => handleToneClick(tone)}
              style={{ animation: `bounce-in 1s ease-out ${index * 0.1}s forwards`, opacity: 0 }}
              className={`flex flex-col items-center justify-center p-4 sm:p-6 text-white font-bold text-lg rounded-2xl shadow-xl transform transition-all duration-300 ease-in-out hover:scale-105 active:scale-95 border-b-8 active:border-b-2 bg-gradient-to-br ${colors} ${isSelected ? 'ring-4 ring-offset-2 ring-yellow-400' : ''}`}
            >
              <Icon />
              <span className="mt-2 text-center">{STORY_TONE_THAI[tone]}</span>
            </button>
          );
        })}
      </main>
      
      <footer className="mt-8 w-full max-w-sm animate-[bounce-in_1s_ease-out_0.7s]" style={{ animationFillMode: 'forwards', opacity: 0 }}>
        <button
          onClick={handleStartStory}
          disabled={!selectedTone}
          className="w-full px-8 py-4 font-['Lilita_One'] text-white text-3xl rounded-2xl shadow-lg transform transition-all duration-200 ease-in-out border-b-8 active:border-b-2 active:translate-y-1 bg-gradient-to-b from-green-500 to-teal-600 border-green-700 hover:from-green-400 hover:to-teal-500 disabled:from-gray-400 disabled:to-gray-500 disabled:border-gray-600 disabled:cursor-not-allowed"
          style={{ textShadow: `2px 2px 0 #15803d` }}
        >
          เริ่มนิทาน
        </button>
      </footer>
    </div>
  );
};

export default StoryToneSelection;
