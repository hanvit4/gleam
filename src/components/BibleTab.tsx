import { useState } from 'react';
import { Book, ChevronRight, CheckCircle2 } from 'lucide-react';
import ChapterSelect from './ChapterSelect';
import BibleReader from './BibleReader';
import { BibleTranslation } from '../utils/api';

interface BibleBook {
  id: string;
  name: string;
  chapters: number;
  testament: 'old' | 'new';
}

const bibleBooks: BibleBook[] = [
  // 구약
  { id: 'genesis', name: '창세기', chapters: 50, testament: 'old' },
  { id: 'exodus', name: '출애굽기', chapters: 40, testament: 'old' },
  { id: 'leviticus', name: '레위기', chapters: 27, testament: 'old' },
  { id: 'numbers', name: '민수기', chapters: 36, testament: 'old' },
  { id: 'deuteronomy', name: '신명기', chapters: 34, testament: 'old' },
  { id: 'joshua', name: '여호수아', chapters: 24, testament: 'old' },
  { id: 'judges', name: '사사기', chapters: 21, testament: 'old' },
  { id: 'ruth', name: '룻기', chapters: 4, testament: 'old' },
  { id: '1samuel', name: '사무엘상', chapters: 31, testament: 'old' },
  { id: '2samuel', name: '사무엘하', chapters: 24, testament: 'old' },
  { id: 'psalms', name: '시편', chapters: 150, testament: 'old' },
  { id: 'proverbs', name: '잠언', chapters: 31, testament: 'old' },
  // 신약
  { id: 'matthew', name: '마태복음', chapters: 28, testament: 'new' },
  { id: 'mark', name: '마가복음', chapters: 16, testament: 'new' },
  { id: 'luke', name: '누가복음', chapters: 24, testament: 'new' },
  { id: 'john', name: '요한복음', chapters: 21, testament: 'new' },
  { id: 'acts', name: '사도행전', chapters: 28, testament: 'new' },
  { id: 'romans', name: '로마서', chapters: 16, testament: 'new' },
  { id: '1corinthians', name: '고린도전서', chapters: 16, testament: 'new' },
  { id: '2corinthians', name: '고린도후서', chapters: 13, testament: 'new' },
  { id: 'galatians', name: '갈라디아서', chapters: 6, testament: 'new' },
  { id: 'ephesians', name: '에베소서', chapters: 6, testament: 'new' },
  { id: 'philippians', name: '빌립보서', chapters: 4, testament: 'new' },
  { id: 'revelation', name: '요한계시록', chapters: 22, testament: 'new' },
];

interface BibleTabProps {
  translation: BibleTranslation;
  onChangeTranslation: (translation: BibleTranslation) => void;
}

export default function BibleTab({ translation, onChangeTranslation }: BibleTabProps) {
  const [activeTestament, setActiveTestament] = useState<'old' | 'new'>('old');
  const [view, setView] = useState<'list' | 'chapters' | 'reader'>('list');
  const [selectedBook, setSelectedBook] = useState<BibleBook | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number>(1);

  // Mock progress - 전문가 모드에서 창세기 1장까지 완료했다고 가정
  const completedChapters = new Set(['genesis-1']);

  const filteredBooks = bibleBooks.filter(book => book.testament === activeTestament);

  const translationLabels: Record<BibleTranslation, string> = {
    nkrv: '개역개정',
    krv: '개역한글',
    kor: '새번역',
  };

  const translationOptions: { value: BibleTranslation; label: string }[] = [
    { value: 'nkrv', label: '개역개정' },
    { value: 'krv', label: '개역한글' },
    { value: 'kor', label: '새번역' },
  ];

  // Handle book selection
  const handleSelectBook = (book: BibleBook) => {
    setSelectedBook(book);
    setView('chapters');
  };

  // Handle chapter selection
  const handleSelectChapter = (chapter: number) => {
    setSelectedChapter(chapter);
    setView('reader');
  };

  // Render chapter select view
  if (view === 'chapters' && selectedBook) {
    return (
      <ChapterSelect
        book={selectedBook.id}
        bookName={selectedBook.name}
        totalChapters={selectedBook.chapters}
        onBack={() => setView('list')}
        onSelectChapter={handleSelectChapter}
      />
    );
  }

  // Render reader view
  if (view === 'reader' && selectedBook) {
    return (
      <BibleReader
        book={selectedBook.name}
        chapter={selectedChapter}
        translation={translation}
        onBack={() => setView('chapters')}
      />
    );
  }

  // Render book list view
  return (
    <div className="px-4 pt-12 pb-4">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[#1d1b20] text-2xl font-bold mb-2">성경</h1>
          <p className="text-[#49454f] text-sm">{translationLabels[translation]} 성경을 읽어보세요</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-[#49454f]" htmlFor="bible-translation">
            번역본
          </label>
          <select
            id="bible-translation"
            className="rounded-full border border-[#e7e0ec] bg-white px-3 py-2 text-sm text-[#1d1b20] shadow-sm"
            value={translation}
            onChange={(event) => onChangeTranslation(event.target.value as BibleTranslation)}
          >
            {translationOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Testament Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTestament('old')}
          className={`flex-1 py-3 rounded-full font-medium text-sm transition-all ${activeTestament === 'old'
            ? 'bg-[#6750a4] text-white shadow-md'
            : 'bg-white text-[#49454f] border border-[#e7e0ec]'
            }`}
        >
          구약성경
        </button>
        <button
          onClick={() => setActiveTestament('new')}
          className={`flex-1 py-3 rounded-full font-medium text-sm transition-all ${activeTestament === 'new'
            ? 'bg-[#6750a4] text-white shadow-md'
            : 'bg-white text-[#49454f] border border-[#e7e0ec]'
            }`}
        >
          신약성경
        </button>
      </div>

      {/* Progress Card */}
      <div className="bg-[#e8def8] rounded-[16px] p-4 shadow-sm mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-[#6750a4] rounded-full flex items-center justify-center">
            <Book className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-[#1d1b20] font-semibold text-base mb-1">
              전문가 모드 진행 상황
            </h3>
            <p className="text-[#49454f] text-sm">
              창세기 1장 진행 중
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-[#6750a4]" />
        </div>
      </div>

      {/* Books List */}
      <div className="space-y-2">
        {filteredBooks.map((book) => {
          const isInProgress = book.id === 'genesis'; // Mock: 창세기 진행 중
          const completedCount = book.id === 'genesis' ? 1 : 0;

          return (
            <button
              key={book.id}
              onClick={() => handleSelectBook(book)}
              className="w-full bg-white rounded-[16px] p-4 shadow-sm transition-all active:scale-98 hover:shadow-md text-left"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-[#1d1b20] font-medium text-base">
                      {book.name}
                    </h3>
                    {isInProgress && (
                      <span className="px-2 py-0.5 bg-[#e8def8] text-[#6750a4] text-xs font-medium rounded-full">
                        진행 중
                      </span>
                    )}
                  </div>
                  <p className="text-[#49454f] text-sm">
                    총 {book.chapters}장
                    {completedCount > 0 && (
                      <span className="text-[#6750a4] ml-2">
                        · {completedCount}장 완료
                      </span>
                    )}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-[#49454f]" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Info */}
      <div className="mt-4 p-4 bg-white rounded-[12px] border border-[#e7e0ec]">
        <p className="text-[#49454f] text-xs text-center">
          💡 전문가 모드로 필사한 장은 <span className="text-[#6750a4] font-medium">완료 표시</span>가 됩니다
        </p>
      </div>
    </div>
  );
}