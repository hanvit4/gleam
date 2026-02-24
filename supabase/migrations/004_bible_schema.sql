-- ===================================
-- Bible domain schema
-- - bible_translations: 번역본 마스터
-- - bible_books: 성경 책 마스터(66권)
-- - bible_verses: 번역본별 장/절 본문
-- - user_bible_preferences: 사용자 번역본 기본값
-- ===================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- updated_at 트리거 함수 (없으면 생성/있으면 갱신)
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

-- 번역본 마스터
CREATE TABLE IF NOT EXISTS public.bible_translations (
  code TEXT PRIMARY KEY,                           -- ex) nkrv, krv, kor
  name TEXT NOT NULL,                              -- ex) 개역개정
  language_code TEXT NOT NULL DEFAULT 'ko',
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  license_info JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_bible_translations_code_format CHECK (code ~ '^[a-z0-9_\-]{2,20}$')
);

DROP TRIGGER IF EXISTS trg_touch_bible_translations_updated_at ON public.bible_translations;
CREATE TRIGGER trg_touch_bible_translations_updated_at
  BEFORE UPDATE ON public.bible_translations
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

-- 성경 책 마스터 (공통 메타)
CREATE TABLE IF NOT EXISTS public.bible_books (
  book_no SMALLINT PRIMARY KEY,                    -- 1..66
  testament TEXT NOT NULL,                         -- old | new
  osis_id TEXT NOT NULL UNIQUE,                    -- ex) Gen, Matt
  key_en TEXT NOT NULL UNIQUE,                     -- ex) genesis, matthew
  name_ko TEXT NOT NULL,
  name_en TEXT,
  chapter_count SMALLINT NOT NULL,
  sort_order SMALLINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_bible_books_no CHECK (book_no BETWEEN 1 AND 66),
  CONSTRAINT chk_bible_books_testament CHECK (testament IN ('old', 'new')),
  CONSTRAINT chk_bible_books_chapter_count CHECK (chapter_count > 0)
);

DROP TRIGGER IF EXISTS trg_touch_bible_books_updated_at ON public.bible_books;
CREATE TRIGGER trg_touch_bible_books_updated_at
  BEFORE UPDATE ON public.bible_books
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

-- 번역본별 본문
CREATE TABLE IF NOT EXISTS public.bible_verses (
  id BIGSERIAL PRIMARY KEY,
  translation_code TEXT NOT NULL REFERENCES public.bible_translations(code) ON DELETE CASCADE,
  book_no SMALLINT NOT NULL REFERENCES public.bible_books(book_no) ON DELETE RESTRICT,
  chapter_no SMALLINT NOT NULL,
  verse_no SMALLINT NOT NULL,
  verse_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_bible_verse UNIQUE (translation_code, book_no, chapter_no, verse_no),
  CONSTRAINT chk_bible_verses_chapter_no CHECK (chapter_no > 0),
  CONSTRAINT chk_bible_verses_verse_no CHECK (verse_no > 0),
  CONSTRAINT chk_bible_verses_text_non_empty CHECK (length(trim(verse_text)) > 0)
);

DROP TRIGGER IF EXISTS trg_touch_bible_verses_updated_at ON public.bible_verses;
CREATE TRIGGER trg_touch_bible_verses_updated_at
  BEFORE UPDATE ON public.bible_verses
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

-- 조회/검색 인덱스
CREATE INDEX IF NOT EXISTS idx_bible_translations_active_sort
  ON public.bible_translations(is_active, sort_order, code);

CREATE INDEX IF NOT EXISTS idx_bible_books_testament_sort
  ON public.bible_books(testament, sort_order);

CREATE INDEX IF NOT EXISTS idx_bible_verses_lookup
  ON public.bible_verses(translation_code, book_no, chapter_no, verse_no);

CREATE INDEX IF NOT EXISTS idx_bible_verses_chapter
  ON public.bible_verses(translation_code, book_no, chapter_no);

-- 텍스트 검색(한국어는 단순 검색 + trigram)
CREATE INDEX IF NOT EXISTS idx_bible_verses_text_trgm
  ON public.bible_verses USING GIN (verse_text gin_trgm_ops);

