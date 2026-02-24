import { ArrowLeft, Zap, GraduationCap } from 'lucide-react';
import * as api from '../utils/api';

interface ModeSelectProps {
  onBack: () => void;
  onSelectEasy: () => void;
  onSelectExpert: () => void;
  translation: api.BibleTranslation;
  onChangeTranslation: (translation: api.BibleTranslation) => void;
}

export default function ModeSelect({ onBack, onSelectEasy, onSelectExpert, translation, onChangeTranslation }: ModeSelectProps) {
  const translationLabels: Record<api.BibleTranslation, string> = {
    nkrv: '개역개정',
    krv: '개역한글',
    kor: '새번역',
  };

  const translationOptions: { value: api.BibleTranslation; label: string }[] = [
    { value: 'nkrv', label: '개역개정' },
    { value: 'krv', label: '개역한글' },
    { value: 'kor', label: '새번역' },
  ];
  return (
    <div className="px-4 pt-12 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <button
            onClick={onBack}
            className="p-2 -ml-2 hover:bg-[#f5f5f5] rounded-full transition-colors active:bg-[#e8e8e8]"
          >
            <ArrowLeft className="w-6 h-6 text-[#1d1b20]" />
          </button>
          <h1 className="text-[#1d1b20] text-2xl ml-2">필사 모드 선택</h1>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-[#49454f] whitespace-nowrap" htmlFor="mode-translation">
            번역본
          </label>
          <select
            id="mode-translation"
            className="rounded-full border border-[#e7e0ec] bg-white px-3 py-2 text-sm text-[#1d1b20] shadow-sm"
            value={translation}
            onChange={(event) => onChangeTranslation(event.target.value as api.BibleTranslation)}
          >
            {translationOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Easy Mode Card */}
      <button
        onClick={onSelectEasy}
        className="w-full bg-white rounded-[16px] p-6 shadow-sm mb-4 transition-all active:scale-98 hover:shadow-md text-left"
      >
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 bg-[#e8def8] rounded-[16px] flex items-center justify-center flex-shrink-0">
            <Zap className="w-7 h-7 text-[#6750a4]" />
          </div>
          <div className="flex-1">
            <h2 className="text-[#1d1b20] text-xl font-semibold mb-2">이지 모드</h2>
            <p className="text-[#49454f] text-sm leading-relaxed mb-3">
              주제별로 엄선된 성경 구절을 필사합니다
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-[#e8def8] text-[#6750a4] text-xs font-medium rounded-full">
                주제별 구절
              </span>
              <span className="px-3 py-1 bg-[#e8def8] text-[#6750a4] text-xs font-medium rounded-full">
                1절당 10C
              </span>
              <span className="px-3 py-1 bg-[#e8def8] text-[#6750a4] text-xs font-medium rounded-full">
                일일 제한 없음
              </span>
            </div>
          </div>
        </div>
      </button>

      {/* Expert Mode Card */}
      <button
        onClick={onSelectExpert}
        className="w-full bg-white rounded-[16px] p-6 shadow-sm transition-all active:scale-98 hover:shadow-md text-left"
      >
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 bg-[#fef7ff] border-2 border-[#6750a4] rounded-[16px] flex items-center justify-center flex-shrink-0">
            <GraduationCap className="w-7 h-7 text-[#6750a4]" />
          </div>
          <div className="flex-1">
            <h2 className="text-[#1d1b20] text-xl font-semibold mb-2">전문가 모드</h2>
            <p className="text-[#49454f] text-sm leading-relaxed mb-3">
              창세기부터 순서대로 성경 전체를 필사합니다
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-[#fef7ff] border border-[#6750a4] text-[#6750a4] text-xs font-medium rounded-full">
                창세기 1장부터
              </span>
              <span className="px-3 py-1 bg-[#fef7ff] border border-[#6750a4] text-[#6750a4] text-xs font-medium rounded-full">
                1절당 10C
              </span>
              <span className="px-3 py-1 bg-[#fef7ff] border border-[#6750a4] text-[#6750a4] text-xs font-medium rounded-full">
                하루 최대 300C
              </span>
            </div>
          </div>
        </div>
      </button>

      {/* Info */}
      <div className="mt-6 p-4 bg-[#e8def8] rounded-[12px]">
        <p className="text-[#1d1b20] text-sm text-center">
          💡 <span className="font-medium">Tip:</span> 처음 시작하시는 분은 이지 모드를 추천합니다!
        </p>
      </div>
    </div>
  );
}
