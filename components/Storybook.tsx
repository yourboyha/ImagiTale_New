
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Word, Language, StoryTone, StoryScene } from '../types';
import {
  generateInitialStoryScene,
  generateNextStoryScene,
  generateFinalStoryScene,
  generateStoryTitle,
} from '../services/geminiService';
import DownloadIcon from './icons/DownloadIcon';
import SparkleIcon from './icons/SparkleIcon';
import MicrophoneIcon from './icons/MicrophoneIcon';
import StopIcon from './icons/StopIcon';
import HomeIcon from './icons/HomeIcon';
import RepeatIcon from './icons/RepeatIcon';

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

const useTypewriter = (text: string, speed: number = 30) => {
    const [displayText, setDisplayText] = useState('');

    useEffect(() => {
        setDisplayText('');
        if (text) {
            let i = 0;
            const timerId = setInterval(() => {
                if (i < text.length) {
                    setDisplayText(text.slice(0, i + 1));
                    i++;
                } else {
                    clearInterval(timerId);
                }
            }, speed);
            return () => clearInterval(timerId);
        }
    }, [text, speed]);

    useEffect(() => {
        // When text changes, immediately show the first character
        if (text) {
            setDisplayText(text.substring(0, 1));
        }
    }, [text]);


    return displayText;
};


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

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  
  // @ts-ignore
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognitionRef = useRef(SpeechRecognition ? new SpeechRecognition() : null);
  const isMounted = useRef(true);

  const wordList = words.map(w => language === Language.TH ? w.thai : w.english);
  const currentScene = scenes[scenes.length - 1];
  const displayedText = useTypewriter(currentScene?.text || '');

  useEffect(() => {
    isMounted.current = true;
    const createInitialScene = async () => {
      try {
        const initialScene = await generateInitialStoryScene(wordList, language, storyTone, isImageGenerationEnabled);
        if (isMounted.current) setScenes([initialScene]);
      } catch (error) {
        console.error("Failed to generate initial scene:", error);
        if (isMounted.current) setScenes([{ text: 'เกิดข้อผิดพลาด! ลองใหม่อีกครั้งนะ', imageUrl: '', choices: [] }]);
      } finally {
        if(isMounted.current) setIsLoading(false);
      }
    };
    createInitialScene();
    
    return () => {
      isMounted.current = false;
      stopSpeech();
      if (recognitionRef.current) {
          recognitionRef.current.abort();
      }
    };
  }, []); // Eslint will complain, but dependencies are stable and we only want this on mount.

  useEffect(() => {
    if (currentScene && !isLoading && currentScene.text) {
      speak(currentScene.text, language);
    }
  }, [currentScene, isLoading]); // Deliberately not including speak to avoid re-speaking on prop changes

  const generateStoryFromChoice = useCallback(async (userInput: string) => {
    if (isLoading) return;
    setIsLoading(true);
    stopSpeech();
    
    // Changed to 5 scenes total: 1 initial, 3 "next", 1 final
    if (scenes.length < 4) {
      setLoadingMessage('AI กำลังแต่งเรื่องราวต่อไป...');
      const storySoFar = scenes.map(s => s.text).join('\n\n');
      const nextScene = await generateNextStoryScene(storySoFar, userInput, language, storyTone, wordList, isImageGenerationEnabled, scenes.length + 1);
      if (isMounted.current) {
        setScenes(prev => [...prev, nextScene]);
        setIsLoading(false);
      }
    } else {
      setLoadingMessage('กำลังสร้างตอนจบของนิทาน...');
      const storySoFar = [...scenes.map(s => s.text), userInput].join('\n\n');
      const finalScene = await generateFinalStoryScene(storySoFar, language, storyTone, wordList, isImageGenerationEnabled);
      if (isMounted.current) setScenes(prev => [...prev, finalScene]);
      
      const fullStory = scenes.map(s => s.text).concat(finalScene.text).join('\n\n');
      const generatedTitle = await generateStoryTitle(fullStory, language);
      
      if (isMounted.current) {
        setTitle(generatedTitle);
        setIsStoryFinished(true);
        setIsLoading(false);
      }
    }
  }, [isLoading, scenes, language, storyTone, wordList, isImageGenerationEnabled, stopSpeech]);

  const processVoiceCommand = useCallback((finalTranscript: string) => {
    if (!finalTranscript) {
      speak("ขอโทษนะ ไม่ได้ยินเลย ลองพูดอีกครั้งได้ไหม", Language.TH);
      return;
    }
    // Send the entire user transcript to the AI for creative story generation
    generateStoryFromChoice(finalTranscript);
  }, [generateStoryFromChoice, speak]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  }, [isListening]);
  
  const startListening = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition || isListening) return;

    stopSpeech();
    setTranscript('');
    setIsListening(true);

    recognition.lang = language;
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let final = '';
      let interim = '';
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      if (isMounted.current) {
          setTranscript(final || interim);
      }
      
      if (final.trim()) {
        recognition.stop(); 
        processVoiceCommand(final.trim());
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Story speech recognition error:', event.error);
      if (isMounted.current) setIsListening(false);
    };

    recognition.onend = () => {
        if(isMounted.current) setIsListening(false);
    };
    recognition.start();
  }, [isListening, stopSpeech, language, processVoiceCommand]);

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

  const handleSpeakChoice = (choice: string) => {
      if(isSpeaking) stopSpeech();
      speak(choice, language);
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
                    {scene.imageUrl && <img src={scene.imageUrl} alt={`Scene ${index + 1}`} className="w-full sm:w-48 h-auto rounded-lg shadow-md object-cover" />}
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
              <HomeIcon />
              <span>เล่นอีกครั้ง</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (currentScene) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-sky-100 via-pink-100 to-amber-100 p-4 sm:p-8 overflow-y-auto">
        <div className="w-full max-w-3xl h-full flex flex-col gap-4 sm:gap-6 animate-[bounce-in_0.5s_ease-out]">
          <div className="w-full h-auto aspect-video rounded-2xl shadow-2xl overflow-hidden relative flex-shrink-0">
            {currentScene.imageUrl ?
                <img src={currentScene.imageUrl} alt="Story illustration" className="w-full h-full object-cover" />
                : <div className="w-full h-full bg-gray-200 flex items-center justify-center"><p>กำลังวาดภาพ...</p></div>
            }
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-t from-black/50 to-transparent pointer-events-none"></div>
            <button 
              onClick={(e) => handleSpeakIconClick(e, currentScene.text)}
              className="absolute top-4 right-4 p-3 bg-white/70 backdrop-blur-sm rounded-full text-purple-600 hover:bg-white transition-colors z-10"
              aria-label={isSpeaking ? "หยุดพูด" : "ฟังเนื้อเรื่องซ้ำ"}
            >
              <RepeatIcon />
            </button>
          </div>
          
          <div className="w-full flex flex-col flex-grow bg-white/80 backdrop-blur-sm p-4 sm:p-6 rounded-2xl shadow-xl overflow-hidden">
            <div className="overflow-y-auto flex-grow pr-2 mb-4">
                <p className="text-gray-800 text-lg sm:text-xl leading-relaxed">{displayedText}</p>
            </div>
            
            {currentScene.choices && currentScene.choices.length > 0 && (
              <div className="flex-shrink-0 mt-auto pt-4 border-t">
                <h2 className="text-xl font-bold text-purple-700 mb-3 flex items-center gap-2">
                  <SparkleIcon />
                  <span>จะเกิดอะไรขึ้นต่อไปดีนะ?</span>
                </h2>
                <div className="grid grid-cols-1 gap-3">
                  {currentScene.choices.map((choice, index) => (
                    <button
                      key={index}
                      onClick={() => handleSpeakChoice(choice)}
                      className="w-full text-left p-4 bg-purple-100 text-purple-800 font-semibold rounded-lg hover:bg-purple-200 transition-colors shadow-sm"
                      aria-label={`ฟังตัวเลือก: ${choice}`}
                    >
                      {choice}
                    </button>
                  ))}
                </div>
                <div className="mt-4 flex flex-col items-center gap-2">
                    <p className="text-gray-600 text-sm h-5 text-center">{transcript || "กดปุ่มแล้วเลือกทางต่อไป!"}</p>
                    <button
                        onClick={isListening ? stopListening : startListening}
                        className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 text-white shadow-lg ${isListening ? 'bg-red-500 animate-pulse' : 'bg-blue-500 hover:bg-blue-600'}`}
                        aria-label={isListening ? 'หยุดฟัง' : 'เลือกตัวเลือกด้วยเสียง'}
                    >
                        <div className="w-10 h-10">
                            {isListening ? <StopIcon /> : <MicrophoneIcon />}
                        </div>
                    </button>
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