import { ChevronLeft } from 'lucide-react';

interface ChapterSelectProps {
  book: string;
  bookName: string;
  totalChapters: number;
  onBack: () => void;
  onSelectChapter: (chapter: number) => void;
}

export default function ChapterSelect({
  book,
  bookName,
  totalChapters,
  onBack,
  onSelectChapter,
}: ChapterSelectProps) {
  // Mock: 창세기 1장만 일부 완료
  const getChapterProgress = (chapter: number) => {
    if (book === 'genesis' && chapter === 1) {
      return { completed: 3, total: 31 }; // 31절 중 3절 완료
    }
    return { completed: 0, total: 0 };
  };

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
            <h1 className="text-[#1d1b20] text-lg font-semibold">{bookName}</h1>
            <p className="text-[#49454f] text-xs">장을 선택하세요</p>
          </div>
        </div>
      </div>

      {/* Chapter Grid */}
      <div className="px-4 pt-4">
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: totalChapters }, (_, i) => i + 1).map((chapter) => {
            const progress = getChapterProgress(chapter);
            const hasProgress = progress.completed > 0;
            const isComplete = progress.completed === progress.total && progress.total > 0;

            return (
              <button
                key={chapter}
                onClick={() => onSelectChapter(chapter)}
                className={`aspect-square rounded-[12px] flex flex-col items-center justify-center transition-all active:scale-95 ${
                  isComplete
                    ? 'bg-[#6750a4] text-white shadow-md'
                    : hasProgress
                    ? 'bg-[#e8def8] text-[#6750a4] border-2 border-[#6750a4]'
                    : 'bg-white text-[#1d1b20] border border-[#e7e0ec] hover:border-[#6750a4]'
                }`}
              >
                <span className="text-lg font-bold">{chapter}</span>
                {hasProgress && (
                  <span className="text-[10px] font-medium mt-0.5">
                    {progress.completed}/{progress.total}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="px-4 mt-6">
        <div className="bg-white rounded-[12px] p-4 border border-[#e7e0ec] space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-white border border-[#e7e0ec] rounded" />
            <span className="text-[#49454f] text-xs">필사 전</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-[#e8def8] border-2 border-[#6750a4] rounded" />
            <span className="text-[#49454f] text-xs">필사 진행 중</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-[#6750a4] rounded" />
            <span className="text-[#49454f] text-xs">필사 완료</span>
          </div>
        </div>
      </div>
    </div>
  );
}
