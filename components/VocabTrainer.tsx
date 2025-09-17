import React, { useState, useEffect } from 'react';
import { Word, PreloadedWord, Language } from '../types';
import SpeakerIcon from './icons/SpeakerIcon';
import SpeakerOffIcon from './icons/SpeakerOffIcon';
import BadgeIcon from './icons/BadgeIcon';

interface VocabTrainerProps {
  onComplete: (words: Word[]) => void;
  round: number;
  language: Language;
  initialData: PreloadedWord[];
  fullWordList: Word[];
  isImageGenerationEnabled: boolean;
  speak: (text: string, lang?: Language) => void;
  stopSpeech: () => void;
  isSpeaking: boolean;
}

const VocabTrainer: React.FC<VocabTrainerProps> = ({
  onComplete,
  round,
  initialData,
  speak,
  stopSpeech,
  isSpeaking,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showEnglish, setShowEnglish] = useState(false);
  const [words, setWords] = useState<Word[]>([]);

  useEffect(() => {
    // Extract words from initialData to pass to onComplete later
    setWords(initialData.map(item => item.word));
  }, [initialData]);

  // Automatically speak the new word when it appears
  useEffect(() => {
    if (initialData.length > 0 && initialData[currentIndex]) {
      speak(initialData[currentIndex].word.thai, Language.TH);
    }
    // Cleanup speech when component unmounts or word changes
    return () => {
      stopSpeech();
    };
  }, [currentIndex, initialData, speak, stopSpeech]);


  const handleNext = () => {
    setShowEnglish(false); // Hide English for the next card
    if (currentIndex < initialData.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onComplete(words);
    }
  };
  
  const handleCardClick = () => {
      setShowEnglish(prev => !prev);
  }

  const handleSpeak = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card flip when clicking speaker
    if (isSpeaking) {
      stopSpeech();
    } else if (initialData[currentIndex]) {
      speak(initialData[currentIndex].word.thai, Language.TH);
    }
  };

  if (initialData.length === 0) {
    return (
        <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <p className="text-xl text-gray-600">กำลังเตรียมคำศัพท์...</p>
        </div>
    );
  }

  const currentWord = initialData[currentIndex];
  if (!currentWord) {
      // This can happen briefly if initialData is being set.
      return (
        <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <p className="text-xl text-gray-600">กำลังโหลด...</p>
        </div>
    );
  }

  const progressPercentage = ((currentIndex + 1) / initialData.length) * 100;
  const isLastCard = currentIndex === initialData.length - 1;

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-blue-100 via-indigo-100 to-purple-100 p-4 sm:p-8 overflow-hidden">
      <div className="w-full max-w-lg mx-auto flex flex-col gap-6">
        {/* Header */}
        <header className="text-center animate-[bounce-in_0.5s_ease-out]">
            <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-md">
                <BadgeIcon />
                <h1 className="text-2xl font-bold text-purple-700">
                    เรียนรู้คำศัพท์รอบที่ {round}
                </h1>
            </div>
        </header>

        {/* Card */}
        <div className="relative w-full aspect-[4/3] cursor-pointer group" onClick={handleCardClick} style={{ perspective: '1000px' }}>
             <div 
                className={`relative w-full h-full rounded-2xl shadow-2xl transition-transform duration-700 ease-in-out`}
                style={{ transformStyle: 'preserve-3d', transform: showEnglish ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
             >
                {/* Front of Card */}
                <div className="absolute w-full h-full bg-white rounded-2xl overflow-hidden flex flex-col items-center justify-center p-4" style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}>
                    <img src={currentWord.imageUrl} alt={currentWord.word.english} className="w-full h-full object-contain" />
                    <div className="absolute bottom-0 w-full bg-black/50 backdrop-blur-sm p-4 rounded-b-2xl">
                         <p className="text-4xl font-bold text-white text-center">{currentWord.word.thai}</p>
                    </div>
                    <button onClick={handleSpeak} className="absolute top-4 right-4 p-3 bg-white/70 backdrop-blur-sm rounded-full text-purple-600 hover:bg-white transition-colors">
                        {isSpeaking ? <SpeakerOffIcon /> : <SpeakerIcon />}
                    </button>
                </div>
                {/* Back of Card */}
                 <div className="absolute w-full h-full bg-purple-600 rounded-2xl overflow-hidden flex flex-col items-center justify-center p-4" style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                    <p className="text-5xl font-bold text-white text-center">{currentWord.word.english}</p>
                </div>
             </div>
        </div>

        {/* Progress and Actions */}
        <footer className="w-full flex flex-col items-center gap-4 animate-[bounce-in_0.5s_ease-out_0.2s] opacity-0" style={{ animationFillMode: 'forwards' }}>
             {/* Progress Bar */}
             <div className="w-full bg-gray-200 rounded-full h-4 shadow-inner">
                <div 
                    className="bg-gradient-to-r from-yellow-400 to-orange-500 h-4 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${progressPercentage}%` }}
                />
            </div>

            <button
                onClick={handleNext}
                className="w-full px-8 py-4 font-['Lilita_One'] text-white text-3xl rounded-2xl shadow-lg transform transition-all duration-200 ease-in-out border-b-8 active:border-b-2 active:translate-y-1 bg-gradient-to-b from-green-500 to-teal-600 border-green-700 hover:from-green-400 hover:to-teal-500"
                >
                {isLastCard ? 'ไปแต่งนิทานกัน!' : 'คำต่อไป'}
            </button>
        </footer>
      </div>
    </div>
  );
};

export default VocabTrainer;
