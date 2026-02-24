# 성경 데이터 적재 가이드

## 1. 준비 단계

### 1.1 XML 파일 배치
개역한글(krv) XML 파일을 이 폴더에 배치해주세요.
예: `supabase/data/krv.xml`

### 1.2 필요한 패키지 설치
```bash
npm install
```

### 1.3 환경변수 설정
`.env` 파일에 Supabase 정보 추가:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
```

## 2. 마이그레이션 적용

먼저 DB 테이블을 생성해야 합니다.

### Supabase CLI 사용 (권장)
```bash
supabase db push
```

### 또는 Supabase Dashboard 사용
1. https://supabase.com/dashboard 로그인
2. 프로젝트 선택 → SQL Editor
3. `supabase/migrations/004_bible_schema.sql` 내용 복사
4. 실행

## 3. 데이터 적재

### 개역한글 버전 적재
```bash
npx tsx supabase/scripts/import_bible_xml.ts supabase/data/krv.xml krv
```

### 다른 번역본 적재
- 개역개정(nkrv): `npx tsx supabase/scripts/import_bible_xml.ts supabase/data/nkrv.xml nkrv`
- 새번역(kor): `npx tsx supabase/scripts/import_bible_xml.ts supabase/data/kor.xml kor`

## 4. XML 파일 구조

스크립트는 다음 두 가지 구조를 지원합니다:

### 구조 1
```xml
<bible>
  <book name="창세기" num="1">
    <chapter num="1">
      <verse num="1">태초에 하나님이 천지를 창조하시니라</verse>
    </chapter>
  </book>
</bible>
```

### 구조 2
```xml
<bible>
  <BIBLEBOOK bnumber="1" bname="창세기">
    <CHAPTER cnumber="1">
      <VERS vnumber="1">태초에 하나님이 천지를 창조하시니라</VERS>
    </CHAPTER>
  </BIBLEBOOK>
</bible>
```

다른 구조라면 `supabase/scripts/import_bible_xml.ts`의 `extractVerses` 함수를 수정해주세요.

## 5. 검증

적재 후 확인:
```sql
-- 총 절 수 확인
SELECT translation_code, COUNT(*) as verse_count 
FROM bible_verses 
GROUP BY translation_code;

-- 샘플 데이터 확인
SELECT * FROM bible_verses 
WHERE translation_code = 'krv' 
  AND book_no = 1 
  AND chapter_no = 1 
LIMIT 10;
```

## 6. 문제 해결

### XML 구조가 다른 경우
스크립트 실행 시 XML 샘플이 출력됩니다. 이를 참고하여 `import_bible_xml.ts` 수정.

### DB 연결 오류
- Supabase 프로젝트 URL 확인
- Service Role Key 확인 (anon key가 아님)
- RLS 정책 확인

### 중복 데이터
테이블에 UNIQUE 제약조건이 있어 중복 삽입 시 오류 발생합니다.
기존 데이터 삭제:
```sql
DELETE FROM bible_verses WHERE translation_code = 'krv';
```
