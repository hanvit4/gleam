-- ===================================
-- 새로운 DB 스키마: transcriptions_progress, daily_credits 기반
-- ===================================

-- 1. users 테이블 변경/생성 (기존 테이블이 있다면 마이그레이션)
-- 주의: 기존 테이블이 있으면 필요한 컬럼만 추가합니다
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  avatar_url TEXT,
  provider TEXT, -- 'email', 'google', 'kakao', 'apple', 'github' 등
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 기존 users 테이블이 있다면 필요한 컬럼만 추가
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS provider TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. transcriptions_progress 테이블 (사용자의 필사 진행 상황)
CREATE TABLE IF NOT EXISTS public.transcriptions_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  book TEXT NOT NULL, -- '창세기', '마태복음' 등
  chapter INT NOT NULL,
  verse INT NOT NULL, -- 마지막으로 작성한 절 번호
  progress_json JSONB DEFAULT '{"lastUpdated": null, "mode": "easy"}',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, book)
);

-- 3. daily_credits 테이블 (일일 크레딧 적립/소비)
CREATE TABLE IF NOT EXISTS public.daily_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  credits_earned INT DEFAULT 0,
  credits_spent INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- 4. user_providers 테이블 (소셜 계정 연동)
CREATE TABLE IF NOT EXISTS public.user_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- 'google', 'kakao', 'apple', 'github' 등
  provider_email TEXT,
  provider_name TEXT,
  linked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

-- ===================================
-- 인덱스 생성 (조회 성능 향상)
-- ===================================
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON public.users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_transcriptions_progress_user_id ON public.transcriptions_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_transcriptions_progress_book ON public.transcriptions_progress(book);
CREATE INDEX IF NOT EXISTS idx_daily_credits_user_id ON public.daily_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_credits_date ON public.daily_credits(date);
CREATE INDEX IF NOT EXISTS idx_user_providers_user_id ON public.user_providers(user_id);
CREATE INDEX IF NOT EXISTS idx_user_providers_provider ON public.user_providers(provider);

-- ===================================
-- Row Level Security (RLS) 정책
-- ===================================

-- users 테이블 RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
CREATE POLICY "Users can view their own profile" ON public.users
  FOR SELECT
  USING (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

-- transcriptions_progress 테이블 RLS
ALTER TABLE public.transcriptions_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own progress" ON public.transcriptions_progress;
CREATE POLICY "Users can view their own progress" ON public.transcriptions_progress
  FOR SELECT
  USING (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update their own progress" ON public.transcriptions_progress;
CREATE POLICY "Users can update their own progress" ON public.transcriptions_progress
  FOR UPDATE
  USING (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()))
  WITH CHECK (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own progress" ON public.transcriptions_progress;
CREATE POLICY "Users can insert their own progress" ON public.transcriptions_progress
  FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));

-- daily_credits 테이블 RLS
ALTER TABLE public.daily_credits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own credits" ON public.daily_credits;
CREATE POLICY "Users can view their own credits" ON public.daily_credits
  FOR SELECT
  USING (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update their own credits" ON public.daily_credits;
CREATE POLICY "Users can update their own credits" ON public.daily_credits
  FOR UPDATE
  USING (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()))
  WITH CHECK (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own credits" ON public.daily_credits;
CREATE POLICY "Users can insert their own credits" ON public.daily_credits
  FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));

-- user_providers 테이블 RLS
ALTER TABLE public.user_providers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own providers" ON public.user_providers;
CREATE POLICY "Users can view their own providers" ON public.user_providers
  FOR SELECT
  USING (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own providers" ON public.user_providers;
CREATE POLICY "Users can delete their own providers" ON public.user_providers
  FOR DELETE
  USING (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));

-- ===================================
-- 함수: 신규 사용자 자동 생성 (회원가입 시)
-- ===================================
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (auth_user_id, email, name, provider)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'full_name',
      split_part(COALESCE(NEW.email, ''), '@', 1),
      'User'
    ),
    COALESCE(NEW.raw_app_meta_data->>'provider', 'email')
  );
  RETURN NEW;
END;
$$;

-- Trigger: auth.users 생성 시 public.users 자동 생성
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ===================================
-- 함수: 일일 크레딧 추가 (RPC)
-- ===================================
DROP FUNCTION IF EXISTS public.increase_credits_for_user(UUID, INT);

CREATE FUNCTION public.increase_credits_for_user(
  p_user_id UUID,
  p_amount INT
)
RETURNS TABLE(credits_earned INT, total_credits INT)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  today DATE := CURRENT_DATE;
  daily_record RECORD;
  total INT;
BEGIN
  -- 1. 오늘 날짜의 크레딧 레코드 upsert
  INSERT INTO public.daily_credits (user_id, date, credits_earned, updated_at)
  VALUES (p_user_id, today, p_amount, NOW())
  ON CONFLICT (user_id, date) DO UPDATE
  SET credits_earned = daily_credits.credits_earned + p_amount,
      updated_at = NOW()
  RETURNING daily_credits INTO daily_record;

  -- 2. 현재 사용자의 총 크레딧 계산
  SELECT SUM(COALESCE(credits_earned, 0)) - SUM(COALESCE(credits_spent, 0))
  INTO total
  FROM public.daily_credits
  WHERE user_id = p_user_id;

  RETURN QUERY SELECT daily_record.credits_earned, COALESCE(total, 0);
END;
$$;

-- ===================================
-- 권한 설정
-- ===================================
-- 서비스 역할이 모든 테이블 접근 가능하도록 설정
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
