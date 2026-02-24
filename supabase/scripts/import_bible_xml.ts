/**
 * 성경 XML 파일을 파싱하여 bible_verses 테이블에 적재하는 스크립트
 * 
 * 사용법:
 * 1. XML 파일을 supabase/data/ 폴더에 배치
 * 2. npm install xml2js (필요시)
 * 3. .env 파일에 SUPABASE_URL과 SUPABASE_SERVICE_KEY 설정
 * 4. npx tsx supabase/scripts/import_bible_xml.ts <xml파일경로> <번역본코드>
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { parseString } from 'xml2js';
import * as fs from 'fs';
import * as path from 'path';

// .env 파일 로드
config();

interface BibleVerse {
    translation_code: string;
    book_no: number;
    chapter_no: number;
    verse_no: number;
    verse_text: string;
}

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ SUPABASE_URL과 SUPABASE_SERVICE_KEY 환경변수가 필요합니다.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// 성경 책 이름 → book_no 매핑
const bookNameToNo: { [key: string]: number } = {
    '창세기': 1, '출애굽기': 2, '레위기': 3, '민수기': 4, '신명기': 5,
    '여호수아': 6, '사사기': 7, '룻기': 8, '사무엘상': 9, '사무엘하': 10,
    '열왕기상': 11, '열왕기하': 12, '역대상': 13, '역대하': 14, '에스라': 15,
    '느헤미야': 16, '에스더': 17, '욥기': 18, '시편': 19, '잠언': 20,
    '전도서': 21, '아가': 22, '이사야': 23, '예레미야': 24, '예레미야애가': 25,
    '에스겔': 26, '다니엘': 27, '호세아': 28, '요엘': 29, '아모스': 30,
    '오바댜': 31, '요나': 32, '미가': 33, '나훔': 34, '하박국': 35,
    '스바냐': 36, '학개': 37, '스가랴': 38, '말라기': 39,
    '마태복음': 40, '마가복음': 41, '누가복음': 42, '요한복음': 43, '사도행전': 44,
    '로마서': 45, '고린도전서': 46, '고린도후서': 47, '갈라디아서': 48, '에베소서': 49,
    '빌립보서': 50, '골로새서': 51, '데살로니가전서': 52, '데살로니가후서': 53,
    '디모데전서': 54, '디모데후서': 55, '디도서': 56, '빌레몬서': 57, '히브리서': 58,
    '야고보서': 59, '베드로전서': 60, '베드로후서': 61, '요한일서': 62,
    '요한이서': 63, '요한삼서': 64, '유다서': 65, '요한계시록': 66,
};

/**
 * XML 파일 파싱 (구조에 따라 수정 필요)
 */
async function parseXML(xmlPath: string): Promise<any> {
    return new Promise((resolve, reject) => {
        const xmlContent = fs.readFileSync(xmlPath, 'utf-8');
        parseString(xmlContent, (err, result) => {
            if (err) reject(err);
            else resolve(result);
        });
    });
}

/**
 * XML 데이터를 BibleVerse 배열로 변환
 * 
 * 예상 XML 구조 1:
 * <bible>
 *   <book name="창세기" num="1">
 *     <chapter num="1">
 *       <verse num="1">태초에 하나님이...</verse>
 *     </chapter>
 *   </book>
 * </bible>
 * 
 * 예상 XML 구조 2:
 * <bible>
 *   <BIBLEBOOK bnumber="1" bname="창세기">
 *     <CHAPTER cnumber="1">
 *       <VERS vnumber="1">태초에 하나님이...</VERS>
 *     </CHAPTER>
 *   </BIBLEBOOK>
 * </bible>
 */
