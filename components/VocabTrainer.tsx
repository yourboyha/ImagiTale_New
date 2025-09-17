import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Word, PreloadedWord, Language } from '../types';
import SpeakerIcon from './icons/SpeakerIcon';
import SpeakerOffIcon from './icons/SpeakerOffIcon';
import BadgeIcon from './icons/BadgeIcon';
import MicrophoneIcon from './icons/MicrophoneIcon';
import StopIcon from './icons/StopIcon';

// @ts-ignore
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

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
  language,
  initialData,
  speak,
  stopSpeech,
  isSpeaking,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showEnglish, setShowEnglish] = useState(false);
  const [words, setWords] = useState<Word[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | 'thinking' | null>(null);

  const recognitionRef = useRef(SpeechRecognition ? new SpeechRecognition() : null);
  const isProcessing = useRef(false);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    setWords(initialData.map(item => item.word));
  }, [initialData]);

  const handleNext = useCallback(() => {
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    setFeedback(null);
    setTranscript('');
    setShowEnglish(false);
    if (currentIndex < initialData.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onComplete(words);
    }
  }, [currentIndex, initialData.length, onComplete, words]);

  useEffect(() => {
    isMounted.current = true;
    speak("มาเริ่มฝึกคำศัพท์กันเลย! กดปุ่มไมโครโฟนแล้วพูดคำศัพท์ที่เห็นเป็นภาษาไทย หรือภาษาอังกฤษก็ได้นะ ถ้าน้องๆ พูดเป็นประโยค จะมีโอกาสทายถูกเพิ่มขึ้นด้วยนะ");
    
    return () => {
      isMounted.current = false;
      stopSpeech();
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
    };
  }, [speak, stopSpeech]);
  
  // Auto-speak the word when the card changes
  useEffect(() => {
    if (initialData.length > 0 && initialData[currentIndex]) {
      speak(initialData[currentIndex].word.thai, Language.TH);
    }
    return () => {
      stopSpeech();
    };
  }, [currentIndex, initialData, speak, stopSpeech]);

  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = language;
    }
  }, [language]);

  const processSpeech = useCallback((finalTranscript: string) => {
    if (!finalTranscript || !initialData[currentIndex]) return;
    
    setFeedback('thinking');
    const currentWordData = initialData[currentIndex].word;
    const thaiWord = currentWordData.thai.toLowerCase();
    const englishWord = currentWordData.english.toLowerCase();
    const transcriptLower = finalTranscript.toLowerCase().trim();

    const isCorrect = transcriptLower.includes(thaiWord) || transcriptLower.includes(englishWord);

    feedbackTimeoutRef.current = setTimeout(() => {
      if (!isMounted.current) return;
      if (isCorrect) {
        setFeedback('correct');
        speak("เก่งมาก!", Language.TH);
        feedbackTimeoutRef.current = setTimeout(() => {
          if (isMounted.current) handleNext();
        }, 1500);
      } else {
        setFeedback('incorrect');
        speak("เอ๊ะ ไม่ใช่ ลองอีกครั้งนะ", Language.TH);
        feedbackTimeoutRef.current = setTimeout(() => {
          if (isMounted.current) {
            setFeedback(null);
            setTranscript('');
          }
        }, 2000);
      }
    }, 500);
  }, [currentIndex, initialData, speak, handleNext]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  }, [isListening]);

  const startListening = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition || isListening || feedback) return;

    stopSpeech();
    setTranscript('');
    setIsListening(true);
    isProcessing.current = false;

    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let final = ''; let interim = '';
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) final += event.results[i][0].transcript;
        else interim += event.results[i][0].transcript;
      }
      if (isMounted.current) setTranscript(final || interim);
      if (final && !isProcessing.current) {
        isProcessing.current = true;
        processSpeech(final);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Vocab speech recognition error:', event.error);
      if (isMounted.current) setIsListening(false);
    };

    recognition.onend = () => {
      if (isMounted.current) {
        setIsListening(false);
        if (!isProcessing.current && transcript.trim()) {
          isProcessing.current = true;
          processSpeech(transcript);
        }
      }
    };
    recognition.start();
  }, [isListening, feedback, stopSpeech, processSpeech, transcript]);

  const handleCardClick = () => {
    if (!isListening && !feedback) {
      setShowEnglish(prev => !prev);
    }
  };

  const handleSpeakIconClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSpeaking) {
      stopSpeech();
    } else if (initialData[currentIndex]) {
      speak(initialData[currentIndex].word.thai, Language.TH);
    }
  };
  
  if (initialData.length === 0) return <div className="w-full h-full flex items-center justify-center bg-gray-100"><p className="text-xl text-gray-600">กำลังเตรียมคำศัพท์...</p></div>;
  
  const currentWord = initialData[currentIndex];
  if (!currentWord) return <div className="w-full h-full flex items-center justify-center bg-gray-100"><p className="text-xl text-gray-600">กำลังโหลด...</p></div>;

  const progressPercentage = ((currentIndex + 1) / initialData.length) * 100;
  const isLastCard = currentIndex === initialData.length - 1;

  const feedbackClasses: Record<string, string> = {
    correct: 'ring-8 ring-green-400 shadow-lg shadow-green-200',
    incorrect: 'ring-8 ring-red-400 shadow-lg shadow-red-200 animate-shake',
    thinking: 'ring-8 ring-purple-400 shadow-lg shadow-purple-200',
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-blue-100 via-indigo-100 to-purple-100 p-4 sm:p-8 overflow-hidden">
      <div className="w-full max-w-lg mx-auto flex flex-col gap-4">
        <header className="text-center animate-[bounce-in_0.5s_ease-out]">
          <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-md">
            <BadgeIcon />
            <h1 className="text-2xl font-bold text-purple-700">ฝึกคำศัพท์กับ AI</h1>
          </div>
        </header>

        <div className={`relative w-full aspect-[4/3] cursor-pointer group transition-all duration-300 rounded-2xl ${feedback ? feedbackClasses[feedback] : ''}`} onClick={handleCardClick} style={{ perspective: '1000px' }}>
          <div className="relative w-full h-full rounded-2xl shadow-2xl transition-transform duration-700 ease-in-out" style={{ transformStyle: 'preserve-3d', transform: showEnglish ? 'rotateY(180deg)' : 'rotateY(0deg)' }}>
            <div className="absolute w-full h-full bg-white rounded-2xl overflow-hidden flex flex-col items-center justify-center p-4" style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}>
              <img src={currentWord.imageUrl} alt={currentWord.word.english} className="w-full h-full object-contain" />
              <div className="absolute bottom-0 w-full bg-black/50 backdrop-blur-sm p-4 rounded-b-2xl">
                <p className="text-4xl font-bold text-white text-center">{currentWord.word.thai}</p>
              </div>
              <button onClick={handleSpeakIconClick} className="absolute top-4 right-4 p-3 bg-white/70 backdrop-blur-sm rounded-full text-purple-600 hover:bg-white transition-colors">
                {isSpeaking ? <SpeakerOffIcon /> : <SpeakerIcon />}
              </button>
            </div>
            <div className="absolute w-full h-full bg-purple-600 rounded-2xl overflow-hidden flex flex-col items-center justify-center p-4" style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
              <p className="text-5xl font-bold text-white text-center">{currentWord.word.english}</p>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col items-center gap-2">
            <button
                onClick={isListening ? stopListening : startListening}
                disabled={!!feedback}
                className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 text-white shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed ${isListening ? 'bg-red-500 animate-pulse scale-110' : 'bg-blue-500 hover:bg-blue-600'}`}
                aria-label={isListening ? 'หยุดฟัง' : 'เริ่มฟัง'}
            >
                <div className="w-10 h-10">
                    {isListening ? <StopIcon /> : <MicrophoneIcon />}
                </div>
            </button>
            <div className="min-h-[3rem] p-2 text-center text-gray-700 font-semibold text-lg">
                <p>{transcript || "กดปุ่มแล้วพูดคำศัพท์ได้เลย!"}</p>
            </div>
             <p className="text-center text-sm text-gray-500 -mt-2">✨ ลองพูดเป็นประโยค จะช่วยให้ AI จับคำได้ง่ายขึ้น!</p>
        </div>

        <footer className="w-full flex flex-col items-center gap-4">
          <div className="w-full bg-gray-200 rounded-full h-4 shadow-inner">
            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 h-4 rounded-full transition-all duration-500 ease-out" style={{ width: `${progressPercentage}%` }} />
          </div>
          <button onClick={handleNext} className="w-full px-8 py-4 font-['Lilita_One'] text-white text-3xl rounded-2xl shadow-lg transform transition-all duration-200 ease-in-out border-b-8 active:border-b-2 active:translate-y-1 bg-gradient-to-b from-green-500 to-teal-600 border-green-700 hover:from-green-400 hover:to-teal-500">
            {isLastCard ? 'ไปแต่งนิทานกัน!' : 'ข้ามคำนี้'}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default VocabTrainer;