-- 사용자 번역본 기본 설정
CREATE TABLE IF NOT EXISTS public.user_bible_preferences (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  translation_code TEXT NOT NULL REFERENCES public.bible_translations(code) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_touch_user_bible_preferences_updated_at ON public.user_bible_preferences;
CREATE TRIGGER trg_touch_user_bible_preferences_updated_at
  BEFORE UPDATE ON public.user_bible_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

-- RLS
ALTER TABLE public.bible_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bible_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bible_verses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_bible_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read active bible translations" ON public.bible_translations;
CREATE POLICY "Authenticated users can read active bible translations"
  ON public.bible_translations
  FOR SELECT
  TO authenticated
  USING (is_active = TRUE);

DROP POLICY IF EXISTS "Authenticated users can read bible books" ON public.bible_books;
CREATE POLICY "Authenticated users can read bible books"
  ON public.bible_books
  FOR SELECT
  TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "Authenticated users can read active bible verses" ON public.bible_verses;
CREATE POLICY "Authenticated users can read active bible verses"
  ON public.bible_verses
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.bible_translations t
      WHERE t.code = bible_verses.translation_code
        AND t.is_active = TRUE
    )
  );

DROP POLICY IF EXISTS "Users can read own bible preference" ON public.user_bible_preferences;
CREATE POLICY "Users can read own bible preference"
  ON public.user_bible_preferences
  FOR SELECT
  TO authenticated
  USING (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert own bible preference" ON public.user_bible_preferences;
CREATE POLICY "Users can insert own bible preference"
  ON public.user_bible_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update own bible preference" ON public.user_bible_preferences;
CREATE POLICY "Users can update own bible preference"
  ON public.user_bible_preferences
  FOR UPDATE
  TO authenticated
  USING (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()))
  WITH CHECK (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete own bible preference" ON public.user_bible_preferences;
CREATE POLICY "Users can delete own bible preference"
  ON public.user_bible_preferences
  FOR DELETE
  TO authenticated
  USING (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));

-- 번역본 시드
INSERT INTO public.bible_translations (code, name, language_code, description, sort_order, is_active)
VALUES
  ('nkrv', '개역개정', 'ko', '대한성서공회 개역개정판', 1, TRUE),
  ('krv', '개역한글', 'ko', '전통 개역한글판', 2, TRUE),
  ('kor', '새번역', 'ko', '대한성서공회 새번역', 3, TRUE)
ON CONFLICT (code) DO UPDATE
SET
  name = EXCLUDED.name,
  language_code = EXCLUDED.language_code,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- 책 메타 시드 (66권)