function extractVerses(xmlData: any, translationCode: string): BibleVerse[] {
    const verses: BibleVerse[] = [];

    try {
        // 구조: XMLBIBLE > BIBLEBOOK > CHAPTER > VERS
        if (xmlData.XMLBIBLE && xmlData.XMLBIBLE.BIBLEBOOK) {
            const books = Array.isArray(xmlData.XMLBIBLE.BIBLEBOOK) ? xmlData.XMLBIBLE.BIBLEBOOK : [xmlData.XMLBIBLE.BIBLEBOOK];

            for (const book of books) {
                const bookName = book.$.bname;
                const bookNo = book.$.bnumber || bookNameToNo[bookName];

                if (!bookNo) {
                    console.warn(`⚠️  책 번호를 찾을 수 없음: ${bookName} (book.$.bnumber: ${book.$.bnumber})`);
                    continue;
                }

                const chapters = Array.isArray(book.CHAPTER) ? book.CHAPTER : [book.CHAPTER];

                for (const chapter of chapters) {
                    const chapterNo = parseInt(chapter.$.cnumber);
                    const verseList = Array.isArray(chapter.VERS) ? chapter.VERS : [chapter.VERS];

                    for (const verse of verseList) {
                        const verseNo = parseInt(verse.$.vnumber);
                        const verseText = verse._ || verse;

                        verses.push({
                            translation_code: translationCode,
                            book_no: parseInt(bookNo.toString()),
                            chapter_no: chapterNo,
                            verse_no: verseNo,
                            verse_text: typeof verseText === 'string' ? verseText.trim() : String(verseText).trim(),
                        });
                    }
                }
            }
        }
        // 구조 1: bible > book > chapter > verse (대체 구조)
        else if (xmlData.bible && xmlData.bible.book) {
            const books = Array.isArray(xmlData.bible.book) ? xmlData.bible.book : [xmlData.bible.book];

            for (const book of books) {
                const bookName = book.$.name || book.$.bname;
                const bookNo = book.$.num || book.$.bnumber || bookNameToNo[bookName];

                if (!bookNo) {
                    console.warn(`⚠️  책 번호를 찾을 수 없음: ${bookName}`);
                    continue;
                }

                const chapters = Array.isArray(book.chapter) ? book.chapter : [book.chapter];

                for (const chapter of chapters) {
                    const chapterNo = parseInt(chapter.$.num || chapter.$.cnumber);
                    const verseList = Array.isArray(chapter.verse) ? chapter.verse : [chapter.verse];

                    for (const verse of verseList) {
                        const verseNo = parseInt(verse.$.num || verse.$.vnumber);
                        const verseText = typeof verse === 'string' ? verse : (verse._ || verse);

                        verses.push({
                            translation_code: translationCode,
                            book_no: parseInt(bookNo.toString()),
                            chapter_no: chapterNo,
                            verse_no: verseNo,
                            verse_text: verseText.trim(),
                        });
                    }
                }
            }
        }
    } catch (error) {
        console.error('❌ XML 파싱 중 오류:', error);
        throw error;
    }

    return verses;
}

/**
 * DB에 배치로 삽입 (1000개씩)
 */
async function insertVerses(verses: BibleVerse[], batchSize = 1000) {
    const total = verses.length;
    console.log(`📊 총 ${total}개 절을 삽입합니다...`);

    for (let i = 0; i < total; i += batchSize) {
        const batch = verses.slice(i, i + batchSize);
        const { error } = await supabase
            .from('bible_verses')
            .insert(batch);

        if (error) {
            console.error(`❌ 배치 ${i / batchSize + 1} 삽입 실패:`, error);
            throw error;
        }

        console.log(`✅ ${i + batch.length} / ${total} 완료`);
    }
}

/**
 * 메인 실행
 */
async function main() {
    const args = process.argv.slice(2);

    if (args.length < 2) {
        console.error('사용법: npx tsx import_bible_xml.ts <xml파일경로> <번역본코드>');
        console.error('예시: npx tsx import_bible_xml.ts supabase/data/krv.xml krv');
        process.exit(1);
    }

    const [xmlPath, translationCode] = args;

    if (!fs.existsSync(xmlPath)) {
        console.error(`❌ 파일을 찾을 수 없습니다: ${xmlPath}`);
        process.exit(1);
    }

    console.log(`📖 XML 파싱 시작: ${xmlPath}`);
    console.log(`🏷️  번역본 코드: ${translationCode}`);

    try {
        // XML 파싱
        const xmlData = await parseXML(xmlPath);
        console.log('✅ XML 파싱 완료');

        // 절 추출
        const verses = extractVerses(xmlData, translationCode);
        console.log(`✅ ${verses.length}개 절 추출 완료`);

        if (verses.length === 0) {
            console.error('❌ 추출된 절이 없습니다. XML 구조를 확인해주세요.');
            console.log('💡 XML 구조 샘플:');
            console.log(JSON.stringify(xmlData, null, 2).slice(0, 500));
            process.exit(1);
        }

        // DB 삽입
        await insertVerses(verses);

        console.log('✅ 모든 절 삽입 완료!');
    } catch (error) {
        console.error('❌ 오류 발생:', error);
        process.exit(1);
    }
}

main();
