import { useState, useEffect } from 'react';
import { Coins, Calendar, CheckCircle2, BookOpen, ChevronLeft, ChevronRight, Home, Book, User } from 'lucide-react';
import BibleTab from './components/BibleTab';
import ProfileTab from './components/ProfileTab';
import ModeSelect from './components/ModeSelect';
import EasyTopics from './components/EasyTopics';
import EasyTyping from './components/EasyTyping';
import ExpertTyping from './components/ExpertTyping';
import LoginScreen from './components/LoginScreen';
import { supabase } from './utils/supabase/client';
import * as api from './utils/api';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [credits, setCredits] = useState(0);
  const [todayEarned, setTodayEarned] = useState(0);
  const DAILY_LIMIT = 300;
  const [activeTab, setActiveTab] = useState('home');
  const [currentScreen, setCurrentScreen] = useState<'home' | 'modeSelect' | 'easyTopics' | 'easyTyping' | 'expertTyping'>('home');
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  
  // Mock data for calendar - 날짜별 획득량 (0-300)
  const [earnedByDate, setEarnedByDate] = useState<{ [key: string]: number }>({});

  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 0)); // January 2026

  // Load user data from API
  const loadUserData = async () => {
    try {
      console.log('Loading user data...');
      
      // Load profile
      const profileRes = await api.getUserProfile();
      console.log('Profile loaded:', profileRes.profile);
      setCredits(profileRes.profile.credits || 0);
      
      // Load today's stats
      const todayRes = await api.getDailyStats();
      console.log('Today stats loaded:', todayRes.stats);
      setTodayEarned(todayRes.stats?.earned || 0);
      
      // Load current month stats
      const monthStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
      const monthRes = await api.getMonthlyStats(monthStr);
      console.log('Month stats loaded:', monthRes.stats);
      
      // Convert month stats to earnedByDate format
      const monthData: { [key: string]: number } = {};
      if (monthRes.stats && Array.isArray(monthRes.stats)) {
        monthRes.stats.forEach((stat: any) => {
          monthData[stat.date] = stat.earned || 0;
        });
      }
      setEarnedByDate(monthData);
      
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  // Check session on mount and listen for auth changes
  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session);
      setUser(session?.user ?? null);
      setIsLoading(false);
      
      if (session) {
        console.log('로그인된 사용자:', session.user);
        loadUserData();
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
      setUser(session?.user ?? null);
      
      if (session) {
        console.log('인증 상태 변경:', session.user);
        loadUserData();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Reload month data when month changes
  useEffect(() => {
    if (isLoggedIn) {
      const monthStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
      api.getMonthlyStats(monthStr).then((monthRes) => {
        const monthData: { [key: string]: number } = {};
        if (monthRes.stats && Array.isArray(monthRes.stats)) {
          monthRes.stats.forEach((stat: any) => {
            monthData[stat.date] = stat.earned || 0;
          });
        }
        setEarnedByDate(monthData);
      }).catch(error => {
        console.error('Error loading month stats:', error);
      });
    }
  }, [currentMonth, isLoggedIn]);

  // Show loading while checking session
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#fef7ff] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#6750a4] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Show login screen if not logged in
  if (!isLoggedIn) {
    return <LoginScreen onLogin={() => setIsLoggedIn(true)} />;
  }

  // Calculate percentage for circular progress
  const getPercentage = (earned: number) => {
    return Math.round((earned / DAILY_LIMIT) * 100);
  };

  // Get days in month
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek };
  };

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentMonth);

  const handleTypingComplete = () => {
    setCurrentScreen('modeSelect');
  };

  const handleEasyComplete = async (earnedCredits: number) => {
    // Reload user data from server
    await loadUserData();
    setCurrentScreen('home');
    setActiveTab('home');
  };

  const handleExpertComplete = async (earnedCredits: number) => {
    // Reload user data from server
    await loadUserData();
    setCurrentScreen('home');
    setActiveTab('home');
  };

  // Render different content based on active tab
  const renderContent = () => {
    // Handle typing screens (override tabs)
    if (currentScreen === 'modeSelect') {
      return (
        <ModeSelect
          onBack={() => setCurrentScreen('home')}
          onSelectEasy={() => setCurrentScreen('easyTopics')}
          onSelectExpert={() => setCurrentScreen('expertTyping')}
        />
      );
    }

    if (currentScreen === 'easyTopics') {
      return (
        <EasyTopics
          onBack={() => setCurrentScreen('modeSelect')}
          onSelectTopic={(topicId) => {
            setSelectedTopic(topicId);
            setCurrentScreen('easyTyping');
          }}
        />
      );
    }

    if (currentScreen === 'easyTyping') {
      return (
        <EasyTyping
          topicId={selectedTopic}
          onBack={() => setCurrentScreen('easyTopics')}
          onComplete={handleEasyComplete}
        />
      );
    }

    if (currentScreen === 'expertTyping') {
      return (
        <ExpertTyping
          onBack={() => setCurrentScreen('modeSelect')}
          onComplete={handleExpertComplete}
          todayEarned={todayEarned}
          dailyLimit={DAILY_LIMIT}
        />
      );
    }

    // Tab-based content
    if (activeTab === 'bible') {
      return <BibleTab />;
    }
    if (activeTab === 'profile') {
      return <ProfileTab credits={credits} todayEarned={todayEarned} />;
    }
    
    // Home tab content
    return (
      <>
        {/* Header */}
        <div className="px-4 pt-12 pb-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-[#49454f] text-sm">안녕하세요!</p>
              <h1 className="text-[#1d1b20] text-2xl mt-1">사용자님</h1>
            </div>
            <div className="w-10 h-10 bg-[#6750a4] rounded-full flex items-center justify-center">
              <span className="text-white font-medium">U</span>
            </div>
          </div>

          {/* Credit Balance Card */}
          <div className="bg-[#e8def8] rounded-[16px] p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Coins className="w-5 h-5 text-[#6750a4]" />
              <span className="text-[#49454f] text-sm font-medium">내 크레딧</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-[#1d1b20] text-5xl font-bold">{credits.toLocaleString()}</span>
              <span className="text-[#49454f] text-xl">C</span>
            </div>
            <div className="flex items-center justify-between mt-3">
              <span className="text-[#49454f] text-sm">오늘의 획득량</span>
              <span className="text-[#1d1b20] font-semibold text-base">
                {todayEarned} / {DAILY_LIMIT} C
              </span>
            </div>
            {/* Progress Bar */}
            <div className="mt-3 h-1 bg-[#d0bcff] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#6750a4] transition-all duration-300"
                style={{ width: `${(todayEarned / DAILY_LIMIT) * 100}%` }}
              />
            </div>
          </div>

          {/* Typing Section */}
          <div className="bg-white rounded-[16px] p-4 shadow-sm mt-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[#e8def8] rounded-[12px] flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-[#6750a4]" />
              </div>
              <div>
                <h2 className="text-[#1d1b20] font-medium text-base">성경 필사</h2>
                <p className="text-[#49454f] text-sm">1절당 10 크레딧 획득</p>
              </div>
            </div>

            {/* Typing Button */}
            <button
              onClick={handleTypingComplete}
              disabled={todayEarned >= DAILY_LIMIT}
              className={`w-full py-3 rounded-full font-medium text-sm transition-all active:scale-98 ${
                todayEarned >= DAILY_LIMIT
                  ? 'bg-[#e7e0ec] text-[#79747e] cursor-not-allowed'
                  : 'bg-[#6750a4] text-white shadow-md hover:shadow-lg'
              }`}
            >
              {todayEarned >= DAILY_LIMIT ? (
                <span className="flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  오늘의 한도 달성!
                </span>
              ) : (
                <span>필사 시작하기</span>
              )}
            </button>

            {/* Info Text */}
            <p className="mt-3 text-center text-[#49454f] text-xs">
              하루 최대 {DAILY_LIMIT / 10}절 (30절) 필사 가능
            </p>
          </div>

          {/* Calendar */}
          <div className="mt-4 bg-white rounded-[16px] p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                className="p-2 hover:bg-[#f5f5f5] rounded-full transition-colors active:bg-[#e8e8e8]"
              >
                <ChevronLeft className="w-5 h-5 text-[#49454f]" />
              </button>
              <h2 className="text-[#1d1b20] font-medium text-base">
                {currentMonth.getFullYear()}년 {currentMonth.getMonth() + 1}월
              </h2>
              <button
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                className="p-2 hover:bg-[#f5f5f5] rounded-full transition-colors active:bg-[#e8e8e8]"
              >
                <ChevronRight className="w-5 h-5 text-[#49454f]" />
              </button>
            </div>

            {/* Weekday Headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['일', '월', '화', '수', '목', '금', '토'].map((day, idx) => (
                <div key={day} className={`text-center text-xs font-medium ${idx === 0 ? 'text-[#ba1a1a]' : 'text-[#49454f]'}`}>
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-1">
              {/* Empty cells for days before month starts */}
              {Array.from({ length: startingDayOfWeek }).map((_, index) => (
                <div key={`empty-${index}`} />
              ))}

              {/* Actual days */}
              {Array.from({ length: daysInMonth }).map((_, index) => {
                const day = index + 1;
                const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const earned = earnedByDate[dateStr] || 0;
                const percentage = getPercentage(earned);
                const isToday = dateStr === '2026-01-31';

                return (
                  <div key={day} className="aspect-square flex items-center justify-center relative">
                    {/* Circular Progress */}
                    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 36 36">
                      <circle
                        cx="18"
                        cy="18"
                        r="16"
                        fill="none"
                        stroke="#e8e8e8"
                        strokeWidth="2.5"
                      />
                      {earned > 0 && (
                        <circle
                          cx="18"
                          cy="18"
                          r="16"
                          fill="none"
                          stroke={percentage === 100 ? '#4caf50' : '#6750a4'}
                          strokeWidth="2.5"
                          strokeDasharray={`${percentage} ${100 - percentage}`}
                          strokeLinecap="round"
                          transform="rotate(-90 18 18)"
                        />
                      )}
                    </svg>
                    {/* Day Number */}
                    <span
                      className={`relative z-10 text-xs font-medium ${
                        isToday
                          ? 'text-[#6750a4] font-bold'
                          : earned > 0
                          ? 'text-[#1d1b20]'
                          : 'text-[#79747e]'
                      }`}
                    >
                      {day}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-3 pt-3 border-t border-[#e7e0ec] flex items-center justify-center gap-4 text-xs text-[#49454f]">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-[#6750a4]" />
                <span>진행 중</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-[#4caf50]" />
                <span>100% 달성</span>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-[#fef7ff]">
      {/* Container for Galaxy S24 */}
      <div className="max-w-[360px] mx-auto pb-20">
        {renderContent()}

        {/* Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-[#fffbfe] border-t border-[#e7e0ec]">
          <div className="max-w-[360px] mx-auto">
            <nav className="grid grid-cols-3 h-20 px-2">
              <button
                onClick={() => setActiveTab('home')}
                className={`flex flex-col items-center justify-center gap-1 transition-colors rounded-[16px] ${
                  activeTab === 'home' ? 'bg-[#e8def8]' : ''
                }`}
              >
                <div className={`p-1 rounded-[16px] ${activeTab === 'home' ? 'bg-[#6750a4]' : ''}`}>
                  <Home className={`w-6 h-6 ${activeTab === 'home' ? 'text-white' : 'text-[#49454f]'}`} />
                </div>
                <span className={`text-xs font-medium ${activeTab === 'home' ? 'text-[#1d1b20]' : 'text-[#49454f]'}`}>
                  홈
                </span>
              </button>
              
              <button
                onClick={() => setActiveTab('bible')}
                className={`flex flex-col items-center justify-center gap-1 transition-colors rounded-[16px] ${
                  activeTab === 'bible' ? 'bg-[#e8def8]' : ''
                }`}
              >
                <div className={`p-1 rounded-[16px] ${activeTab === 'bible' ? 'bg-[#6750a4]' : ''}`}>
                  <Book className={`w-6 h-6 ${activeTab === 'bible' ? 'text-white' : 'text-[#49454f]'}`} />
                </div>
                <span className={`text-xs font-medium ${activeTab === 'bible' ? 'text-[#1d1b20]' : 'text-[#49454f]'}`}>
                  성경
                </span>
              </button>
              
              <button
                onClick={() => setActiveTab('profile')}
                className={`flex flex-col items-center justify-center gap-1 transition-colors rounded-[16px] ${
                  activeTab === 'profile' ? 'bg-[#e8def8]' : ''
                }`}
              >
                <div className={`p-1 rounded-[16px] ${activeTab === 'profile' ? 'bg-[#6750a4]' : ''}`}>
                  <User className={`w-6 h-6 ${activeTab === 'profile' ? 'text-white' : 'text-[#49454f]'}`} />
                </div>
                <span className={`text-xs font-medium ${activeTab === 'profile' ? 'text-[#1d1b20]' : 'text-[#49454f]'}`}>
                  내 정보
                </span>
              </button>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
}