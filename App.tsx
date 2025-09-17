import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, Language, Word, PreloadedWord, StoryTone, WordCategory } from './types';
import { VOCABULARY, MAX_WORDS_PER_ROUND } from './constants';
import HomeScreen from './components/HomeScreen';
import ModeSelectionScreen from './components/ModeSelectionScreen';
import VocabTrainer from './components/VocabTrainer';
import Storybook from './components/Storybook';
import SettingsModal from './components/SettingsModal';
import StoryToneSelection from './components/StoryToneSelection';
import SettingsIcon from './components/icons/SettingsIcon';
import { generateVocabImage } from './services/geminiService';

const App: React.FC = () => {
    const [gameState, setGameState] = useState<GameState>(GameState.HOME);
    const [collectedWords, setCollectedWords] = useState<Word[]>([]);
    const [storyTone, setStoryTone] = useState<StoryTone>(StoryTone.ADVENTURE);
    const [language, setLanguage] = useState<Language>(Language.TH);
    const [wordCategory, setWordCategory] = useState<WordCategory | null>(null);
    const [preloadedVocab, setPreloadedVocab] = useState<PreloadedWord[]>([]);
    const [wordsForCurrentRound, setWordsForCurrentRound] = useState<Word[]>([]);
    const [round, setRound] = useState(1);
    const [isSpeaking, setIsSpeaking] = useState(false);
    
    // Settings State
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isDebugMode, setIsDebugMode] = useState(false);
    const [isImageGenerationEnabled, setIsImageGenerationEnabled] = useState(true);
    const [isStoryImageGenerationEnabled, setIsStoryImageGenerationEnabled] = useState(true);
    const [showSkipButton, setShowSkipButton] = useState(false);
    
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

    const stopSpeech = useCallback(() => {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
    }, []);

    const speak = useCallback((text: string, lang: Language = language) => {
        stopSpeech();
        if (!text) return;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
    }, [language, stopSpeech]);
    
    useEffect(() => {
        if (gameState === GameState.PRELOADING_VOCAB) {
            const doPreload = async () => {
                const startIndex = (round - 1) * MAX_WORDS_PER_ROUND;
                const words = wordsForCurrentRound.slice(startIndex, startIndex + MAX_WORDS_PER_ROUND);

                if (words.length === 0) {
                    setGameState(GameState.HOME);
                    return;
                }

                const preloadedData = await Promise.all(
                    words.map(async (word) => {
                        const imageUrl = isImageGenerationEnabled
                            ? await generateVocabImage(word.english)
                            : `https://loremflickr.com/400/300/${word.english},illustration,simple?lock=${word.english.replace(/\s/g, '')}`;
                        return { word, imageUrl };
                    })
                );

                setPreloadedVocab(preloadedData);
                setGameState(GameState.VOCAB_TRAINER);
            };
            doPreload();
        }
    }, [gameState, round, wordsForCurrentRound, isImageGenerationEnabled]);

    const handleStart = () => {
        setGameState(GameState.MODE_SELECTION);
    };
    
    const handleModeSelection = (selectedLanguage: Language, selectedCategory: WordCategory) => {
        setLanguage(selectedLanguage);
        setWordCategory(selectedCategory);
        
        const categoryWords = [...VOCABULARY[selectedCategory]];
        for (let i = categoryWords.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [categoryWords[i], categoryWords[j]] = [categoryWords[j], categoryWords[i]];
        }
        setWordsForCurrentRound(categoryWords);
        setGameState(GameState.PRELOADING_VOCAB);
    };
    
    const handleSkipToStory = () => {
        const dummyWords = VOCABULARY[WordCategory.ANIMALS_NATURE].slice(0, 5);
        setCollectedWords(dummyWords);
        setGameState(GameState.STORY_TONE_SELECTION);
    };

    const handleVocabComplete = (words: Word[]) => {
        setCollectedWords(words);
        setGameState(GameState.STORY_TONE_SELECTION);
    };

    const handleToneSelected = (tone: StoryTone) => {
        setStoryTone(tone);
        setGameState(GameState.STORY);
    };

    const handleStoryComplete = () => {
        setRound(prev => prev + 1);
        setCollectedWords([]);
        setPreloadedVocab([]);
        setGameState(GameState.HOME);
    };

    const renderGameState = () => {
        switch (gameState) {
            case GameState.HOME:
                return <HomeScreen onStart={handleStart} />;
            case GameState.MODE_SELECTION:
                return <ModeSelectionScreen 
                            onStart={handleModeSelection} 
                            onSkipToStory={handleSkipToStory}
                            isDebugMode={isDebugMode || showSkipButton}
                        />;
            case GameState.PRELOADING_VOCAB:
                return (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-purple-100 text-purple-800 p-8 text-center">
                        <div className="animate-spin rounded-full h-24 w-24 border-t-4 border-b-4 border-purple-500 mb-6"></div>
                        <h2 className="text-3xl font-bold">กำลังเตรียมคำศัพท์วิเศษ...</h2>
                        <p className="mt-2 text-lg">AI กำลังวาดภาพประกอบสวยๆ ให้ค่ะ!</p>
                    </div>
                );
            case GameState.VOCAB_TRAINER:
                return <VocabTrainer 
                            onComplete={handleVocabComplete} 
                            round={round}
                            language={language}
                            initialData={preloadedVocab}
                            fullWordList={wordsForCurrentRound}
                            isImageGenerationEnabled={isImageGenerationEnabled}
                            speak={speak}
                            stopSpeech={stopSpeech}
                            isSpeaking={isSpeaking}
                       />;
            case GameState.STORY_TONE_SELECTION:
                return <StoryToneSelection onToneSelected={handleToneSelected} />;
            case GameState.STORY:
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
        <div className="w-screen h-screen overflow-hidden relative">
            {renderGameState()}
            <button
                onClick={() => setIsSettingsOpen(true)}
                className="absolute top-4 right-4 z-50 p-3 bg-white/50 backdrop-blur-sm rounded-full text-purple-700 hover:bg-white/80 transition-all shadow-lg"
                aria-label="Open settings"
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
    );
};

export default App;