import React, { useState, useEffect } from 'react';

const loadingMessages = [
  "กำลังชงยาวิเศษ...",
  "กำลังรวบรวมละอองดาว...",
  "กำลังปลุกยักษ์ที่หลับใหล...",
  "กำลังขัดลูกแก้ววิเศษ...",
  "กำลังวาดแผนที่สมบัติ...",
  "กำลังลับคมดาบของผู้กล้า...",
  "กำลังเตรียมคาถาแห่งจินตนาการ...",
  "กำลังป้อนแครอทให้ยูนิคอร์น...",
  "กำลังสร้างปราสาทบนก้อนเมฆ...",
  "กำลังตามหามังกรที่เป็นมิตร...",
];

const PreloadingScreen: React.FC = () => {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setMessageIndex((prevIndex) => (prevIndex + 1) % loadingMessages.length);
    }, 2500);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-purple-100 text-purple-800 p-8 overflow-hidden">
      <div className="relative w-64 h-64 mb-6">
        {/* Floating Icons */}
        <div className="absolute top-0 left-0 w-full h-full">
            <svg className="absolute w-16 h-16 text-yellow-400 opacity-80" style={{ top: '5%', left: '10%', animation: 'float-preloader 6s ease-in-out infinite' }} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
            <svg className="absolute w-12 h-12 text-pink-400 opacity-80" style={{ top: '65%', left: '5%', animation: 'float-preloader 8s ease-in-out infinite .5s' }} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" /></svg>
            <svg className="absolute w-14 h-14 text-sky-400 opacity-80" style={{ top: '15%', right: '8%', animation: 'float-preloader 7s ease-in-out infinite 1s' }} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M5.5 16a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 16h-8z" /></svg>
        </div>

        {/* Spinning Book */}
        <div className="w-full h-full flex items-center justify-center animate-[spin-preloader_20s_linear_infinite]">
            <svg className="w-48 h-48 text-purple-500" style={{ filter: 'drop-shadow(0 10px 8px rgb(0 0 0 / 0.1))' }} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 16c1.255 0 2.443-.29 3.5-.804V4.804zM14.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 0014.5 16c1.255 0 2.443-.29 3.5-.804v-10A7.968 7.968 0 0014.5 4z" />
            </svg>
        </div>
      </div>

      <div className="relative h-16 w-full max-w-sm text-center">
        <div 
          key={messageIndex} 
          className="absolute inset-0 animate-[bounce-in_0.5s_ease-out]"
        >
          <h2 className="text-2xl font-bold">{loadingMessages[messageIndex]}</h2>
          <p className="mt-2 text-lg">เตรียมความพร้อมสักครู่นะ!</p>
        </div>
      </div>
    </div>
  );
};

export default PreloadingScreen;
