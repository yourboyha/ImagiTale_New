// Fix: Create the full Storybook component to resolve module errors and implement story generation logic.
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Word, Language, StoryTone, StoryScene } from '../types';
import {
  generateInitialStoryScene,
  generateNextStoryScene,
  generateFinalStoryScene,
  generateStoryTitle,
} from '../services/geminiService';
import SpeakerIcon from './icons/SpeakerIcon';
import SpeakerOffIcon from './icons/SpeakerOffIcon';
import DownloadIcon from './icons/DownloadIcon';
import SparkleIcon from './icons/SparkleIcon';

interface StorybookProps {
  words: Word[];
  onComplete: () => void;
  language: Language;
  storyTone: StoryTone;
  isImageGenerationEnabled: boolean;
  speak: (text: string, lang?: Language) => void;
  stopSpeech: () => void;
  isSpeaking: boolean;
}

const Storybook: React.FC<StorybookProps> = ({
  words,
  onComplete,
  language,
  storyTone,
  isImageGenerationEnabled,
  speak,
  stopSpeech,
  isSpeaking,
}) => {
  const [scenes, setScenes] = useState<StoryScene[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('AI กำลังสร้างสรรค์นิทานเรื่องแรก...');
  const [isStoryFinished, setIsStoryFinished] = useState(false);
  const [title, setTitle] = useState('');
  const storyContainerRef = useRef<HTMLDivElement>(null);

  const wordList = words.map(w => language === Language.TH ? w.thai : w.english);

  useEffect(() => {
    const createInitialScene = async () => {
      try {
        const initialScene = await generateInitialStoryScene(wordList, language, storyTone, isImageGenerationEnabled);
        setScenes([initialScene]);
      } catch (error) {
        console.error("Failed to generate initial scene:", error);
        setScenes([{ text: 'เกิดข้อผิดพลาด! ลองใหม่อีกครั้งนะ', imageUrl: '', choices: [] }]);
      } finally {
        setIsLoading(false);
      }
    };
    createInitialScene();
    
    return () => {
      stopSpeech();
    };
  }, []); // Run only on mount

  const currentScene = scenes[scenes.length - 1];

  useEffect(() => {
    if (currentScene && !isLoading) {
      speak(currentScene.text, language);
    }
  }, [currentScene, isLoading, speak, language]);

  const handleChoice = async (choice: string) => {
    if (isLoading) return;
    setIsLoading(true);
    stopSpeech();
    
    // 3 scenes with choices, then a final scene. Total 4 scenes.
    if (scenes.length < 3) {
      setLoadingMessage('AI กำลังแต่งเรื่องราวต่อไป...');
      const storySoFar = scenes.map(s => s.text).join('\n\n');
      const nextScene = await generateNextStoryScene(storySoFar, choice, language, storyTone, wordList, isImageGenerationEnabled, scenes.length + 1);
      setScenes(prev => [...prev, nextScene]);
      setIsLoading(false);
    } else {
      setLoadingMessage('กำลังสร้างตอนจบของนิทาน...');
      const storySoFar = [...scenes.map(s => s.text), choice].join('\n\n');
      const finalScene = await generateFinalStoryScene(storySoFar, language, storyTone, wordList, isImageGenerationEnabled);
      setScenes(prev => [...prev, finalScene]);
      
      const fullStory = scenes.map(s => s.text).concat(finalScene.text).join('\n\n');
      const generatedTitle = await generateStoryTitle(fullStory, language);
      setTitle(generatedTitle);
      
      setIsStoryFinished(true);
      setIsLoading(false);
    }
  };

  const handleDownload = useCallback(async () => {
    if (!storyContainerRef.current) return;
    try {
      const { toPng } = await import('html-to-image');
      const download = (await import('downloadjs')).default;
      
      const dataUrl = await toPng(storyContainerRef.current, {
        quality: 0.95,
        backgroundColor: '#f3e8ff',
        style: {
          margin: '0',
          padding: '2rem',
          fontFamily: "'Mitr', sans-serif"
        }
      });
      download(dataUrl, `${(title || 'imagitale-story').replace(/\s+/g, '-').toLowerCase()}.png`);
    } catch (e) {
      console.error('Download failed:', e);
      alert('ขออภัย, ไม่สามารถดาวน์โหลดเรื่องราวได้ในขณะนี้');
    }
  }, [title]);

  const handleSpeakIconClick = (e: React.MouseEvent, text: string) => {
    e.stopPropagation();
    if (isSpeaking) {
      stopSpeech();
    } else {
      speak(text, language);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-purple-100 text-purple-800 p-8">
        <div className="animate-spin rounded-full h-24 w-24 border-t-4 border-b-4 border-purple-500 mb-6"></div>
        <h2 className="text-2xl font-bold">{loadingMessage}</h2>
        <p className="mt-2 text-lg">อดใจรอแป๊บนึงนะ!</p>
      </div>
    );
  }

  if (isStoryFinished && currentScene) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-yellow-50 via-rose-50 to-sky-50 p-4 sm:p-8 overflow-y-auto">
        <div className="w-full max-w-3xl bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl p-6 sm:p-8 space-y-4 animate-[bounce-in_0.5s_ease-out]">
          <div ref={storyContainerRef} className="bg-purple-50 p-6 rounded-lg">
              <h1 className="text-3xl sm:text-4xl font-['Lilita_One'] text-purple-700 text-center mb-4">{title}</h1>
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                {scenes.map((scene, index) => (
                  <div key={index} className="flex flex-col sm:flex-row items-start gap-4 p-2">
                    <img src={scene.imageUrl} alt={`Scene ${index + 1}`} className="w-full sm:w-48 h-auto rounded-lg shadow-md object-cover" />
                    <p className="text-gray-700 whitespace-pre-line leading-relaxed flex-1">{scene.text}</p>
                  </div>
                ))}
              </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <button onClick={handleDownload} className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-500 text-white font-semibold rounded-xl shadow-lg hover:bg-blue-600 transition-colors">
              <DownloadIcon />
              <span>ดาวน์โหลดนิทาน</span>
            </button>
            <button onClick={onComplete} className="flex items-center justify-center gap-2 px-6 py-3 bg-green-500 text-white font-semibold rounded-xl shadow-lg hover:bg-green-600 transition-colors">
              <span>เล่นอีกครั้ง</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (currentScene) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-sky-100 via-pink-100 to-amber-100 p-4 sm:p-8 overflow-hidden">
        <div className="w-full max-w-4xl flex flex-col lg:flex-row gap-4 sm:gap-6 animate-[fade-in_0.5s_ease-out]">
          <div className="w-full lg:w-1/2 aspect-video rounded-2xl shadow-2xl overflow-hidden relative">
            <img src={currentScene.imageUrl} alt="Story illustration" className="w-full h-full object-cover" />
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-t from-black/50 to-transparent pointer-events-none"></div>
            <button 
              onClick={(e) => handleSpeakIconClick(e, currentScene.text)}
              className="absolute top-4 right-4 p-3 bg-white/70 backdrop-blur-sm rounded-full text-purple-600 hover:bg-white transition-colors z-10"
            >
              {isSpeaking ? <SpeakerOffIcon /> : <SpeakerIcon />}
            </button>
          </div>
          
          <div className="w-full lg:w-1/2 flex flex-col justify-between bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-xl">
            <div className="overflow-y-auto max-h-[200px] sm:max-h-[300px] pr-2">
                <p className="text-gray-800 text-lg sm:text-xl leading-relaxed">{currentScene.text}</p>
            </div>
            
            {currentScene.choices && currentScene.choices.length > 0 && (
              <div className="mt-4">
                <h2 className="text-xl font-bold text-purple-700 mb-3 flex items-center gap-2">
                  <SparkleIcon />
                  <span>จะเกิดอะไรขึ้นต่อไปดีนะ?</span>
                </h2>
                <div className="grid grid-cols-1 gap-3">
                  {currentScene.choices.map((choice, index) => (
                    <button
                      key={index}
                      onClick={() => handleChoice(choice)}
                      className="w-full text-left p-4 bg-purple-100 text-purple-800 font-semibold rounded-lg hover:bg-purple-200 transition-colors shadow-sm"
                    >
                      {choice}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center">
      <p>กำลังเตรียมเรื่องราว...</p>
    </div>
  );
};

export default Storybook;
