/**
 * API 설정
 * 환경에 따라 서버 주소를 쉽게 변경할 수 있습니다.
 */

import { projectId } from '../utils/supabase/info';

// 환경별 설정
const ENV = import.meta.env.MODE || 'development';

// 함수 이름 설정
const FUNCTION_NAME = 'server'; // 배포된 Edge Function 이름

// API 기본 URL
export const API_CONFIG = {
    // Supabase Edge Function URL
    baseUrl: `https://${projectId}.supabase.co/functions/v1/${FUNCTION_NAME}`,

    // 개발/프로덕션 분리가 필요하면 아래와 같이 사용
    // baseUrl: ENV === 'production'
    //   ? `https://${projectId}.supabase.co/functions/v1/server`
    //   : 'http://localhost:54321/functions/v1/server',

    // 타임아웃 설정 (ms)
    timeout: 30000,

    // 환경 정보
    env: ENV,

    // 함수 이름
    functionName: FUNCTION_NAME,
} as const;

// API 엔드포인트 경로
export const API_ENDPOINTS = {
    // Health
    health: '/health',

    // User
    userProfile: '/user/profile',
    userProviders: '/user/providers',
    userProvidersLink: '/user/providers/link',
    userProvidersDisconnect: (provider: string) => `/user/providers/${provider}`,
    userProvidersDisconnectAll: '/user/providers/disconnect-all',
    userChurchMemberships: '/user/church-memberships',

    // Transcription
    transcription: '/transcription',

    // Stats
    dailyStats: '/daily-stats',
    completedVerses: '/completed-verses',

    // Churches
    churches: '/churches',

    // Bible
    bibleChapter: (book: string, chapter: number) => `/bible/book/${encodeURIComponent(book)}/chapter/${chapter}`,
    bibleVerse: (book: string, chapter: number, verse: number) => `/bible/book/${encodeURIComponent(book)}/chapter/${chapter}/verse/${verse}`,
    bibleSearch: '/bible/search',
} as const;
