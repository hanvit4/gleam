import { ArrowLeft, Heart, Smile, Sun, Shield, Sparkles, Gift, TreePine, Star } from 'lucide-react';

interface Topic {
  id: string;
  title: string;
  description: string;
  icon: any;
  verseCount: number;
  color: string;
  bgColor: string;
}

interface EasyTopicsProps {
  onBack: () => void;
  onSelectTopic: (topicId: string) => void;
}

export default function EasyTopics({ onBack, onSelectTopic }: EasyTopicsProps) {
  const topics: Topic[] = [
    {
      id: 'love',
      title: '사랑',
      description: '하나님의 사랑과 이웃 사랑에 관한 구절',
      icon: Heart,
      verseCount: 12,
      color: '#d32f2f',
      bgColor: '#ffebee',
    },
    {
      id: 'joy',
      title: '기쁨',
      description: '주님 안에서 누리는 기쁨',
      icon: Smile,
      verseCount: 10,
      color: '#f57c00',
      bgColor: '#fff3e0',
    },
    {
      id: 'peace',
      title: '평안',
      description: '마음의 평안과 안식',
      icon: Sun,
      verseCount: 15,
      color: '#388e3c',
      bgColor: '#e8f5e9',
    },
    {
      id: 'protection',
      title: '보호',
      description: '하나님의 보호하심',
      icon: Shield,
      verseCount: 11,
      color: '#1976d2',
      bgColor: '#e3f2fd',
    },
    {
      id: 'hope',
      title: '소망',
      description: '미래에 대한 희망과 소망',
      icon: Star,
      verseCount: 13,
      color: '#7b1fa2',
      bgColor: '#f3e5f5',
    },
    {
      id: 'grace',
      title: '은혜',
      description: '하나님의 풍성한 은혜',
      icon: Sparkles,
      verseCount: 14,
      color: '#c2185b',
      bgColor: '#fce4ec',
    },
    {
      id: 'gratitude',
      title: '감사',
      description: '감사와 찬양의 구절',
      icon: Gift,
      verseCount: 10,
      color: '#0097a7',
      bgColor: '#e0f7fa',
    },
    {
      id: 'wisdom',
      title: '지혜',
      description: '지혜와 명철에 관한 말씀',
      icon: TreePine,
      verseCount: 16,
      color: '#5d4037',
      bgColor: '#efebe9',
    },
  ];

  return (
    <div className="px-4 pt-12 pb-4">
      {/* Header */}
      <div className="flex items-center mb-6">
        <button
          onClick={onBack}
          className="p-2 -ml-2 hover:bg-[#f5f5f5] rounded-full transition-colors active:bg-[#e8e8e8]"
        >
          <ArrowLeft className="w-6 h-6 text-[#1d1b20]" />
        </button>
        <h1 className="text-[#1d1b20] text-2xl ml-2">주제 선택</h1>
      </div>

      <p className="text-[#49454f] text-sm mb-4">
        필사하고 싶은 주제를 선택해주세요
      </p>

      {/* Topics Grid */}
      <div className="grid grid-cols-2 gap-3">
        {topics.map((topic) => {
          const Icon = topic.icon;
          return (
            <button
              key={topic.id}
              onClick={() => onSelectTopic(topic.id)}
              className="bg-white rounded-[16px] p-4 shadow-sm transition-all active:scale-98 hover:shadow-md text-left"
            >
              <div
                className="w-12 h-12 rounded-[12px] flex items-center justify-center mb-3"
                style={{ backgroundColor: topic.bgColor }}
              >
                <Icon className="w-6 h-6" style={{ color: topic.color }} />
              </div>
              <h3 className="text-[#1d1b20] font-semibold text-base mb-1">
                {topic.title}
              </h3>
              <p className="text-[#49454f] text-xs leading-relaxed mb-2">
                {topic.description}
              </p>
              <span className="text-[#6750a4] text-xs font-medium">
                {topic.verseCount}개 구절
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
