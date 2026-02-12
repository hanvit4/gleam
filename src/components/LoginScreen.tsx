import { MessageCircle } from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import { useState } from 'react';

interface LoginScreenProps {
  onLogin: () => void;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleKakaoLogin = async () => {
    try {
      setIsLoading('kakao');
      console.log('카카오 로그인 시도');
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'kakao',
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) {
        console.error('카카오 로그인 에러:', error);
        alert(`로그인 실패: ${error.message}`);
        setIsLoading(null);
        return;
      }

      console.log('카카오 로그인 성공:', data);
    } catch (err) {
      console.error('카카오 로그인 예외:', err);
      alert('로그인 중 오류가 발생했습니다.');
      setIsLoading(null);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setIsLoading('google');
      console.log('구글 로그인 시도');
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) {
        console.error('구글 로그인 에러:', error);
        alert(`로그인 실패: ${error.message}`);
        setIsLoading(null);
        return;
      }

      console.log('구글 로그인 성공:', data);
    } catch (err) {
      console.error('구글 로그인 예외:', err);
      alert('로그인 중 오류가 발생했습니다.');
      setIsLoading(null);
    }
  };

  const handleAppleLogin = async () => {
    try {
      setIsLoading('apple');
      console.log('애플 로그인 시도');
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) {
        console.error('애플 로그인 에러:', error);
        alert(`로그인 실패: ${error.message}`);
        setIsLoading(null);
        return;
      }

      console.log('애플 로그인 성공:', data);
    } catch (err) {
      console.error('애플 로그인 예외:', err);
      alert('로그인 중 오류가 발생했습니다.');
      setIsLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#fef7ff] flex flex-col">
      {/* Container for Galaxy S24 */}
      <div className="max-w-[360px] mx-auto w-full flex-1 flex flex-col">
        {/* Logo and Welcome Section */}
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          {/* App Icon */}
          <div className="w-24 h-24 bg-gradient-to-br from-[#6750a4] to-[#7f67be] rounded-[24px] shadow-lg flex items-center justify-center mb-6">
            <svg className="w-14 h-14 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
          </div>

          {/* App Name */}
          <h1 className="text-[#1d1b20] text-3xl font-bold mb-2">성경 필사</h1>
          <p className="text-[#49454f] text-base text-center mb-8">
            성경 구절을 필사하며<br />
            크레딧을 획득하세요
          </p>

          {/* Features */}
          <div className="w-full space-y-3 mb-8">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-[#e8def8] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-[#6750a4]" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="text-[#1d1b20] font-medium text-sm">이지 모드</p>
                <p className="text-[#49454f] text-xs">주제별 구절 필사, 일일 제한 없음</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-[#e8def8] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-[#6750a4]" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="text-[#1d1b20] font-medium text-sm">전문가 모드</p>
                <p className="text-[#49454f] text-xs">창세기부터 순서대로, 하루 최대 300 크레딧</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-[#e8def8] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-[#6750a4]" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="text-[#1d1b20] font-medium text-sm">크레딧 리워드</p>
                <p className="text-[#49454f] text-xs">1절당 10 크레딧 획득</p>
              </div>
            </div>
          </div>
        </div>

        {/* Login Buttons */}
        <div className="px-6 pb-10 space-y-3">
          {/* Kakao Login */}
          <button
            onClick={handleKakaoLogin}
            disabled={isLoading !== null}
            className="w-full py-4 bg-[#FEE500] rounded-full font-medium text-sm text-[#000000] shadow-sm hover:shadow-md transition-all active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading === 'kakao' ? (
              <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <MessageCircle className="w-5 h-5" fill="currentColor" />
                카카오로 시작하기
              </>
            )}
          </button>

          {/* Google Login */}
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading !== null}
            className="w-full py-4 bg-white rounded-full font-medium text-sm text-[#1d1b20] shadow-sm hover:shadow-md transition-all active:scale-98 flex items-center justify-center gap-2 border border-[#e7e0ec] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading === 'google' ? (
              <div className="w-5 h-5 border-2 border-[#6750a4] border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Google로 시작하기
              </>
            )}
          </button>

          {/* Apple Login */}
          <button
            onClick={handleAppleLogin}
            disabled={isLoading !== null}
            className="w-full py-4 bg-[#000000] rounded-full font-medium text-sm text-white shadow-sm hover:shadow-md transition-all active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading === 'apple' ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                </svg>
                Apple로 시작하기
              </>
            )}
          </button>

          {/* Privacy Notice */}
          <p className="text-center text-[#79747e] text-xs pt-2">
            로그인하면 <span className="text-[#6750a4]">이용약관</span> 및 <span className="text-[#6750a4]">개인정보처리방침</span>에<br />
            동의하는 것으로 간주됩니다
          </p>
        </div>
      </div>
    </div>
  );
}