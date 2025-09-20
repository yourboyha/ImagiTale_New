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
import PreloadingScreen from './components/PreloadingScreen';


// Helper function to get random words from a category
const getRandomWords = (category: WordCategory, count: number): Word[] => {
  const allWords = VOCABULARY[category];
  const shuffled = [...allWords].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};


function App() {
  // Game State
  const [gameState, setGameState] = useState<GameState>(GameState.HOME);
  const [language] = useState<Language>(Language.TH);
  
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
  const [femaleVoice, setFemaleVoice] = useState<SpeechSynthesisVoice | null>(null);
  const synth = window.speechSynthesis;

  useEffect(() => {
    const setVoice = () => {
      if (!synth) return;
      const voices = synth.getVoices();
      if (voices.length > 0) {
        // Heuristics to find a female Thai voice. Names vary across platforms.
        // 'Kanya' is common on Apple devices. 'Chulada' on Windows. Others might just say 'female'.
        const preferredVoice = voices.find(voice =>
          voice.lang === Language.TH &&
          (voice.name.toLowerCase().includes('female') || voice.name.toLowerCase().includes('kanya') || voice.name.toLowerCase().includes('chulada'))
        );
        // If no preferred voice is found, fall back to the first available Thai voice.
        const fallbackVoice = voices.find(voice => voice.lang === Language.TH);
        setFemaleVoice(preferredVoice || fallbackVoice || null);
      }
    };
    // Voices are loaded asynchronously, so we need to listen for the 'voiceschanged' event.
    synth.onvoiceschanged = setVoice;
    // Call it once in case voices are already loaded (e.g., on some browsers).
    setVoice();
    return () => {
      if (synth) {
        synth.onvoiceschanged = null;
      }
    };
  }, [synth]);


  const speak = useCallback((text: string, lang: Language = language) => {
    if (!synth) return;
    synth.cancel(); // Stop any previous speech
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.pitch = 1;
    utterance.rate = 1;

    // Use the selected female voice if available and the language is Thai
    if (femaleVoice && lang === Language.TH) {
      utterance.voice = femaleVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    synth.speak(utterance);
  }, [synth, language, femaleVoice]);

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
      const category = WordCategory.ANIMALS_NATURE;
      setSelectedCategory(category);
      const wordsToLearn = getRandomWords(category, MAX_WORDS_PER_ROUND);
      setLearnedWords(wordsToLearn);
      setGameState(GameState.STORY_TONE_SELECTION);
  };

  useEffect(() => {
    if (gameState === GameState.PRELOADING_VOCAB && selectedCategory) {
      const preload = async () => {
        const wordsToLearn = getRandomWords(selectedCategory, MAX_WORDS_PER_ROUND);
        
        // Use Promise.all to fetch all images in parallel for massive speed-up.
        const imagePromises = wordsToLearn.map(word => 
          generateVocabImage(word.english, isImageGenerationEnabled)
        );

        const imageResults = await Promise.all(imagePromises);

        // Check if any requests failed due to quota and disable for next time if so.
        if (imageResults.some(r => !r.success && r.error?.message.includes('RESOURCE_EXHAUSTED'))) {
           console.warn("Quota error detected. Disabling AI image generation for this session.");
           setIsImageGenerationEnabled(false);
        }

        const preloadedData = wordsToLearn.map((word, index) => ({
          word,
          imageUrl: imageResults[index].imageUrl,
        }));

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
          return <PreloadingScreen />;
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
          return <StoryToneSelection onToneSelected={handleToneSelected} speak={speak} />;
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
          onSettingsClick={() => setIsSettingsOpen(true)}
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
        {gameState !== GameState.HOME && gameState !== GameState.STORY && (
          <button 
            onClick={handleGoHome}
            className="p-3 bg-white/80 backdrop-blur-sm rounded-full text-purple-600 hover:bg-white transition-colors shadow-md"
            aria-label="Go home"
          >
            <HomeIcon />
          </button>
        )}
        { gameState !== GameState.STORY && (
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-3 bg-white/80 backdrop-blur-sm rounded-full text-purple-600 hover:bg-white transition-colors shadow-md"
            aria-label="Open settings"
          >
            <SettingsIcon />
          </button>
        )}
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
