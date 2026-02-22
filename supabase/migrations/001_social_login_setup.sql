-- ===================================
-- 소셜로그인 연동을 위한 DB 마이그레이션
-- ===================================
-- 실행: Supabase SQL Editor에 복사 후 실행

-- 1. users 테이블 (기본 사용자 정보)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  nickname TEXT,
  church TEXT,
  credits INT DEFAULT 0,
  bio TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. user_providers 테이블 (소셜 계정 연동 정보)
CREATE TABLE IF NOT EXISTS public.user_providers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- 'google', 'kakao', 'apple', 'github' 등
  provider_user_id TEXT NOT NULL, -- provider에서 받은 고유 ID
  provider_email TEXT, -- provider의 이메일
  provider_name TEXT, -- provider의 사용자 이름
  provider_metadata JSONB, -- provider 추가 정보
  linked_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  UNIQUE(provider, provider_user_id),
  UNIQUE(user_id, provider)
);

-- 3. completed_verses 테이블 (필사 완료 구절)
CREATE TABLE IF NOT EXISTS public.completed_verses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  book TEXT NOT NULL, -- '창세기', '마태복음' 등
  chapter INT NOT NULL,
  verse INT NOT NULL,
  mode TEXT NOT NULL, -- 'easy', 'expert'
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, book, chapter, verse, mode)
);

-- 4. transcriptions 테이블 (필사 기록)
CREATE TABLE IF NOT EXISTS public.transcriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  book TEXT NOT NULL,
  chapter INT NOT NULL,
  verse INT NOT NULL,
  mode TEXT NOT NULL,
  user_text TEXT NOT NULL,
  original_text TEXT,
  accuracy FLOAT, -- 0.0 ~ 1.0
  credits_earned INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. daily_stats 테이블 (일일 통계)
CREATE TABLE IF NOT EXISTS public.daily_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  stat_date DATE NOT NULL,
  verses_completed INT DEFAULT 0,
  total_credits_earned INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, stat_date)
);

-- ===================================
-- 인덱스 생성 (조회 성능 향상)
-- ===================================
CREATE INDEX IF NOT EXISTS idx_user_providers_user_id ON public.user_providers(user_id);
CREATE INDEX IF NOT EXISTS idx_user_providers_provider ON public.user_providers(provider);
CREATE INDEX IF NOT EXISTS idx_completed_verses_user_id ON public.completed_verses(user_id);
CREATE INDEX IF NOT EXISTS idx_completed_verses_book_chapter ON public.completed_verses(book, chapter);
CREATE INDEX IF NOT EXISTS idx_transcriptions_user_id ON public.transcriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_stats_user_id_date ON public.daily_stats(user_id, stat_date);

-- ===================================
-- Row Level Security (RLS) 정책
-- ===================================

-- users 테이블 RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON public.users
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- user_providers 테이블 RLS
ALTER TABLE public.user_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own providers" ON public.user_providers
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own providers" ON public.user_providers
  FOR DELETE
  USING (user_id = auth.uid());

-- completed_verses 테이블 RLS
ALTER TABLE public.completed_verses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own verses" ON public.completed_verses
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own verses" ON public.completed_verses
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- transcriptions 테이블 RLS
ALTER TABLE public.transcriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own transcriptions" ON public.transcriptions
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own transcriptions" ON public.transcriptions
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- daily_stats 테이블 RLS
ALTER TABLE public.daily_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own stats" ON public.daily_stats
  FOR SELECT
  USING (user_id = auth.uid());

-- ===================================
-- 함수: 신규 사용자 자동 생성 (회원가입 시)
-- ===================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, nickname)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'full_name',
      split_part(COALESCE(NEW.email, ''), '@', 1),
      'User'
    )
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
-- 함수: 소셜 계정 자동 연동 처리
-- ===================================
CREATE OR REPLACE FUNCTION public.handle_social_login(
  user_id UUID,
  provider_name TEXT,
  provider_id TEXT,
  provider_email TEXT,
  provider_full_name TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  -- 1. 기존 provider 연동 확인
  IF EXISTS (
    SELECT 1 FROM public.user_providers
    WHERE user_id = user_id AND provider = provider_name
  ) THEN
    -- 기존 연동 업데이트
    UPDATE public.user_providers
    SET
      last_used_at = NOW(),
      provider_metadata = jsonb_build_object('synced_at', NOW())
    WHERE user_id = user_id AND provider = provider_name;

    result := jsonb_build_object(
      'status', 'linked',
      'message', 'Already linked'
    );
  ELSE
    -- 새로운 provider 연동
    INSERT INTO public.user_providers (
      user_id,
      provider,
      provider_user_id,
      provider_email,
      provider_name,
      provider_metadata
    )
    VALUES (
      user_id,
      provider_name,
      provider_id,
      provider_email,
      provider_full_name,
      jsonb_build_object('synced_at', NOW())
    );

    result := jsonb_build_object(
      'status', 'new_link',
      'message', 'New provider linked'
    );
  END IF;

  RETURN result;
END;
$$;

-- ===================================
-- 주석 및 설명
-- ===================================
/*
사용 방법:

1. Supabase SQL Editor에서 위의 전체 SQL을 복사하여 실행합니다.

2. 소셜로그인 후 provider 정보 저장 (API에서 호출):
   SELECT public.handle_social_login(
     user_id,
     'google',  -- provider name
     'google_user_id',
     'user@example.com',
     'User Name'
   );

3. 사용자의 연동된 계정 조회:
   SELECT provider, provider_email, linked_at
   FROM public.user_providers
   WHERE user_id = auth.uid();

4. 계정 연동 해제:
   DELETE FROM public.user_providers
   WHERE user_id = auth.uid() AND provider = 'google';

5. KV 스토어에서 RDB로 마이그레이션 (필요 시):
   -- 기존 profile 데이터를 users 테이블로 마이그레이션하는 스크립트는
   -- 별도로 서버에서 처리하도록 함수 작성 예정
*/
