import { ChevronLeft, CheckCircle2 } from 'lucide-react';

interface BibleReaderProps {
  book: string;
  chapter: number;
  onBack: () => void;
}

// Mock 성경 구절 데이터
const mockVerses: { [key: string]: string[] } = {
  'genesis-1': [
    '태초에 하나님이 천지를 창조하시니라',
    '땅이 혼돈하고 공허하며 흑암이 깊음 위에 있고 하나님의 영은 수면 위에 운행하시니라',
    '하나님이 이르시되 빛이 있으라 하시니 빛이 있었고',
    '빛이 하나님이 보시기에 좋았더라 하나님이 빛과 어둠을 나누사',
    '하나님이 빛을 낮이라 부르시고 어둠을 밤이라 부르시니라 저녁이 되고 아침이 되니 이는 첫째 날이니라',
    '하나님이 이르시되 물 가운데에 궁창이 있어 물과 물로 나뉘라 하시고',
    '하나님이 궁창을 만드사 궁창 아래의 물과 궁창 위의 물로 나뉘게 하시니 그대로 되니라',
    '하나님이 궁창을 하늘이라 부르시니라 저녁이 되고 아침이 되니 이는 둘째 날이니라',
    '하나님이 이르시되 천하의 물이 한 곳으로 모이고 뭍이 드러나라 하시니 그대로 되니라',
    '하나님이 뭍을 땅이라 부르시고 모인 물을 바다라 부르시니 하나님이 보시기에 좋았더라',
  ],
  'matthew-5': [
    '예수께서 무리를 보시고 산에 올라가 앉으시니 제자들이 나아온지라',
    '입을 열어 가르쳐 이르시되',
    '심령이 가난한 자는 복이 있나니 천국이 그들의 것임이요',
    '애통하는 자는 복이 있나니 그들이 위로를 받을 것임이요',
    '온유한 자는 복이 있나니 그들이 땅을 기업으로 받을 것임이요',
    '의에 주리고 목마른 자는 복이 있나니 그들이 배부를 것임이요',
    '긍휼히 여기는 자는 복이 있나니 그들이 긍휼히 여김을 받을 것임이요',
    '마음이 청결한 자는 복이 있나니 그들이 하나님을 볼 것임이요',
  ],
};

export default function BibleReader({ book, chapter, onBack }: BibleReaderProps) {
  const key = `${book}-${chapter}`;
  const verses = mockVerses[key] || ['구절 데이터를 불러오는 중...'];
  
  // Mock: 일부 절은 필사 완료된 것으로 표시
  const completedVerses = new Set([1, 2, 3]); // 1, 2, 3절은 완료

  const bookNames: { [key: string]: string } = {
    'genesis': '창세기',
    'matthew': '마태복음',
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
            <h1 className="text-[#1d1b20] text-lg font-semibold">
              {bookNames[book]} {chapter}장
            </h1>
            <p className="text-[#49454f] text-xs">
              {completedVerses.size}절 필사 완료
            </p>
          </div>
        </div>
      </div>

      {/* Verses */}
      <div className="px-4 pt-4 space-y-3">
        {verses.map((verse, index) => {
          const verseNum = index + 1;
          const isCompleted = completedVerses.has(verseNum);

          return (
            <div
              key={verseNum}
              className={`rounded-[12px] p-4 transition-all ${
                isCompleted
                  ? 'bg-[#e8def8] border-l-4 border-[#6750a4]'
                  : 'bg-white border border-[#e7e0ec]'
              }`}
            >
              <div className="flex gap-3">
                {/* Verse Number */}
                <div className="flex-shrink-0">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      isCompleted
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
                    className={`leading-relaxed ${
                      isCompleted ? 'text-[#1d1b20]' : 'text-[#1d1b20]'
                    }`}
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
        })}
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
