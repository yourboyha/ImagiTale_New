// This file was re-created to be the main application component.
// It manages game state, component rendering, and shared functionality like text-to-speech.
import React, { useState, useEffect, useCallback } from 'react';
import HomeScreen from './components/HomeScreen';
import ModeSelectionScreen from './components/ModeSelectionScreen';
import VocabTrainer from './components/VocabTrainer';
import StoryToneSelection from './components/StoryToneSelection';
import Storybook from './components/Storybook';
import SettingsModal from './components/SettingsModal';
import SettingsIcon from './components/icons/SettingsIcon';
import HomeIcon from './components/icons/HomeIcon';
import { GameState, Language, WordCategory, StoryTone, Word, PreloadedWord } from './types';
import { VOCABULARY, MAX_WORDS_PER_ROUND } from './constants';
import { generateVocabImage } from './services/geminiService';

const App: React.FC = () => {
  // Game State Management
  const [gameState, setGameState] = useState<GameState>(GameState.HOME);
  const [language] = useState<Language>(Language.TH); // Default to Thai for story and UI
  const [wordCategory, setWordCategory] = useState<WordCategory | null>(null);
  const [collectedWords, setCollectedWords] = useState<Word[]>([]);
  const [storyTone, setStoryTone] = useState<StoryTone | null>(null);
  const [round, setRound] = useState(1);
  const [preloadedData, setPreloadedData] = useState<PreloadedWord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  // Settings & Debug State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDebugMode, setIsDebugMode] = useState(false);
  const [isImageGenerationEnabled, setIsImageGenerationEnabled] = useState(true);
  const [isStoryImageGenerationEnabled, setIsStoryImageGenerationEnabled] = useState(true);
  const [showSkipButton, setShowSkipButton] = useState(false);
  
  // Text-to-Speech State
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = React.useRef<SpeechSynthesisUtterance | null>(null);

  // --- Text-to-Speech ---
  const speak = useCallback((text: string, lang: Language = language) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.9;
    utterance.pitch = 1.1;
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [language]);

  const stopSpeech = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      stopSpeech(); // Cleanup on unmount
    };
  }, [stopSpeech]);

  // --- Game Flow Logic ---
  
  const handlePreloadVocab = useCallback(async (category: WordCategory) => {
    setIsLoading(true);
    setGameState(GameState.PRELOADING_VOCAB);
    setLoadingMessage('กำลังเตรียมคำศัพท์และรูปภาพ...');
    
    const categoryWords = VOCABULARY[category];
    // Simple shuffle and pick
    const selectedWords = [...categoryWords].sort(() => 0.5 - Math.random()).slice(0, MAX_WORDS_PER_ROUND);

    try {
      const preloadedPromises = selectedWords.map(async (word) => {
        const imageUrl = isImageGenerationEnabled
          ? await generateVocabImage(word.english)
          : `https://loremflickr.com/400/300/${word.english},illustration,simple?lock=${word.english.replace(/\s/g, '')}`;
        return { word, imageUrl };
      });

      const data = await Promise.all(preloadedPromises);
      setPreloadedData(data);
      setGameState(GameState.VOCAB_TRAINER);
    } catch (error) {
      console.error("Error preloading vocab:", error);
      // Fallback to home screen on error
      setGameState(GameState.HOME);
    } finally {
      setIsLoading(false);
    }
  }, [isImageGenerationEnabled]);


  const handleStart = () => {
    stopSpeech();
    setGameState(GameState.MODE_SELECTION);
  };

  const handleModeSelected = (category: WordCategory) => {
    stopSpeech();
    setWordCategory(category);
    handlePreloadVocab(category);
  };
  
  const handleVocabComplete = (words: Word[]) => {
    stopSpeech();
    setCollectedWords(words);
    setGameState(GameState.STORY_TONE_SELECTION);
  };

  const handleToneSelected = (tone: StoryTone) => {
    stopSpeech();
    setStoryTone(tone);
    setGameState(GameState.STORY);
  };

  const handleStoryComplete = () => {
    stopSpeech();
    setCollectedWords([]);
    setStoryTone(null);
    setRound(prev => prev + 1);
    // Go back to mode selection for a new round
    setGameState(GameState.MODE_SELECTION);
  };

  const handleGoHome = () => {
    stopSpeech();
    setGameState(GameState.HOME);
    // Reset most states for a clean start
    setCollectedWords([]);
    setStoryTone(null);
    setWordCategory(null);
    setRound(1);
  };
  
  // For debug mode skip
  const handleSkipToStory = () => {
    stopSpeech();
    const dummyWords = [
      { thai: "สุนัข", english: "dog" }, { thai: "แมว", english: "cat" }, { thai: "ต้นไม้", english: "tree" }, { thai: "บ้าน", english: "house" }, { thai: "วิ่ง", english: "run" }
    ];
    setCollectedWords(dummyWords);
    setWordCategory(WordCategory.ANIMALS_NATURE);
    setGameState(GameState.STORY_TONE_SELECTION);
  };

  // --- Render Logic ---
  const renderGameState = () => {
    if (isLoading) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-purple-100 text-purple-800 p-8">
          <div className="animate-spin rounded-full h-24 w-24 border-t-4 border-b-4 border-purple-500 mb-6"></div>
          <h2 className="text-2xl font-bold">{loadingMessage}</h2>
        </div>
      );
    }
    
    switch (gameState) {
      case GameState.HOME:
        return <HomeScreen onStart={handleStart} />;
      case GameState.MODE_SELECTION:
        return <ModeSelectionScreen onStart={handleModeSelected} onSkipToStory={handleSkipToStory} isDebugMode={isDebugMode} speak={speak} />;
      case GameState.VOCAB_TRAINER:
        if (!wordCategory) return null; // Should not happen
        return <VocabTrainer 
                  onComplete={handleVocabComplete} 
                  round={round}
                  language={language}
                  initialData={preloadedData}
                  fullWordList={VOCABULARY[wordCategory]}
                  isImageGenerationEnabled={isImageGenerationEnabled}
                  speak={speak}
                  stopSpeech={stopSpeech}
                  isSpeaking={isSpeaking}
                />;
      case GameState.STORY_TONE_SELECTION:
        return <StoryToneSelection onToneSelected={handleToneSelected} />;
      case GameState.STORY:
        if (!storyTone) return null; // Should not happen
        return <Storybook 
                  words={collectedWords}
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
    <div className="w-screen h-screen bg-gray-200 font-['Mitr']">
      <div className="w-full h-full relative">
        {renderGameState()}
        
        {/* Global UI Elements */}
        {gameState !== GameState.HOME && (
           <button 
             onClick={handleGoHome} 
             className="absolute top-4 left-4 z-30 p-3 bg-white/70 backdrop-blur-sm rounded-full shadow-lg text-purple-700 hover:bg-white transition-all"
             aria-label="Go to Home Screen"
           >
             <HomeIcon />
           </button>
        )}
        <button 
          onClick={() => setIsSettingsOpen(true)}
          className="absolute top-4 right-4 z-30 p-3 bg-white/70 backdrop-blur-sm rounded-full shadow-lg text-purple-700 hover:bg-white transition-all"
          aria-label="Open Settings"
        >
          <SettingsIcon />
        </button>

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
    </div>
  );
};

export default App;