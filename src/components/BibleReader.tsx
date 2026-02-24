
import { ChevronLeft, CheckCircle2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import * as api from '../utils/api';

interface BibleReaderProps {
  book: string;
  chapter: number;
  translation: api.BibleTranslation;
  onBack: () => void;
}

export default function BibleReader({ book, chapter, translation, onBack }: BibleReaderProps) {
  const [verses, setVerses] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completedVerses, setCompletedVerses] = useState<Set<number>>(new Set());
  const [isLoadingCompleted, setIsLoadingCompleted] = useState(true);

  const translationLabels: Record<api.BibleTranslation, string> = {
    nkrv: '개역개정',
    krv: '개역한글',
    kor: '새번역',
  };

  useEffect(() => {
    setLoading(true);
    setError(null);
    api.getBibleChapter(book, chapter, translation)
      .then((res) => {
        if (res && res.verses) {
          // verses: { 1: '...', 2: '...' }
          const arr: string[] = [];
          const keys = Object.keys(res.verses).map(Number).sort((a, b) => a - b);
          for (const k of keys) {
            arr.push(res.verses[k] || '');
          }
          setVerses(arr);
        } else {
          setVerses(['구절 데이터를 찾을 수 없습니다.']);
        }
      })
      .catch(() => {
        setError('구절 데이터를 불러오지 못했습니다.');
      })
      .finally(() => setLoading(false));
  }, [book, chapter, translation]);

  useEffect(() => {
    let isActive = true;

    const loadCompletedVerses = async () => {
      try {
        const result = await api.getCompletedVerses();
        const completedMap = result?.completedVerses || {};
        const prefix = `${book}-${chapter}-`;
        const completedSet = new Set<number>();

        Object.keys(completedMap).forEach((key) => {
          if (key.startsWith(prefix)) {
            const verseStr = key.slice(prefix.length);
            const verseNum = Number(verseStr);
            if (!Number.isNaN(verseNum)) {
              completedSet.add(verseNum);
            }
          }
        });

        if (isActive) {
          setCompletedVerses(completedSet);
        }
      } catch {
        if (isActive) {
          setCompletedVerses(new Set());
        }
      } finally {
        if (isActive) {
          setIsLoadingCompleted(false);
        }
      }
    };

    loadCompletedVerses();

    return () => {
      isActive = false;
    };
  }, [book, chapter]);

  return (
    <div className="min-h-screen bg-[#fef7ff] pb-6">
      {/* Header */}
      <div className="sticky top-0 bg-[#fef7ff] z-10 border-b border-[#e7e0ec]">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-[#e8def8] rounded-full transition-colors active:bg-[#d0bcff]"
          >
            <ChevronLeft className="w-6 h-6 text-[#1d1b20]" />
          </button>
          <div className="flex-1">
            <h1 className="text-[#1d1b20] text-lg font-semibold">
              {book} {chapter}장
            </h1>
            <p className="text-[#49454f] text-xs">
              {translationLabels[translation]} · {completedVerses.size}절 필사 완료
            </p>
          </div>
        </div>
      </div>

      {/* Verses */}
      <div className="px-4 pt-4 space-y-3">
        {loading || isLoadingCompleted ? (
          <div className="flex flex-col items-center justify-center min-h-[200px]">
            <div className="w-8 h-8 border-4 border-[#6750a4] border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-[#49454f] text-sm">구절 데이터를 불러오는 중...</p>
          </div>
        ) : error ? (
          <div className="text-center text-[#ba1a1a]">{error}</div>
        ) : (
          verses.map((verse, index) => {
            const verseNum = index + 1;
            const isCompleted = completedVerses.has(verseNum);
            return (
              <div
                key={verseNum}
                className={`rounded-[12px] p-4 transition-all ${isCompleted
                  ? 'bg-[#e8def8] border-l-4 border-[#6750a4]'
                  : 'bg-white border border-[#e7e0ec]'
                  }`}
              >
                <div className="flex gap-3">
                  {/* Verse Number */}
                  <div className="flex-shrink-0">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${isCompleted
                        ? 'bg-[#6750a4] text-white'
                        : 'bg-[#e7e0ec] text-[#49454f]'
                        }`}
                    >
                      {verseNum}
                    </div>
                  </div>

                  {/* Verse Text */}
                  <div className="flex-1">
                    <p
                      className={`leading-relaxed text-[#1d1b20]`}
                    >
                      {verse}
                    </p>
                    {isCompleted && (
                      <div className="flex items-center gap-1 mt-2 text-[#6750a4]">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="text-xs font-medium">필사 완료</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Info */}
      <div className="px-4 mt-6">
        <div className="bg-white rounded-[12px] p-4 border border-[#e7e0ec]">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-[#e8def8] rounded-full flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-4 h-4 text-[#6750a4]" />
            </div>
            <div className="flex-1">
              <h3 className="text-[#1d1b20] font-semibold text-sm mb-1">
                필사 완료 표시
              </h3>
              <p className="text-[#49454f] text-xs leading-relaxed">
                보라색 배경은 전문가 모드에서 이미 필사한 구절입니다.
                성경을 읽으면서 진행 상황을 확인하세요.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