INSERT INTO public.bible_books (book_no, testament, osis_id, key_en, name_ko, name_en, chapter_count, sort_order)
VALUES
  (1,'old','Gen','genesis','창세기','Genesis',50,1),
  (2,'old','Exod','exodus','출애굽기','Exodus',40,2),
  (3,'old','Lev','leviticus','레위기','Leviticus',27,3),
  (4,'old','Num','numbers','민수기','Numbers',36,4),
  (5,'old','Deut','deuteronomy','신명기','Deuteronomy',34,5),
  (6,'old','Josh','joshua','여호수아','Joshua',24,6),
  (7,'old','Judg','judges','사사기','Judges',21,7),
  (8,'old','Ruth','ruth','룻기','Ruth',4,8),
  (9,'old','1Sam','1samuel','사무엘상','1 Samuel',31,9),
  (10,'old','2Sam','2samuel','사무엘하','2 Samuel',24,10),
  (11,'old','1Kgs','1kings','열왕기상','1 Kings',22,11),
  (12,'old','2Kgs','2kings','열왕기하','2 Kings',25,12),
  (13,'old','1Chr','1chronicles','역대상','1 Chronicles',29,13),
  (14,'old','2Chr','2chronicles','역대하','2 Chronicles',36,14),
  (15,'old','Ezra','ezra','에스라','Ezra',10,15),
  (16,'old','Neh','nehemiah','느헤미야','Nehemiah',13,16),
  (17,'old','Esth','esther','에스더','Esther',10,17),
  (18,'old','Job','job','욥기','Job',42,18),
  (19,'old','Ps','psalms','시편','Psalms',150,19),
  (20,'old','Prov','proverbs','잠언','Proverbs',31,20),
  (21,'old','Eccl','ecclesiastes','전도서','Ecclesiastes',12,21),
  (22,'old','Song','songofsongs','아가','Song of Songs',8,22),
  (23,'old','Isa','isaiah','이사야','Isaiah',66,23),
  (24,'old','Jer','jeremiah','예레미야','Jeremiah',52,24),
  (25,'old','Lam','lamentations','예레미야애가','Lamentations',5,25),
  (26,'old','Ezek','ezekiel','에스겔','Ezekiel',48,26),
  (27,'old','Dan','daniel','다니엘','Daniel',12,27),
  (28,'old','Hos','hosea','호세아','Hosea',14,28),
  (29,'old','Joel','joel','요엘','Joel',3,29),
  (30,'old','Amos','amos','아모스','Amos',9,30),
  (31,'old','Obad','obadiah','오바댜','Obadiah',1,31),
  (32,'old','Jonah','jonah','요나','Jonah',4,32),
  (33,'old','Mic','micah','미가','Micah',7,33),
  (34,'old','Nah','nahum','나훔','Nahum',3,34),
  (35,'old','Hab','habakkuk','하박국','Habakkuk',3,35),
  (36,'old','Zeph','zephaniah','스바냐','Zephaniah',3,36),
  (37,'old','Hag','haggai','학개','Haggai',2,37),
  (38,'old','Zech','zechariah','스가랴','Zechariah',14,38),
  (39,'old','Mal','malachi','말라기','Malachi',4,39),
  (40,'new','Matt','matthew','마태복음','Matthew',28,40),
  (41,'new','Mark','mark','마가복음','Mark',16,41),
  (42,'new','Luke','luke','누가복음','Luke',24,42),
  (43,'new','John','john','요한복음','John',21,43),
  (44,'new','Acts','acts','사도행전','Acts',28,44),
  (45,'new','Rom','romans','로마서','Romans',16,45),
  (46,'new','1Cor','1corinthians','고린도전서','1 Corinthians',16,46),
  (47,'new','2Cor','2corinthians','고린도후서','2 Corinthians',13,47),
  (48,'new','Gal','galatians','갈라디아서','Galatians',6,48),
  (49,'new','Eph','ephesians','에베소서','Ephesians',6,49),
  (50,'new','Phil','philippians','빌립보서','Philippians',4,50),
  (51,'new','Col','colossians','골로새서','Colossians',4,51),
  (52,'new','1Thess','1thessalonians','데살로니가전서','1 Thessalonians',5,52),
  (53,'new','2Thess','2thessalonians','데살로니가후서','2 Thessalonians',3,53),
  (54,'new','1Tim','1timothy','디모데전서','1 Timothy',6,54),
  (55,'new','2Tim','2timothy','디모데후서','2 Timothy',4,55),
  (56,'new','Titus','titus','디도서','Titus',3,56),
  (57,'new','Phlm','philemon','빌레몬서','Philemon',1,57),
  (58,'new','Heb','hebrews','히브리서','Hebrews',13,58),
  (59,'new','Jas','james','야고보서','James',5,59),
  (60,'new','1Pet','1peter','베드로전서','1 Peter',5,60),
  (61,'new','2Pet','2peter','베드로후서','2 Peter',3,61),
  (62,'new','1John','1john','요한일서','1 John',5,62),
  (63,'new','2John','2john','요한이서','2 John',1,63),
  (64,'new','3John','3john','요한삼서','3 John',1,64),
  (65,'new','Jude','jude','유다서','Jude',1,65),
  (66,'new','Rev','revelation','요한계시록','Revelation',22,66)
ON CONFLICT (book_no) DO UPDATE
SET
  testament = EXCLUDED.testament,
  osis_id = EXCLUDED.osis_id,
  key_en = EXCLUDED.key_en,
  name_ko = EXCLUDED.name_ko,
  name_en = EXCLUDED.name_en,
  chapter_count = EXCLUDED.chapter_count,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();
