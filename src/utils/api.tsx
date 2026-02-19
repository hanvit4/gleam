// Bible APIs (dummy data for now)
export async function getBibleChapter(book: string, chapter: number) {
  return apiCall(`/bible/book/${encodeURIComponent(book)}/chapter/${chapter}`);
}

export async function getBibleVerse(book: string, chapter: number, verse: number) {
  return apiCall(`/bible/book/${encodeURIComponent(book)}/chapter/${chapter}/verse/${verse}`);
}

export async function searchBible(query: string) {
  return apiCall(`/bible/search?q=${encodeURIComponent(query)}`);
}
import { supabase } from './supabase/client';
import { projectId } from './supabase/info';

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-3ed9c009`;

// Get access token (with refresh if needed)
async function getAccessToken(): Promise<string | null> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      console.error('Session error:', error);
      return null;
    }

    if (!session) {
      console.error('No session available');
      return null;
    }

    console.log('Token retrieved:', session.access_token?.substring(0, 20) + '...');
    return session.access_token;
  } catch (error) {
    console.error('Failed to get access token:', error);
    return null;
  }
}


// Generic API call wrapper
async function apiCall(endpoint: string, options: RequestInit = {}) {
  const token = await getAccessToken();

  if (!token) {
    console.error('No token available for endpoint:', endpoint);
    throw new Error('No authentication token available');
  }

  console.log('API Call:', endpoint, 'with token:', token.substring(0, 20) + '...');

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    console.error(`API Error (${endpoint}):`, error, 'Status:', response.status);
    throw new Error(error.error || `API call failed: ${response.status}`);
  }

  return response.json();
}


// User Profile APIs
export async function getUserProfile() {
  return apiCall('/user/profile');
}

export async function updateUserProfile(data: {
  name?: string;
  avatarUrl?: string;
}) {
  return apiCall('/user/profile', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// Transcription APIs
export async function saveTranscription(data: {
  mode: 'easy' | 'expert';
  verse: string;
  credits: number;
  book: string;
  chapter: number;
  verseNum: number;
  date?: string; // 선택적 - 클라이언트 로컬 날짜
}) {
  return apiCall('/transcription', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// Daily Stats APIs
export async function getDailyStats(date?: string) {
  const query = date ? `?date=${date}` : '';
  return apiCall(`/daily-stats${query}`);
}

export async function getMonthlyStats(month: string) {
  return apiCall(`/daily-stats?month=${month}`);
}

// Completed Verses API
export async function getCompletedVerses() {
  return apiCall('/completed-verses');
}
// ===================================
// Social Login Provider APIs
// ===================================

// GET /user/providers - 사용자의 연동된 소셜 계정 조회
export async function getUserProviders() {
  return apiCall('/user/providers');
}

export interface ProviderLinkData {
  provider: string; // 'google', 'kakao', 'apple', 'github' 등
  provider_name?: string;
  provider_email?: string;
}

// POST /user/providers/link - 소셜 계정 연동
export async function linkProvider(data: ProviderLinkData) {
  return apiCall('/user/providers/link', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// DELETE /user/providers/:provider - 소셜 계정 연동 해제
export async function unlinkProvider(provider: string) {
  return apiCall(`/user/providers/${provider}`, {
    method: 'DELETE',
  });
}

// POST /user/providers/disconnect-all - 모든 소셜 계정 연동 해제
export async function disconnectAllProviders() {
  return apiCall('/user/providers/disconnect-all', {
    method: 'POST',
  });
}

// ===================================
// User Initialization (after login)
// ===================================

/**
 * Ensure user profile exists in the users table
 * Called after successful authentication
 * This creates or updates the user record with auth info
 */
export async function ensureUserProfileExists(session: any) {
  if (!session || !session.user) {
    console.error('No session provided to ensureUserProfileExists');
    return;
  }

  try {
    const authUser = session.user;
    const provider = authUser.identities?.[0]?.provider || 'email';
    const name = authUser.user_metadata?.name ||
      authUser.user_metadata?.full_name ||
      authUser.email?.split('@')[0] ||
      'User';

    // Upsert user profile into users table
    const { data, error } = await supabase
      .from('users')
      .upsert(
        {
          auth_user_id: authUser.id,
          email: authUser.email,
          name: name,
          provider: provider,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'auth_user_id', // Update if auth_user_id exists
        }
      )
      .select();

    if (error) {
      console.error('Error ensuring user profile exists:', error);
      return;
    }

    console.log('User profile ensured:', data);
    return data?.[0];
  } catch (err) {
    console.error('Exception in ensureUserProfileExists:', err);
  }
}