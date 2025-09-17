import React, { useState, useEffect, useCallback } from 'react';
import { GameState, Language, WordCategory, StoryTone, Word, PreloadedWord } from './types';
import { VOCABULARY, MAX_WORDS_PER_ROUND } from './constants';
import { generateVocabImage } from './services/geminiService';

import HomeScreen from './components/HomeScreen';
import ModeSelectionScreen from './components/ModeSelectionScreen';
import VocabTrainer from './components/VocabTrainer';
import StoryToneSelection from './components/StoryToneSelection';
import Storybook from './components/Storybook';
import SettingsIcon from './components/icons/SettingsIcon';
import HomeIcon from './components/icons/HomeIcon';
import SettingsModal from './components/SettingsModal';

// A simple preloading screen component
const PreloadingScreen: React.FC<{ message: string }> = ({ message }) => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-purple-100 text-purple-800 p-8">
        <div className="animate-spin rounded-full h-24 w-24 border-t-4 border-b-4 border-purple-500 mb-6"></div>
        <h2 className="text-2xl font-bold">{message}</h2>
        <p className="mt-2 text-lg">เตรียมความพร้อมสักครู่นะ!</p>
    </div>
);


function App() {
  // Game State
  const [gameState, setGameState] = useState<GameState>(GameState.HOME);
  const [language] = useState<Language>(Language.TH);
  const [loadingMessage, setLoadingMessage] = useState("กำลังสร้างภาพคำศัพท์ด้วย AI...");

  // Data for Story
  const [selectedCategory, setSelectedCategory] = useState<WordCategory | null>(null);
  const [preloadedWords, setPreloadedWords] = useState<PreloadedWord[]>([]);
  const [learnedWords, setLearnedWords] = useState<Word[]>([]);
  const [storyTone, setStoryTone] = useState<StoryTone | null>(null);
  const [round, setRound] = useState(1);

  // Settings & Debug
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDebugMode, setIsDebugMode] = useState(false);
  const [isImageGenerationEnabled, setIsImageGenerationEnabled] = useState(true);
  const [isStoryImageGenerationEnabled, setIsStoryImageGenerationEnabled] = useState(true);
  const [showSkipButton, setShowSkipButton] = useState(false);

  // Speech Synthesis
  const [isSpeaking, setIsSpeaking] = useState(false);
  const synth = window.speechSynthesis;

  const speak = useCallback((text: string, lang: Language = language) => {
    if (!synth) return;
    synth.cancel(); // Stop any previous speech
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.pitch = 1;
    utterance.rate = 1;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    synth.speak(utterance);
  }, [synth, language]);

  const stopSpeech = useCallback(() => {
    if (!synth) return;
    synth.cancel();
    setIsSpeaking(false);
  }, [synth]);

  // Handle state transitions and data loading
  const handleStart = () => {
    stopSpeech();
    setGameState(GameState.MODE_SELECTION);
  };

  const handleModeSelected = (category: WordCategory) => {
    setSelectedCategory(category);
    setGameState(GameState.PRELOADING_VOCAB);
  };
  
  const handleSkipToStory = () => {
      setSelectedCategory(WordCategory.ANIMALS_NATURE);
      const wordsToLearn = VOCABULARY[WordCategory.ANIMALS_NATURE].slice(0, MAX_WORDS_PER_ROUND);
      setLearnedWords(wordsToLearn);
      setGameState(GameState.STORY_TONE_SELECTION);
  };

  useEffect(() => {
    if (gameState === GameState.PRELOADING_VOCAB && selectedCategory) {
      const preload = async () => {
        setLoadingMessage("AI กำลังเตรียมชุดคำศัพท์...");
        const wordsToLearn = VOCABULARY[selectedCategory].slice(0, MAX_WORDS_PER_ROUND);
        const preloadedData: PreloadedWord[] = [];

        for (const word of wordsToLearn) {
          // Update loading message for user feedback
          setLoadingMessage(`กำลังสร้างภาพสำหรับคำว่า '${word.thai}'...`);
          
          const imageUrl = isImageGenerationEnabled 
            ? await generateVocabImage(word.english)
            : `https://loremflickr.com/400/300/${word.english},illustration,simple?lock=${word.english.replace(/\s/g, '')}`;
          
          preloadedData.push({ word, imageUrl });
          
          // Add a delay to avoid hitting the API rate limit for image generation
          if(isImageGenerationEnabled) {
            await new Promise(resolve => setTimeout(resolve, 2000)); 
          }
        }

        setPreloadedWords(preloadedData);
        setGameState(GameState.VOCAB_TRAINER);
      };
      preload();
    }
  }, [gameState, selectedCategory, isImageGenerationEnabled]);

  const handleVocabComplete = (words: Word[]) => {
    setLearnedWords(words);
    setGameState(GameState.STORY_TONE_SELECTION);
  };

  const handleToneSelected = (tone: StoryTone) => {
    setStoryTone(tone);
    setGameState(GameState.STORY);
  };
  
  const handleStoryComplete = () => {
      setRound(r => r + 1);
      // Reset for next round
      setSelectedCategory(null);
      setPreloadedWords([]);
      setLearnedWords([]);
      setStoryTone(null);
      setGameState(GameState.HOME);
  };

  const handleGoHome = () => {
    stopSpeech();
    setGameState(GameState.HOME);
  };

  // Render components based on game state
  const renderContent = () => {
    switch (gameState) {
      case GameState.HOME:
        return <HomeScreen onStart={handleStart} />;
      case GameState.MODE_SELECTION:
        return <ModeSelectionScreen 
          onStart={handleModeSelected}
          onSkipToStory={handleSkipToStory}
          isDebugMode={showSkipButton}
          speak={speak}
        />;
      case GameState.PRELOADING_VOCAB:
          return <PreloadingScreen message={loadingMessage} />;
      case GameState.VOCAB_TRAINER:
        return <VocabTrainer
          onComplete={handleVocabComplete}
          round={round}
          language={language}
          initialData={preloadedWords}
          fullWordList={VOCABULARY[selectedCategory!] || []}
          isImageGenerationEnabled={isImageGenerationEnabled}
          speak={speak}
          stopSpeech={stopSpeech}
          isSpeaking={isSpeaking}
        />;
      case GameState.STORY_TONE_SELECTION:
          return <StoryToneSelection onToneSelected={handleToneSelected} />;
      case GameState.STORY:
        if (!storyTone || learnedWords.length === 0) {
            handleGoHome();
            return null;
        }
        return <Storybook
          words={learnedWords}
          onComplete={handleStoryComplete}
          language={language}
          storyTone={storyTone}
          isImageGenerationEnabled={isStoryImageGenerationEnabled}
          speak={speak}
          stopSpeech={stopSpeech}
          isSpeaking={isSpeaking}
        />;
      default:
        return <HomeScreen onStart={handleStart} />;
    }
  };

  return (
    <div className="w-screen h-screen bg-gray-100 font-['Mitr'] text-gray-800">
      <main className="w-full h-full relative">
        {renderContent()}
      </main>
      
      {/* UI Controls */}
      <div className="absolute top-4 right-4 z-40 flex gap-2">
        {gameState !== GameState.HOME && (
          <button 
            onClick={handleGoHome}
            className="p-3 bg-white/80 backdrop-blur-sm rounded-full text-purple-600 hover:bg-white transition-colors shadow-md"
            aria-label="Go home"
          >
            <HomeIcon />
          </button>
        )}
        <button 
          onClick={() => setIsSettingsOpen(true)}
          className="p-3 bg-white/80 backdrop-blur-sm rounded-full text-purple-600 hover:bg-white transition-colors shadow-md"
          aria-label="Open settings"
        >
          <SettingsIcon />
        </button>
      </div>
      
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        isDebugMode={isDebugMode}
        setIsDebugMode={setIsDebugMode}
        isImageGenerationEnabled={isImageGenerationEnabled}
        setIsImageGenerationEnabled={setIsImageGenerationEnabled}
        isStoryImageGenerationEnabled={isStoryImageGenerationEnabled}
        setIsStoryImageGenerationEnabled={setIsStoryImageGenerationEnabled}
        showSkipButton={showSkipButton}
        setShowSkipButton={setShowSkipButton}
      />
    </div>
  );
}

export default App;