import { useState, useEffect } from 'react';
import { ArrowLeft, Check, X, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as api from '../utils/api';

interface Verse {
  book: string;
  chapter: number;
  verse: number;
  text: string;
}

interface ExpertTypingProps {
  onBack: () => void;
  onComplete: (earnedCredits: number) => void;
  todayEarned: number;
  dailyLimit: number;
}

// Mock Bible data - 창세기 1장
const bibleVerses: Verse[] = [
  { book: '창세기', chapter: 1, verse: 1, text: '태초에 하나님이 천지를 창조하시니라' },
  { book: '창세기', chapter: 1, verse: 2, text: '땅이 혼돈하고 공허하며 흑암이 깊음 위에 있고 하나님의 영은 수면 위에 운행하시니라' },
  { book: '창세기', chapter: 1, verse: 3, text: '하나님이 이르시되 빛이 있으라 하시니 빛이 있었고' },
  { book: '창세기', chapter: 1, verse: 4, text: '빛이 하나님이 보시기에 좋았더라 하나님이 빛과 어둠을 나누사' },
  { book: '창세기', chapter: 1, verse: 5, text: '하나님이 빛을 낮이라 부르시고 어둠을 밤이라 부르시니라 저녁이 되고 아침이 되니 이는 첫째 날이니라' },
  { book: '창세기', chapter: 1, verse: 6, text: '하나님이 이르시되 물 가운데에 궁창이 있어 물과 물로 나뉘라 하시고' },
  { book: '창세기', chapter: 1, verse: 7, text: '하나님이 궁창을 만드사 궁창 아래의 물과 궁창 위의 물로 나뉘게 하시니 그대로 되니라' },
  { book: '창세기', chapter: 1, verse: 8, text: '하나님이 궁창을 하늘이라 부르시니라 저녁이 되고 아침이 되니 이는 둘째 날이니라' },
  { book: '창세기', chapter: 1, verse: 9, text: '하나님이 이르시되 천하의 물이 한 곳으로 모이고 뭍이 드러나라 하시니 그대로 되니라' },
  { book: '창세기', chapter: 1, verse: 10, text: '하나님이 뭍을 땅이라 부르시고 모인 물을 바다라 부르시니 하나님이 보시기에 좋았더라' },
];

export default function ExpertTyping({ onBack, onComplete, todayEarned, dailyLimit }: ExpertTypingProps) {
  const [currentVerseIndex, setCurrentVerseIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showCreditAnimation, setShowCreditAnimation] = useState(false);
  const [sessionEarned, setSessionEarned] = useState(0);
  const [reachedLimit, setReachedLimit] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false); // Prevent double-processing
  const [isLoadingProgress, setIsLoadingProgress] = useState(true);

  const currentVerse = bibleVerses[currentVerseIndex];
  const remainingCredits = dailyLimit - todayEarned;
  const canEarnMore = remainingCredits > 0;

  const handleNextVerse = async () => {
    if (isCorrect !== true || isProcessing) return;

    setIsProcessing(true);

    const newSessionEarned = sessionEarned + 10;
    const newTotalEarned = todayEarned + newSessionEarned;

    setSessionEarned(newSessionEarned);
    setShowCreditAnimation(true);

    await saveTranscriptionToDB(currentVerse, 10);

    if (newTotalEarned >= dailyLimit) {
      setReachedLimit(true);
      setTimeout(() => {
        onComplete(newSessionEarned);
      }, 2000);
      return;
    }

    setTimeout(() => {
      setShowCreditAnimation(false);

      const nextIndex = currentVerseIndex + 1;
      if (nextIndex < bibleVerses.length) {
        setCurrentVerseIndex(nextIndex);
        setUserInput('');
        setIsCorrect(null);
        setIsProcessing(false);
        return;
      }

      onComplete(newSessionEarned);
    }, 700);
  };

  // Save transcription to DB
  const saveTranscriptionToDB = async (verse: Verse, credits: number) => {
    try {
      setIsSaving(true);
      // 로컬 시간대 기준 날짜 계산
      const now = new Date();
      const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

      const result = await api.saveTranscription({
        mode: 'expert',
        verse: verse.text,
        credits,
        book: verse.book,
        chapter: verse.chapter,
        verseNum: verse.verse,
        date: localDate,
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
    if (userInput.length === 0 || isProcessing) {
      setIsCorrect(null);
      return;
    }

    const trimmedInput = userInput.trim();
    const targetText = currentVerse.text;

    if (trimmedInput === targetText) {
      setIsCorrect(true);
    } else if (targetText.startsWith(trimmedInput)) {
      setIsCorrect(null); // Still typing correctly
    } else {
      setIsCorrect(false); // Wrong input
    }
  }, [userInput, currentVerse.text, isProcessing]);

  // Load user's progress on mount
  useEffect(() => {
    const loadProgress = async () => {
      try {
        console.log('Loading expert mode progress...');

        // Get completed verses from API
        const result = await api.getCompletedVerses();
        console.log('API response:', result);

        if (!result || result.error) {
          console.error('Error from API:', result?.error);
          return;
        }

        const completedVersesMap = result.completedVerses || {};
        console.log('Completed verses map:', completedVersesMap);
        console.log('Number of completed verses:', Object.keys(completedVersesMap).length);

        // Find all completed verses in bibleVerses array
        const completedVerseIndexes = bibleVerses
          .map((verse, index) => {
            const key = `${verse.book}-${verse.chapter}-${verse.verse}`;
            return completedVersesMap[key] ? index : -1;
          })
          .filter((index: number) => index >= 0);

        console.log('Completed verse indexes:', completedVerseIndexes);

        if (completedVerseIndexes.length === 0) {
          console.log('No completed verses found, starting from first');
          setCurrentVerseIndex(0);
          return;
        }

        const furthestCompletedIndex = Math.max(...completedVerseIndexes);
        console.log('Furthest completed index:', furthestCompletedIndex);

        // Move to next verse after the furthest completed
        if (furthestCompletedIndex < bibleVerses.length - 1) {
          const nextIndex = furthestCompletedIndex + 1;
          setCurrentVerseIndex(nextIndex);
          console.log('Set current verse index to:', nextIndex);
        } else {
          console.log('All verses completed!');
        }
      } catch (error) {
        console.error('Failed to load progress:', error);
        setCurrentVerseIndex(0);
      } finally {
        setIsLoadingProgress(false);
      }
    };

    loadProgress();
  }, []);

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
          <div className="ml-2">
            <h1 className="text-[#1d1b20] text-xl font-semibold">전문가 모드</h1>
            <p className="text-[#49454f] text-xs">창세기부터 순서대로</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-[#e8def8] px-4 py-2 rounded-full">
          <span className="text-[#6750a4] font-semibold text-sm">+{sessionEarned}C</span>
        </div>
      </div>

      {/* Daily Progress */}
      <div className="mb-4 bg-white rounded-[16px] p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[#49454f] text-sm">오늘의 획득량</span>
          <span className="text-[#1d1b20] font-semibold text-sm">
            {todayEarned + sessionEarned} / {dailyLimit} C
          </span>
        </div>
        <div className="h-2 bg-[#e7e0ec] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#6750a4] transition-all duration-300"
            style={{ width: `${((todayEarned + sessionEarned) / dailyLimit) * 100}%` }}
          />
        </div>
        {remainingCredits <= 30 && remainingCredits > 0 && (
          <p className="text-[#ba1a1a] text-xs mt-2 text-center">
            ⚠️ 오늘 {remainingCredits / 10}절 남았습니다
          </p>
        )}
      </div>

      {isLoadingProgress ? (
        <div className="bg-white rounded-[16px] p-6 shadow-sm mb-4 min-h-[180px] flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-4 border-[#6750a4] border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-[#49454f] text-sm">이어쓰기 정보를 불러오는 중...</p>
        </div>
      ) : (
        <>
          {/* Verse Reference */}
          <div className="text-center mb-4">
            <span className="text-[#6750a4] font-semibold text-base">
              {currentVerse.book} {currentVerse.chapter}:{currentVerse.verse}
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
              disabled={!canEarnMore || isProcessing}
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

            <button
              onClick={handleNextVerse}
              disabled={isCorrect !== true || reachedLimit || isProcessing || isSaving}
              className={`w-full mt-3 py-3 rounded-full font-medium text-sm transition-all active:scale-98 ${isCorrect !== true || reachedLimit || isProcessing || isSaving
                ? 'bg-[#e7e0ec] text-[#79747e] cursor-not-allowed'
                : 'bg-[#6750a4] text-white shadow-md hover:shadow-lg'
                }`}
            >
              다음
            </button>
          </div>
        </>
      )}

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

      {/* Limit Reached */}
      <AnimatePresence>
        {reachedLimit && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          >
            <div className="bg-white rounded-[24px] p-8 mx-4 max-w-[320px] text-center">
              <div className="w-16 h-16 bg-[#ffd600] rounded-full flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-[#1d1b20] text-2xl font-bold mb-2">
                오늘의 한도 달성!
              </h2>
              <p className="text-[#49454f] text-sm mb-1">
                오늘 {dailyLimit}C를 모두 획득하셨습니다
              </p>
              <p className="text-[#49454f] text-sm">
                내일 다시 도전해주세요! 🎉
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!isLoadingProgress && (
        <div className="mt-4 p-3 bg-[#e8def8] rounded-[12px]">
          <p className="text-[#1d1b20] text-xs text-center">
            💡 띄어쓰기와 문장부호까지 정확히 입력해주세요
          </p>
        </div>
      )}
    </div>
  );
}