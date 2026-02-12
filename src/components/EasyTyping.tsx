import { useState, useEffect } from 'react';
import { ArrowLeft, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as api from '../utils/api';

interface Verse {
  reference: string;
  text: string;
  book?: string;
  chapter?: number;
  verseNum?: number;
}

interface EasyTypingProps {
  topicId: string;
  onBack: () => void;
  onComplete: (earnedCredits: number) => void;
}

// Mock verse data
const versesByTopic: { [key: string]: Verse[] } = {
  love: [
    { reference: '요한일서 4:8', text: '사랑하지 아니하는 자는 하나님을 알지 못하나니 이는 하나님은 사랑이심이라', book: '요한일서', chapter: 4, verseNum: 8 },
    { reference: '고린도전서 13:4', text: '사랑은 오래 참고 사랑은 온유하며 시기하지 아니하며 사랑은 자랑하지 아니하며 교만하지 아니하며', book: '고린도전서', chapter: 13, verseNum: 4 },
    { reference: '요한복음 3:16', text: '하나님이 세상을 이처럼 사랑하사 독생자를 주셨으니 이는 그를 믿는 자마다 멸망하지 않고 영생을 얻게 하려 하심이라', book: '요한복음', chapter: 3, verseNum: 16 },
  ],
  joy: [
    { reference: '시편 16:11', text: '주께서 생명의 길을 내게 보이시리니 주의 앞에는 충만한 기쁨이 있고 주의 오른쪽에는 영원한 즐거움이 있나이다', book: '시편', chapter: 16, verseNum: 11 },
    { reference: '빌립보서 4:4', text: '주 안에서 항상 기뻐하라 내가 다시 말하노니 기뻐하라', book: '빌립보서', chapter: 4, verseNum: 4 },
  ],
  peace: [
    { reference: '빌립보서 4:7', text: '그리하면 모든 지각에 뛰어난 하나님의 평강이 그리스도 예수 안에서 너희 마음과 생각을 지키시리라', book: '빌립보서', chapter: 4, verseNum: 7 },
    { reference: '요한복음 14:27', text: '평안을 너희에게 끼치노니 곧 나의 평안을 너희에게 주노라 내가 너희에게 주는 것은 세상이 주는 것과 같지 아니하니라', book: '요한복음', chapter: 14, verseNum: 27 },
  ],
  protection: [
    { reference: '시편 91:11', text: '그가 너를 위하여 그의 천사들을 명령하사 네 모든 길에서 너를 지키게 하심이라', book: '시편', chapter: 91, verseNum: 11 },
  ],
  hope: [
    { reference: '예레미야 29:11', text: '여호와의 말씀이니라 너희를 향한 나의 생각을 내가 아나니 평안이요 재앙이 아니니라 너희에게 미래와 희망을 주는 것이니라', book: '예레미야', chapter: 29, verseNum: 11 },
  ],
  grace: [
    { reference: '에베소서 2:8', text: '너희는 그 은혜에 의하여 믿음으로 말미암아 구원을 받았으니 이것은 너희에게서 난 것이 아니요 하나님의 선물이라', book: '에베소서', chapter: 2, verseNum: 8 },
  ],
  gratitude: [
    { reference: '데살로니가전서 5:18', text: '범사에 감사하라 이것이 그리스도 예수 안에서 너희를 향하신 하나님의 뜻이니라', book: '데살로니가전서', chapter: 5, verseNum: 18 },
  ],
  wisdom: [
    { reference: '잠언 3:5-6', text: '너는 마음을 다하여 여호와를 신뢰하고 네 명철을 의지하지 말라 너는 범사에 그를 인정하라 그리하면 네 길을 지도하시리라', book: '잠언', chapter: 3, verseNum: 5 },
  ],
};

export default function EasyTyping({ topicId, onBack, onComplete }: EasyTypingProps) {
  const verses = versesByTopic[topicId] || versesByTopic.love;
  const [currentVerseIndex, setCurrentVerseIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showCreditAnimation, setShowCreditAnimation] = useState(false);
  const [totalEarned, setTotalEarned] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  const currentVerse = verses[currentVerseIndex];

  // Save transcription to DB
  const saveTranscriptionToDB = async (verse: Verse, credits: number) => {
    try {
      setIsSaving(true);
      const result = await api.saveTranscription({
        mode: 'easy',
        verse: verse.text,
        credits,
        book: verse.book || '',
        chapter: verse.chapter || 0,
        verseNum: verse.verseNum || 0,
      });
      console.log('Transcription saved:', result);
    } catch (error) {
      console.error('Failed to save transcription:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Check if input matches
  useEffect(() => {
    if (userInput.length === 0) {
      setIsCorrect(null);
      return;
    }

    const trimmedInput = userInput.trim();
    const targetText = currentVerse.text;

    if (trimmedInput === targetText) {
      setIsCorrect(true);
      // Trigger credit animation
      setShowCreditAnimation(true);
      const earnedCredits = 10;
      setTotalEarned(totalEarned + earnedCredits);

      // Save to DB
      saveTranscriptionToDB(currentVerse, earnedCredits);

      // Move to next verse after delay
      setTimeout(() => {
        setShowCreditAnimation(false);
        if (currentVerseIndex < verses.length - 1) {
          setCurrentVerseIndex(currentVerseIndex + 1);
          setUserInput('');
          setIsCorrect(null);
        } else {
          // Topic completed
          setTimeout(() => {
            onComplete(totalEarned + earnedCredits);
          }, 500);
        }
      }, 1500);
    } else if (targetText.startsWith(trimmedInput)) {
      setIsCorrect(null); // Still typing correctly
    } else {
      setIsCorrect(false); // Wrong input
    }
  }, [userInput]);

  const getHighlightedText = () => {
    const targetText = currentVerse.text;
    const trimmedInput = userInput.trim();

    if (trimmedInput.length === 0) return targetText;

    const matched = targetText.slice(0, trimmedInput.length);
    const remaining = targetText.slice(trimmedInput.length);

    const isMatching = targetText.startsWith(trimmedInput);

    return (
      <>
        <span className={isMatching ? 'text-[#6750a4]' : 'text-[#ba1a1a]'}>
          {matched}
        </span>
        <span className="text-[#49454f]">{remaining}</span>
      </>
    );
  };

  return (
    <div className="px-4 pt-12 pb-4 relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <button
            onClick={onBack}
            className="p-2 -ml-2 hover:bg-[#f5f5f5] rounded-full transition-colors active:bg-[#e8e8e8]"
          >
            <ArrowLeft className="w-6 h-6 text-[#1d1b20]" />
          </button>
          <h1 className="text-[#1d1b20] text-xl ml-2">
            {currentVerseIndex + 1} / {verses.length}
          </h1>
        </div>
        <div className="flex items-center gap-2 bg-[#e8def8] px-4 py-2 rounded-full">
          <span className="text-[#6750a4] font-semibold text-sm">+{totalEarned}C</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6 h-1 bg-[#e7e0ec] rounded-full overflow-hidden">
        <div
          className="h-full bg-[#6750a4] transition-all duration-300"
          style={{ width: `${((currentVerseIndex + 1) / verses.length) * 100}%` }}
        />
      </div>

      {/* Verse Reference */}
      <div className="text-center mb-4">
        <span className="text-[#6750a4] font-semibold text-base">
          {currentVerse.reference}
        </span>
      </div>

      {/* Verse Text Display */}
      <div className="bg-white rounded-[16px] p-6 shadow-sm mb-4 min-h-[120px]">
        <p className="text-lg leading-relaxed">
          {getHighlightedText()}
        </p>
      </div>

      {/* Input Area */}
      <div className="bg-white rounded-[16px] p-4 shadow-sm">
        <textarea
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="여기에 성경 구절을 입력하세요..."
          className="w-full min-h-[120px] text-base text-[#1d1b20] placeholder:text-[#79747e] focus:outline-none resize-none"
          autoFocus
        />
        
        {/* Status Indicator */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#e7e0ec]">
          <span className="text-sm text-[#49454f]">
            {userInput.trim().length} / {currentVerse.text.length} 자
          </span>
          {isCorrect === true && (
            <div className="flex items-center gap-1 text-[#4caf50]">
              <Check className="w-5 h-5" />
              <span className="text-sm font-medium">완료!</span>
            </div>
          )}
          {isCorrect === false && (
            <div className="flex items-center gap-1 text-[#ba1a1a]">
              <X className="w-5 h-5" />
              <span className="text-sm font-medium">다시 확인하세요</span>
            </div>
          )}
        </div>
      </div>

      {/* Credit Animation */}
      <AnimatePresence>
        {showCreditAnimation && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -50 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50"
          >
            <div className="bg-[#6750a4] text-white px-8 py-4 rounded-[20px] shadow-2xl">
              <div className="text-center">
                <div className="text-4xl font-bold mb-1">+10 C</div>
                <div className="text-sm opacity-90">크레딧 획득!</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tip */}
      <div className="mt-4 p-3 bg-[#e8def8] rounded-[12px]">
        <p className="text-[#1d1b20] text-xs text-center">
          💡 띄어쓰기와 문장부호까지 정확히 입력해주세요
        </p>
      </div>
    </div>
  );
}