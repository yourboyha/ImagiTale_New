import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Word, Language, StoryTone, StoryScene } from '../types';
import {
  generateInitialStoryScene,
  generateNextStoryScene,
  generateFinalStoryScene,
  generateStoryTitle,
} from '../services/geminiService';
import DownloadIcon from './icons/DownloadIcon';
import MicrophoneIcon from './icons/MicrophoneIcon';
import StopIcon from './icons/StopIcon';
import HomeIcon from './icons/HomeIcon';
import SettingsIcon from './icons/SettingsIcon';
import RepeatIcon from './icons/RepeatIcon';
import PreloadingScreen from './PreloadingScreen';

interface StorybookProps {
  words: Word[];
  onComplete: () => void;
  language: Language;
  storyTone: StoryTone;
  isImageGenerationEnabled: boolean;
  speak: (text: string, lang?: Language) => void;
  stopSpeech: () => void;
  isSpeaking: boolean;
  onSettingsClick: () => void;
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
  onSettingsClick,
}) => {
  const [scenes, setScenes] = useState<StoryScene[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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

  const handleFinishStory = useCallback(async () => {
    if (!isMounted.current) return;
    setIsLoading(true);
    const fullStory = scenes.map(s => s.text).join('\n\n');
    const generatedTitle = await generateStoryTitle(fullStory, language);
    
    if (isMounted.current) {
      setTitle(generatedTitle);
      setIsStoryFinished(true);
      setIsLoading(false);
    }
  }, [scenes, language]);

  const generateStoryFromChoice = useCallback(async (userInput: string) => {
    if (isLoading) return;
    setIsLoading(true);
    stopSpeech();
    
    const totalScenes = 5;
    let newScene: StoryScene | null = null;
    
    if (scenes.length < totalScenes) {
      if (scenes.length < totalScenes - 1) {
        // Generating scenes 2, 3, 4
        const storySoFar = scenes.map(s => s.text).join('\n\n');
        newScene = await generateNextStoryScene(storySoFar, userInput, language, storyTone, wordList, isImageGenerationEnabled, scenes.length + 1);
      } else { 
        // Generating scene 5 (the final one)
        const storyForFinalScene = [...scenes.map(s => s.text), userInput].join('\n\n');
        newScene = await generateFinalStoryScene(storyForFinalScene, language, storyTone, wordList, isImageGenerationEnabled);
      }
    }

    if (isMounted.current && newScene) {
      setScenes(prev => [...prev, newScene]);
    }
    if (isMounted.current) {
      setIsLoading(false);
    }
  }, [isLoading, scenes, language, storyTone, wordList, isImageGenerationEnabled, stopSpeech]);

  const processVoiceCommand = useCallback((finalTranscript: string) => {
    if (!finalTranscript) {
      speak("ขอโทษนะ ไม่ได้ยินเลย ลองพูดอีกครั้งได้ไหม", Language.TH);
      return;
    }
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
      const { jsPDF } = await import('jspdf');
      const html2canvas = (await import('html2canvas')).default;

      const canvas = await html2canvas(storyContainerRef.current, {
        scale: 2,
        backgroundColor: '#f3e8ff',
        useCORS: true,
      });
      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`${(title || 'imagitale-story').replace(/\s+/g, '-').toLowerCase()}.pdf`);
      
    } catch (e) {
      console.error('Download failed:', e);
      alert('ขออภัย, ไม่สามารถดาวน์โหลดเรื่องราวเป็น PDF ได้ในขณะนี้');
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
    return <PreloadingScreen />;
  }

  if (isStoryFinished && currentScene) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-yellow-50 via-rose-50 to-sky-50 p-4 sm:p-8 overflow-y-auto">
        <div className="w-full max-w-3xl bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl p-6 sm:p-8 space-y-4 animate-[bounce-in_0.5s_ease-out]">
          <div ref={storyContainerRef} className="bg-purple-50 p-6 rounded-lg">
              <h1 className="text-3xl sm:text-4xl font-['Lilita_One'] text-purple-700 text-center mb-4">{title}</h1>
              <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
                {scenes.map((scene, index) => (
                  <div key={index} className="flex flex-col items-center gap-4">
                    {scene.imageUrl && <img src={scene.imageUrl} alt={`Scene ${index + 1}`} className="w-full max-w-md h-auto rounded-lg shadow-lg object-cover" />}
                    <p className="text-gray-700 whitespace-pre-line leading-relaxed max-w-prose text-left">{scene.text}</p>
                  </div>
                ))}
              </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <button onClick={handleDownload} className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-500 text-white font-semibold rounded-xl shadow-lg hover:bg-blue-600 transition-colors">
              <DownloadIcon />
              <span>ดาวน์โหลด PDF</span>
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
    const totalScenes = 5;
    return (
      <div className="w-full h-full flex items-center justify-center bg-yellow-50 p-2 sm:p-4">
        {/* Main Card */}
        <div className="w-full max-w-5xl h-full bg-[#fefaf0] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-[bounce-in_0.5s_ease-out] p-4 sm:p-6 gap-4">
          
          {/* Header */}
           <header className="flex-shrink-0">
                <div className="w-full bg-pink-100 rounded-full h-2.5 mb-2">
                    <div className="bg-pink-400 h-2.5 rounded-full transition-width duration-500" style={{ width: `${(scenes.length / totalScenes) * 100}%` }}></div>
                </div>
                <div className="flex justify-end items-center gap-4 text-gray-500">
                    <span className="font-semibold whitespace-nowrap">หน้า {scenes.length} / {totalScenes}</span>
                    <button onClick={onComplete} className="hover:text-gray-800 transition-colors"><HomeIcon /></button>
                    <button onClick={onSettingsClick} className="hover:text-gray-800 transition-colors"><SettingsIcon /></button>
                </div>
            </header>

          {/* Image */}
          <div className="w-full aspect-video md:h-[40%] rounded-xl shadow-lg overflow-hidden relative bg-gray-800 flex items-center justify-center text-white text-xl font-semibold flex-shrink-0 md:aspect-auto">
              {currentScene.imageUrl ?
                  <img src={currentScene.imageUrl} alt="Story illustration" className="w-full h-full object-cover" />
                  : <p>ภาพประกอบนิทาน</p>
              }
            </div>
            
          {/* Main Content Area */}
          <div className="flex-grow flex flex-col lg:flex-row gap-4 min-h-0 overflow-y-auto">
              {/* Left: Story Text */}
              <div className="w-full lg:flex-[2] bg-white p-4 rounded-xl shadow-md relative border">
                  <p className="text-gray-800 text-lg leading-relaxed whitespace-pre-line pr-10">{displayedText}</p>
                  <button 
                      onClick={(e) => handleSpeakIconClick(e, currentScene.text)}
                      className="absolute top-4 right-4 p-2 text-gray-500 hover:text-gray-800 transition-colors"
                      aria-label={isSpeaking ? "หยุดพูด" : "ฟังเนื้อเรื่องซ้ำ"}
                  >
                      <RepeatIcon />
                  </button>
              </div>

              {/* Right: Choices & Mic OR Finish Button */}
              {scenes.length < totalScenes ? (
                <div className="w-full lg:flex-[1.2] flex flex-col justify-start gap-3">
                  {currentScene.choices && currentScene.choices.length > 0 && (
                    currentScene.choices.map((choice, index) => (
                      <button
                        key={index}
                        onClick={() => speak(choice, language)}
                        className="w-full text-left p-4 bg-purple-500 text-white font-semibold rounded-xl hover:bg-purple-600 transition-colors shadow-md "
                      >
                        {choice}
                      </button>
                    ))
                  )}
                  {/* Footer: Mic */}
                  <footer className="flex-shrink-0 flex flex-col items-center justify-center gap-1 mt-4">
                    <button
                      onClick={isListening ? stopListening : startListening}
                      className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 text-white shadow-lg ${isListening ? 'bg-red-500 animate-pulse' : 'bg-pink-500 hover:bg-pink-600'}`}
                      aria-label={isListening ? 'หยุดฟัง' : 'เลือกตัวเลือกด้วยเสียง'}
                    >
                      <div className="w-8 h-8">
                        {isListening ? <StopIcon /> : <MicrophoneIcon />}
                      </div>
                    </button>
                    <p className="text-gray-600 text-sm h-5 mt-1">{transcript || ""}</p>
                  </footer>
                </div>
              ) : (
                <div className="w-full lg:flex-[1.2] flex flex-col items-center justify-center gap-4 p-4 animate-[bounce-in_0.5s_ease-out]">
                    <h3 className="text-2xl font-bold text-purple-700 text-center">และแล้ว... นิทานก็จบลง</h3>
                    <p className="text-gray-600 text-center">ยอดเยี่ยมมาก! ไปดูบทสรุปและผลงานชิ้นเอกของน้องกันเถอะ</p>
                    <button
                        onClick={handleFinishStory}
                        className="w-full max-w-xs mt-4 px-8 py-4 font-['Lilita_One'] text-white text-2xl rounded-2xl shadow-lg transform transition-all duration-200 ease-in-out border-b-8 active:border-b-2 active:translate-y-1 bg-gradient-to-b from-green-500 to-teal-600 border-green-700 hover:from-green-400 hover:to-teal-500"
                    >
                        ไปดูบทสรุป
                    </button>
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