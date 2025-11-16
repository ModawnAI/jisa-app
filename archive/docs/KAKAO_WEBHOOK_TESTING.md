# KakaoTalk 웹훅 통합 테스트 가이드

**프로젝트**: JISA App
**대상**: KakaoTalk 챗봇 웹훅 통합
**버전**: 1.0
**작성일**: 2025-11-13

---

## 📋 목차

1. [개요](#개요)
2. [사전 준비](#사전-준비)
3. [로컬 테스트 (ngrok)](#로컬-테스트-ngrok)
4. [프로덕션 테스트](#프로덕션-테스트)
5. [테스트 시나리오](#테스트-시나리오)
6. [트러블슈팅](#트러블슈팅)

---

## 개요

### 웹훅 플로우

```
KakaoTalk User
    ↓ 메시지 전송
KakaoTalk i Open Builder
    ↓ POST /api/kakao/chat
JISA App (Vercel)
    ↓ Commission Detection
┌─────────────────┬──────────────────┐
│  Commission     │    RAG           │
│  System         │    System        │
└─────────────────┴──────────────────┘
    ↓ Response
KakaoTalk User
    ↓ 답변 수신
```

### API 엔드포인트

**Production**: `https://jisa-app.vercel.app/api/kakao/chat`
**Local (ngrok)**: `https://your-id.ngrok.io/api/kakao/chat`

---

## 사전 준비

### 1. 필수 환경 변수 확인

```bash
# .env.local 파일 확인
cat .env.local | grep -E "GEMINI_API_KEY|OPENAI_API_KEY|PINECONE_API_KEY|PINECONE_INDEX|SUPABASE"
```

필수 환경 변수:
- ✅ `GEMINI_API_KEY` - Gemini API 키
- ✅ `OPENAI_API_KEY` - OpenAI API 키 (임베딩)
- ✅ `PINECONE_API_KEY` - Pinecone API 키
- ✅ `PINECONE_INDEX` - Pinecone 인덱스 이름
- ✅ `NEXT_PUBLIC_SUPABASE_URL` - Supabase URL
- ✅ `SUPABASE_SERVICE_ROLE_KEY` - Service Role Key (로깅용)

### 2. Pinecone 데이터 확인

```bash
# Pinecone Console에서 확인:
# https://app.pinecone.io/
```

- ✅ Index: `hof-branch-chatbot` 존재
- ✅ Namespace: `hof-knowledge-base-max` 존재
- ✅ Vector count: > 0 (데이터 업로드됨)

### 3. Commission System 데이터 확인

```bash
# Commission JSON 파일 존재 확인
ls lib/commission-system/data/*.json
```

필수 파일:
- ✅ `commission_data_*.json` - 수수료 데이터
- ✅ 기타 JSON 데이터 파일들

---

## 로컬 테스트 (ngrok)

### Step 1: 개발 서버 실행

```bash
# 프로젝트 루트에서
pnpm dev

# 서버 실행 확인
curl http://localhost:3000/api/kakao/chat
# Expected: { "status": "ok", "service": "kakao-chat" }
```

### Step 2: ngrok 설치 및 실행

```bash
# ngrok 설치 (Mac)
brew install ngrok

# 또는 직접 다운로드
# https://ngrok.com/download

# ngrok 실행
ngrok http 3000

# 출력 예시:
# Forwarding: https://abc123def.ngrok.io -> http://localhost:3000
```

**ngrok URL 복사**: `https://abc123def.ngrok.io`

### Step 3: KakaoTalk 스킬 설정

1. **KakaoTalk i Open Builder** 접속
   - URL: https://i.kakao.com/

2. **챗봇 선택**
   - 좌측 메뉴: 챗봇 목록 → 해당 챗봇 선택

3. **스킬 설정**
   - 좌측 메뉴: 스킬 → 새 스킬 만들기 (또는 기존 스킬 수정)
   - 스킬 이름: `JISA RAG Test`
   - 스킬 URL: `https://abc123def.ngrok.io/api/kakao/chat`
   - 메서드: `POST`
   - 저장

4. **연결 테스트**
   - "연결 테스트" 버튼 클릭
   - 응답 확인: `{ "status": "ok", "service": "kakao-chat" }`

### Step 4: 테스트 메시지 전송

KakaoTalk 앱에서 챗봇과 대화:

```
테스트 1 - Commission Query:
"한화생명 변액연금 10년납 수수료는?"

테스트 2 - RAG Query:
"종신보험이란?"

테스트 3 - Complex Query:
"변액연금과 변액보험의 차이점을 자세히 설명해주세요"
```

### Step 5: 로그 확인

**터미널 로그:**
```bash
# 개발 서버 터미널에서 실시간 로그 확인
# [KakaoTalk] User: ...
# [Commission Detection] ...
# [RAG System] ...
```

**ngrok 인터페이스:**
```
http://127.0.0.1:4040
```
- 모든 HTTP 요청/응답 확인 가능
- 디버깅에 유용

**Supabase 로그:**
```sql
-- Supabase SQL Editor에서 실행
SELECT * FROM query_logs
ORDER BY timestamp DESC
LIMIT 10;
```

---

## 프로덕션 테스트

### Step 1: 프로덕션 배포 확인

```bash
# 배포 상태 확인
vercel ls

# 프로덕션 URL 확인
# https://jisa-app.vercel.app
```

### Step 2: API Health Check

```bash
# Health check
curl https://jisa-app.vercel.app/api/kakao/chat

# Expected: { "status": "ok", "service": "kakao-chat" }
```

### Step 3: KakaoTalk 스킬 URL 업데이트

1. **KakaoTalk i Open Builder** 접속

2. **스킬 수정**
   - 기존 스킬 선택
   - 스킬 URL 변경: `https://jisa-app.vercel.app/api/kakao/chat`
   - 저장

3. **연결 테스트**
   - "연결 테스트" 버튼 클릭
   - 응답 확인

### Step 4: 프로덕션 테스트 메시지

KakaoTalk 앱에서 동일한 테스트 메시지 전송:

```
1. "한화생명 변액연금 수수료"
2. "종신보험 설명"
3. "변액연금 상품 비교"
```

### Step 5: 프로덕션 모니터링

**Vercel Logs:**
```bash
# CLI로 로그 확인
vercel logs --production

# 또는 Vercel Dashboard:
# https://vercel.com/[team]/jisa-app/logs
```

**Supabase Dashboard:**
```
https://app.supabase.com/project/[project-id]/editor
```

- Database → Logs → API Logs 확인
- Table Editor → query_logs 확인

---

## 테스트 시나리오

### 시나리오 1: Commission Query (수수료 문의) 💰

#### 테스트 케이스 1.1: 단순 수수료 문의

**입력:**
```
한화생명 변액연금 수수료
```

**Expected Flow:**
1. Commission Detection: `confidence >= 0.5`
2. Commission System 실행
3. 수수료 데이터 조회
4. Gemini로 답변 생성
5. 수수료 정보 포함 응답

**Expected Response:**
```
한화생명 변액연금의 수수료 정보입니다.

[수수료 정보]
- 상품명: [상품명]
- 보험사: 한화생명
- 수수료: X.XX%
- 납입기간: ...

[추가 정보]
...
```

**검증:**
- ✅ 응답 시간: < 5초
- ✅ 수수료 퍼센트(%) 포함
- ✅ DB 로그 저장: `query_type='commission'`
- ✅ `commission_confidence >= 0.5`

**실패 시 체크:**
- Commission JSON 데이터 존재 확인
- API 키 유효성 확인
- 로그 에러 메시지 확인

#### 테스트 케이스 1.2: 복잡한 수수료 문의

**입력:**
```
KB생명 종신보험 5년납과 10년납 수수료 차이를 알려주세요
```

**Expected Response:**
- 두 납입기간의 수수료 비교
- 차이점 설명
- 추천 사항 (선택)

**검증:**
- ✅ 5년납, 10년납 모두 포함
- ✅ 비교 정보 제공
- ✅ 응답 시간: < 8초

#### 테스트 케이스 1.3: 다중 보험사 비교

**입력:**
```
한화생명, 삼성생명, KB생명 변액연금 수수료 비교
```

**Expected Response:**
- 3개 보험사 수수료 정보
- 비교 테이블 또는 리스트
- 각 보험사별 특징

**검증:**
- ✅ 3개 보험사 모두 언급
- ✅ 수수료 정보 포함
- ✅ 응답 시간: < 10초

---

### 시나리오 2: RAG Query (일반 문의) 📚

#### 테스트 케이스 2.1: 개념 설명

**입력:**
```
종신보험이란 무엇인가요?
```

**Expected Flow:**
1. Commission Detection: `confidence < 0.5`
2. RAG System 실행
3. Gemini Flash로 쿼리 향상
4. OpenAI 임베딩 생성
5. Pinecone 검색 (top 10)
6. Gemini Pro로 답변 생성

**Expected Response:**
```
종신보험은 피보험자가 사망할 때까지 보장하는 보험상품입니다.

[주요 특징]
- 평생 보장
- 사망 보험금 지급
- 해약환급금 존재
...

[상세 설명]
...
```

**검증:**
- ✅ 종신보험 정의 포함
- ✅ 특징 설명
- ✅ 응답 길이: >= 100자
- ✅ DB 로그: `query_type='rag'`
- ✅ 응답 시간: < 8초

**실패 시 체크:**
- Pinecone 연결 확인
- Pinecone 데이터 존재 확인
- OpenAI API 키 확인
- Gemini API 키 확인

#### 테스트 케이스 2.2: 비교 설명

**입력:**
```
변액연금과 변액보험의 차이점을 알려주세요
```

**Expected Response:**
- 두 상품의 정의
- 주요 차이점 (목적, 보장, 수익 등)
- 선택 가이드

**검증:**
- ✅ 두 상품 모두 설명
- ✅ 차이점 명확히 구분
- ✅ 응답 길이: >= 200자

#### 테스트 케이스 2.3: 복잡한 문의

**입력:**
```
60세 은퇴 준비를 위한 연금보험 선택 시 고려사항과 추천 상품 유형을 자세히 알려주세요
```

**Expected Response:**
- 은퇴 준비 고려사항
- 연금보험 선택 기준
- 추천 상품 유형
- 주의사항

**검증:**
- ✅ 구체적인 가이드 제공
- ✅ 60세/은퇴 키워드 반영
- ✅ 응답 길이: >= 300자
- ✅ 응답 시간: < 10초

---

### 시나리오 3: Timeout 처리 ⏱️

#### 테스트 케이스 3.1: 긴 처리 시간

**입력:**
```
한화생명, 삼성생명, KB생명, 메리츠, 동양생명의 모든 변액연금 상품을 비교 분석하고, 각 상품의 수수료, 보장 내용, 장단점, 세금 혜택, 해지환급금, 추천 대상을 상세히 알려주세요. 추가로 시장 점유율과 고객 만족도 정보도 포함해주세요.
```

**Expected Response (4.5초 내 응답 불가 시):**
```
{
  "version": "2.0",
  "template": {
    "outputs": [{
      "simpleText": {
        "text": "아직 생각이 끝나지 않았어요.🙍‍♂️\n잠시 후 아래 버튼을 눌러주세요👆"
      }
    }],
    "quickReplies": [{
      "action": "message",
      "label": "생각 다 끝났나요?🙋‍♂️",
      "messageText": "생각 다 끝났나요?"
    }]
  }
}
```

**검증:**
- ✅ 타임아웃 메시지 표시
- ✅ Quick Reply 버튼 존재
- ✅ 응답 시간: < 5초 (타임아웃 응답)
- ✅ 버튼 클릭 시 재시도 가능

**Follow-up Test:**

버튼 클릭 후:
```
생각 다 끝났나요?
```

- ✅ 재시도 시 정상 응답 (또는 재타임아웃)

---

### 시나리오 4: Edge Cases 🔍

#### 테스트 케이스 4.1: 빈 메시지

**입력:**
```
(빈 메시지)
```

**Expected Response:**
```
질문을 입력해주세요.
```

**검증:**
- ✅ 에러 없이 처리
- ✅ 안내 메시지 제공

#### 테스트 케이스 4.2: 특수 문자

**입력:**
```
@#$%^&*()
```

**Expected Response:**
- 정상 처리 (에러 없음)
- 의미 있는 응답 또는 안내 메시지

**검증:**
- ✅ 크래시 없음
- ✅ 에러 메시지 없음

#### 테스트 케이스 4.3: 매우 긴 메시지

**입력:**
```
(500자 이상의 긴 질문)
```

**검증:**
- ✅ 정상 처리
- ✅ 응답 생성
- ✅ 타임아웃 처리 (필요 시)

#### 테스트 케이스 4.4: 외국어

**입력:**
```
What is life insurance?
```

**Expected Response:**
- 한국어 또는 영어 답변
- 정상 처리

**검증:**
- ✅ 에러 없이 처리
- ✅ 의미 있는 응답

---

### 시나리오 5: 로깅 & 분석 📊

#### 테스트 케이스 5.1: 로그 저장 확인

**테스트 순서:**

1. 메시지 전송: "한화생명 수수료"
2. 응답 수신
3. DB 확인:

```sql
-- Supabase SQL Editor
SELECT
  id,
  query_text,
  response_text,
  query_type,
  commission_confidence,
  response_time,
  timestamp
FROM query_logs
ORDER BY timestamp DESC
LIMIT 1;
```

**검증:**
- ✅ `query_text`: "한화생명 수수료"
- ✅ `response_text`: 실제 응답 내용
- ✅ `query_type`: 'commission' 또는 'rag'
- ✅ `commission_confidence`: 0-1 사이 값
- ✅ `response_time`: 밀리초 단위 (> 0)
- ✅ `timestamp`: 현재 시간

#### 테스트 케이스 5.2: 대시보드 반영 확인

**테스트 순서:**

1. 여러 메시지 전송 (5-10개)
2. 관리자 대시보드 접속: `https://jisa-app.vercel.app/dashboard`
3. 통계 확인:

**검증:**
- ✅ "오늘의 쿼리" 수 증가
- ✅ 최근 쿼리 테이블에 표시
- ✅ 쿼리 타입 차트 업데이트
- ✅ 응답 시간 평균 계산

---

## 트러블슈팅

### 문제 1: 응답 없음

**증상**: KakaoTalk에서 메시지 전송 후 무응답

**원인 파악:**

1. **API 엔드포인트 확인:**
```bash
curl https://jisa-app.vercel.app/api/kakao/chat
```

2. **Vercel Logs 확인:**
```bash
vercel logs --production
```

3. **KakaoTalk 스킬 URL 확인:**
- i Open Builder → 스킬 → URL 확인

**해결 방법:**
- URL 오타 수정
- Vercel 배포 상태 확인
- API 엔드포인트 재시작

---

### 문제 2: Commission 감지 실패

**증상**: 수수료 질문인데 RAG로 라우팅됨

**원인 파악:**

```typescript
// lib/services/commission-detector.ts 확인
const detection = detectCommissionQuery("한화생명 수수료");
console.log(detection);
// { isCommissionQuery: false, confidence: 0.3, ... }
```

**해결 방법:**

1. **키워드 추가:**
```typescript
// lib/services/commission-detector.ts
const COMMISSION_KEYWORDS = [
  '수수료', '커미션', 'commission', '보험료',
  // 추가 키워드...
];
```

2. **신뢰도 임계값 조정:**
```typescript
// lib/services/chat.service.ts
if (detection.isCommissionQuery && detection.confidence >= 0.4) { // 0.5 → 0.4
  // Commission system
}
```

3. **재배포:**
```bash
vercel --prod
```

---

### 문제 3: RAG 답변 품질 낮음

**증상**: RAG 답변이 관련 없거나 부정확함

**원인 파악:**

1. **Pinecone 데이터 확인:**
```bash
# Pinecone Console: https://app.pinecone.io/
# Index: hof-branch-chatbot
# Namespace: hof-knowledge-base-max
# Vector count: > 0
```

2. **검색 결과 확인:**
```typescript
// lib/services/rag.service.ts에 로그 추가
const results = await searchPinecone(embedding, filter, topK);
console.log('Pinecone results:', results.matches.length);
console.log('Top match score:', results.matches[0]?.score);
```

**해결 방법:**

1. **top_k 증가:**
```typescript
const results = await searchPinecone(embedding, filter, 20); // 10 → 20
```

2. **메타데이터 key 확인:**
```typescript
// public/metadata_key.json 파일 확인
// Gemini Flash가 사용하는 메타데이터 구조
```

3. **쿼리 향상 프롬프트 개선:**
```typescript
// lib/services/rag.service.ts
const systemPrompt = `당신은 보험 관련 쿼리를 최적화하는 전문가입니다.
메타데이터: ${JSON.stringify(metadataKey)}
더 구체적이고 정확한 쿼리로 변환하세요.
응답은 JSON 형식으로.`;
```

---

### 문제 4: 타임아웃 자주 발생

**증상**: 대부분의 쿼리가 타임아웃 응답

**원인 파악:**

1. **API 응답 시간 측정:**
```bash
time curl -X POST https://jisa-app.vercel.app/api/kakao/chat \
  -H "Content-Type: application/json" \
  -d '{"user_message":"종신보험이란?"}'
```

2. **Vercel Function 로그 확인:**
```bash
vercel logs --production | grep "duration"
```

**해결 방법:**

1. **타임아웃 시간 조정:**
```typescript
// app/api/kakao/chat/route.ts
const timeoutPromise = new Promise<string>((_, reject) =>
  setTimeout(() => reject(new Error('Timeout')), 6000) // 4500 → 6000
);
```

2. **Vercel Function 설정:**
```json
// vercel.json
{
  "functions": {
    "app/api/kakao/**/*.ts": {
      "maxDuration": 60 // 30 → 60 (Pro plan 필요)
    }
  }
}
```

3. **성능 최적화:**
- Gemini model 변경: `gemini-flash` 사용 (이미 적용됨)
- Pinecone top_k 감소: 20 → 10
- 캐싱 추가 (선택)

---

### 문제 5: 로그 저장 안 됨

**증상**: 대시보드에 쿼리 로그 표시 안 됨

**원인 파악:**

1. **Supabase 연결 확인:**
```sql
-- Supabase SQL Editor
SELECT COUNT(*) FROM query_logs;
```

2. **RLS 정책 확인:**
```sql
SELECT * FROM query_logs WHERE user_id IS NULL;
-- Service Role로 실행 시 모든 로그 보여야 함
```

**해결 방법:**

1. **SERVICE_ROLE_KEY 확인:**
```bash
# Vercel 환경 변수 확인
vercel env ls

# SERVICE_ROLE_KEY 존재 확인
```

2. **로깅 코드 확인:**
```typescript
// app/api/kakao/chat/route.ts
const supabase = createClient(); // Service role 사용해야 함

await logQuery({
  userId,
  kakaoUserId: userId,
  sessionId,
  queryText: userMessage,
  responseText: response,
  responseTime,
});
```

3. **RLS 정책 수정 (필요 시):**
```sql
-- Service role은 RLS 우회 가능
-- lib/supabase/server.ts에서 service role 사용 확인
```

---

## 성능 벤치마크

### 목표 성능

| 메트릭 | 목표 | 측정 방법 |
|--------|------|-----------|
| **Commission Query** | < 5초 | KakaoTalk 응답 시간 |
| **RAG Query** | < 8초 | KakaoTalk 응답 시간 |
| **Timeout Rate** | < 10% | 전체 쿼리 대비 타임아웃 비율 |
| **Success Rate** | > 95% | 에러 없이 응답한 비율 |
| **DB 저장** | 100% | 모든 쿼리 로그 저장 |

### 측정 방법

```sql
-- Supabase SQL Editor에서 실행
SELECT
  COUNT(*) as total_queries,
  AVG(response_time) as avg_response_ms,
  MIN(response_time) as min_response_ms,
  MAX(response_time) as max_response_ms,
  SUM(CASE WHEN response_time < 5000 THEN 1 ELSE 0 END)::float / COUNT(*) * 100 as within_5s_percent
FROM query_logs
WHERE timestamp >= NOW() - INTERVAL '24 hours';
```

---

## 테스트 리포트 템플릿

```markdown
# KakaoTalk 웹훅 테스트 리포트

**테스트 일시**: YYYY-MM-DD HH:MM
**테스트 환경**: Production / Local (ngrok)
**테스트 URL**: https://...
**테스터**: [이름]

## 테스트 결과 요약

- **총 테스트**: X개
- **성공**: X개 (XX%)
- **실패**: X개 (XX%)
- **평균 응답 시간**: X.XX초

## 시나리오별 결과

### Commission Query
- [x] TC 1.1: 단순 수수료 - 성공 (3.2초)
- [x] TC 1.2: 복잡한 수수료 - 성공 (5.1초)
- [ ] TC 1.3: 다중 보험사 비교 - 실패 (타임아웃)

### RAG Query
- [x] TC 2.1: 개념 설명 - 성공 (4.5초)
- [x] TC 2.2: 비교 설명 - 성공 (6.3초)
- [x] TC 2.3: 복잡한 문의 - 성공 (7.8초)

### Timeout 처리
- [x] TC 3.1: 긴 처리 시간 - 성공 (타임아웃 메시지 표시)

### Edge Cases
- [x] TC 4.1: 빈 메시지 - 성공
- [x] TC 4.2: 특수 문자 - 성공
- [x] TC 4.3: 긴 메시지 - 성공
- [x] TC 4.4: 외국어 - 성공

## 발견된 문제

1. **TC 1.3 실패**: 다중 보험사 비교 시 타임아웃
   - 원인: Commission 데이터 조회 시간 초과
   - 해결 방안: 데이터 캐싱 또는 쿼리 최적화

2. **응답 시간 편차**: RAG 쿼리 응답 시간 불안정
   - 원인: Pinecone 검색 시간 변동
   - 해결 방안: Pinecone 인덱스 최적화

## 권장 사항

- [ ] Commission 데이터 캐싱 구현
- [ ] Pinecone 인덱스 최적화
- [ ] 타임아웃 시간 조정 (4.5s → 6s)
- [ ] 에러 핸들링 개선

## 첨부 자료

- Vercel Logs: [링크]
- Supabase Logs: [링크]
- 스크린샷: [첨부]
```

---

**문서 버전**: 1.0
**최종 수정**: 2025-11-13
**작성자**: JISA Development Team

**다음 단계**:
1. 로컬 테스트 (ngrok) 실행
2. 프로덕션 배포 후 테스트
3. 성능 벤치마크 수행
4. 테스트 리포트 작성
