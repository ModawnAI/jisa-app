# 지사 (JISA) - 마스터 플랜 & 진행 상황
## KakaoTalk RAG 챗봇 통합 관리 플랫폼 - Python → Next.js 15 TypeScript 완전 마이그레이션

**문서 버전:** 1.0 (통합)
**작성일:** 2025-11-13
**상태:** 🚧 마이그레이션 진행 중
**목표:** 단일 Next.js 애플리케이션으로 통합 (챗봇 + 관리자 대시보드)

---

## 📊 프로젝트 현황

### ✅ 완료된 작업
- [x] 기존 Python FastAPI 코드베이스 분석 완료
- [x] TypeScript 포팅 매핑 설계 완료
- [x] 통합 아키텍처 설계 완료
- [x] 데이터베이스 스키마 설계 완료
- [x] UI/UX 설계 완료

### 🚧 진행 중인 작업
- [ ] Next.js 15 프로젝트 초기화
- [ ] 서비스 레이어 TypeScript 포팅
- [ ] API Routes 구현
- [ ] Supabase 설정

### 📅 예정된 작업
- [ ] 관리자 대시보드 UI 구현
- [ ] 통합 테스트
- [ ] Vercel 배포

---

## 📋 목차

1. [프로젝트 개요](#프로젝트-개요)
2. [현재 시스템 분석](#현재-시스템-분석)
3. [통합 아키텍처](#통합-아키텍처)
4. [Python → TypeScript 포팅](#python--typescript-포팅)
5. [데이터베이스 설계](#데이터베이스-설계)
6. [관리자 대시보드](#관리자-대시보드)
7. [API 설계](#api-설계)
8. [UI/UX 설계](#uiux-설계)
9. [배포 전략](#배포-전략)
10. [마이그레이션 로드맵](#마이그레이션-로드맵)
11. [체크리스트](#체크리스트)

---

## 프로젝트 개요

### 🎯 프로젝트 목표

**지사 (JISA)** 는 KakaoTalk RAG 챗봇과 관리자 대시보드를 **단일 Next.js 15 애플리케이션**으로 통합하는 프로젝트입니다.

### 핵심 가치

- ✅ **통합 플랫폼**: 챗봇 + 관리자 대시보드 단일 코드베이스
- ✅ **단일 언어**: Python + Node.js → TypeScript만 사용
- ✅ **현대적 스택**: Next.js 15, Supabase, Shadcn UI
- ✅ **한국어 우선**: 모든 UI/UX가 한국어 최적화
- ✅ **확장 가능**: Vercel Serverless 자동 스케일링
- ✅ **타입 안정성**: TypeScript로 런타임 에러 사전 방지

### 기술 스택 변경

| 구성요소 | 기존 | 새로운 | 이유 |
|---------|------|--------|------|
| **프레임워크** | FastAPI (Python) | Next.js 15 | 프론트엔드 + 백엔드 통합 |
| **언어** | Python | TypeScript | 타입 안정성, 단일 언어 |
| **LLM** | google-genai (Py) | @google/genai | 네이티브 Node.js + 고급 기능 |
| **임베딩** | openai (Py) | openai (Node.js) | 네이티브 Node.js |
| **벡터 DB** | pinecone-client (Py) | @pinecone-database/pinecone | MCP 통합 |
| **데이터베이스** | 없음 | Supabase PostgreSQL | 통합 DB + Auth |
| **인증** | 없음 | Supabase Auth | OAuth + JWT |
| **스토리지** | 로컬 파일 | Supabase Storage | 클라우드 스토리지 |
| **UI** | 없음 | Shadcn UI + Radix UI | 현대적 컴포넌트 |
| **배포** | PM2 + systemd | Vercel Serverless | 자동 스케일링 |
| **서버** | Uvicorn :8000 | Vercel Edge Runtime | Serverless |

### 폰트 & 언어

- **폰트**: Noto Sans KR (300, 400, 500, 700, 900)
- **주 언어**: 한국어
- **UI 아이콘**: Lucide React

---

## 현재 시스템 분석

### 기존 아키텍처 (Python FastAPI)

```
KakaoTalk 사용자
    ↓
FastAPI (app.py) - Port 8000
    ↓
┌─────────────────────────────────────┐
│  [1] Commission Detection           │
│      - commission_detector.py       │
│      - 키워드 매칭                   │
│      - 신뢰도 점수 계산              │
└─────────────────────────────────────┘
    ↓ (confidence >= 0.5)
┌─────────────────────────────────────┐
│  [2] Commission Query               │
│      - commission_service.py        │
│      - Node.js subprocess 호출      │
│      - 결과 포매팅 → Gemini         │
└─────────────────────────────────────┘
    ↓ (fallback or confidence < 0.5)
┌─────────────────────────────────────┐
│  [3] RAG System                     │
│      - rag_chatbot.py               │
│      Step 1: Gemini Flash           │
│              (쿼리 향상)            │
│      Step 2: OpenAI Embeddings      │
│              (text-embedding-3-large)│
│      Step 3: Pinecone Search        │
│              (top 10 결과)          │
│      Step 4: 컨텍스트 포매팅        │
│      Step 5: PDF 첨부 결정          │
│      Step 6: Gemini 2.5 Pro         │
│              (최종 답변 생성)       │
└─────────────────────────────────────┘
    ↓
KakaoTalk Response (JSON)
```

### 주요 Python 파일

#### 1. `app.py` - FastAPI 메인
```python
# 엔드포인트:
POST /chat/          # 일반 채팅 (즉시 응답)
POST /callback/      # 비동기 콜백
POST /upload-pdf     # PDF 업로드
GET  /               # 헬스 체크

# 의존성:
- openai (OpenAI API)
- google.genai (Gemini API)
- pinecone (Pinecone 검색)
- commission_detector
- commission_service
- rag_chatbot
```

#### 2. `rag_chatbot.py` - RAG 파이프라인
```python
def rag_answer(user_query: str, top_k: int = 10) -> str:
    # 1. 쿼리 향상 (Gemini Flash + metadata_key.json)
    enhanced = enhance_query_with_gemini_flash(user_query, metadata_key)

    # 2. 임베딩 생성 (OpenAI)
    embedding = generate_embedding(enhanced['improved_query'])

    # 3. Pinecone 검색
    results = search_pinecone(embedding, enhanced.get('pinecone_filter'))

    # 4. 컨텍스트 포매팅
    context = format_context(results)

    # 5. PDF 첨부
    pdfs = get_relevant_pdfs(user_query, results)

    # 6. 답변 생성 (Gemini 2.5 Pro)
    answer = generate_answer_with_gemini(user_query, context)

    if pdfs:
        answer += format_pdf_attachments(pdfs)

    return answer
```

#### 3. `commission_detector.py` - 키워드 감지
```python
def detect_commission_query(query: str) -> dict:
    # 키워드 매칭
    KEYWORDS = ['수수료', '커미션', '보험', '%', '년납', ...]

    # 신뢰도 계산
    confidence = calculate_confidence(matched_keywords)

    return {
        'is_commission_query': confidence >= 0.5,
        'confidence': confidence,
        'matched_keywords': matched_keywords
    }
```

#### 4. `commission_service.py` - Node.js 연동
```python
def query_commission(user_query: str) -> dict:
    # subprocess로 Node.js 실행
    result = subprocess.run([
        'node',
        'commission_query_system_dynamic/temp_query.js'
    ], ...)

    return json.loads(result.stdout)
```

### 문제점

1. **복잡한 의존성**: Python + Node.js 혼재
2. **subprocess 오버헤드**: Python → Node.js 호출
3. **관리 어려움**: 두 개의 런타임 환경
4. **배포 복잡도**: PM2 + systemd 수동 관리
5. **확장성 제한**: 수직 스케일링만 가능
6. **관리 UI 없음**: 로그, 사용자, 분석 불가능

---

## 통합 아키텍처

### 목표 아키텍처 (Next.js 15 + TypeScript)

```
┌──────────────────────────────────────────────────────────────────┐
│                  지사 (JISA) 통합 플랫폼                           │
│                   (Next.js 15 + TypeScript)                       │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │              프론트엔드 (App Router)                        │  │
│  │  ┌──────────┬──────────┬──────────┬──────────┬─────────┐  │  │
│  │  │ 대시보드  │  사용자   │  데이터   │   분석   │  설정   │  │  │
│  │  │          │   관리    │   관리    │          │         │  │  │
│  │  └──────────┴──────────┴──────────┴──────────┴─────────┘  │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                ↓                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │              API 레이어 (API Routes)                        │  │
│  │  ┌──────────┬──────────┬──────────┬──────────┬─────────┐  │  │
│  │  │ KakaoTalk│   RAG    │Commission│  Admin   │  Auth   │  │  │
│  │  │  Webhook │   API    │   API    │   API    │   API   │  │  │
│  │  └──────────┴──────────┴──────────┴──────────┴─────────┘  │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                ↓                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │         서비스 레이어 (TypeScript Services)                 │  │
│  │  ┌──────────┬──────────┬──────────┬──────────┬─────────┐  │  │
│  │  │   RAG    │Commission│ Pinecone │  Gemini  │ OpenAI  │  │  │
│  │  │ Service  │ Service  │ Service  │ Service  │ Service │  │  │
│  │  └──────────┴──────────┴──────────┴──────────┴─────────┘  │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
                                ↓
┌──────────────────────────────────────────────────────────────────┐
│                        외부 서비스                                │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────────┐   │
│  │ Supabase │ Pinecone │  Gemini  │  OpenAI  │  KakaoTalk   │   │
│  │(DB/Auth) │ (Vector) │   API    │   API    │   Webhook    │   │
│  └──────────┴──────────┴──────────┴──────────┴──────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

### 레이어 구조

#### 1. **프레젠테이션 레이어** (Next.js + Shadcn UI)
- 관리자 대시보드 UI (React Server Components)
- 반응형 디자인 (모바일/태블릿/데스크톱)
- 실시간 데이터 업데이트 (Supabase Realtime)
- Noto Sans KR 폰트 적용

#### 2. **API 레이어** (Next.js API Routes)
- RESTful API 엔드포인트
- KakaoTalk 웹훅 처리
- Supabase RPC 함수 호출
- 미들웨어 (인증, 로깅, RBAC)

#### 3. **서비스 레이어** (TypeScript Services)
- RAG 파이프라인
- Commission 감지 및 쿼리
- Pinecone 벡터 검색
- Gemini/OpenAI 통합

#### 4. **데이터 레이어**
- Supabase PostgreSQL (메인 DB)
- Pinecone (벡터 임베딩)
- Supabase Storage (파일)

### 성능 개선 예상

| 메트릭 | 기존 (Python) | 새로운 (Next.js) | 개선율 |
|--------|---------------|------------------|--------|
| **Cold Start** | 5-10초 | 1-2초 | 80% ⬇ |
| **API 응답** | 2-5초 | 1-3초 | 40% ⬇ |
| **메모리** | ~500MB | ~200MB | 60% ⬇ |
| **배포 시간** | ~5분 (PM2) | ~30초 (Vercel) | 90% ⬇ |
| **확장성** | 수동 (PM2) | 자동 (Vercel) | ∞ |

---

## Python → TypeScript 포팅

### 포팅 매핑 테이블

| Python 파일 | TypeScript 파일 | 상태 | 우선순위 |
|-------------|----------------|------|----------|
| `app.py` | `app/api/kakao/*/route.ts` | ⏳ 대기 | 🔴 높음 |
| `rag_chatbot.py` | `lib/services/rag.service.ts` | ⏳ 대기 | 🔴 높음 |
| `commission_detector.py` | `lib/services/commission-detector.ts` | ⏳ 대기 | 🟡 중간 |
| `commission_service.py` | `lib/services/commission.service.ts` | ⏳ 대기 | 🟡 중간 |
| `pinecone_helper.py` | `lib/services/rag.service.ts` (통합) | ⏳ 대기 | 🔴 높음 |

### 1. RAG Service 포팅

#### Before (Python)
```python
# rag_chatbot.py
def rag_answer(user_query: str, top_k: int = 10) -> str:
    metadata_key = load_metadata_key()
    enhanced = enhance_query_with_gemini_flash(user_query, metadata_key)
    embedding = generate_embedding(enhanced['improved_query'])
    results = search_pinecone(embedding, enhanced.get('pinecone_filter'))
    context = format_context(results)
    answer = generate_answer_with_gemini(user_query, context)
    return answer
```

#### After (TypeScript)
```typescript
// lib/services/rag.service.ts
export async function ragAnswer(userQuery: string, topK: number = 10): Promise<string> {
  const metadataKey = await loadMetadataKey();

  // Step 1: Query Enhancement
  const enhanced = await enhanceQueryWithGeminiFlash(userQuery, metadataKey);

  // Step 2: Generate Embedding
  const embedding = await generateEmbedding(enhanced.improved_query);

  // Step 3: Search Pinecone
  const results = await searchPinecone(embedding, enhanced.pinecone_filter, topK);

  // Step 4: Format Context
  const context = formatContext(results);

  // Step 5: Generate Answer
  const answer = await generateAnswerWithGemini(userQuery, context);

  // Step 6: Attach PDFs
  const pdfs = await getRelevantPdfs(userQuery, results);
  if (pdfs.length > 0) {
    return answer + formatPdfAttachments(pdfs);
  }

  return answer;
}

// Gemini Flash Query Enhancement
async function enhanceQueryWithGeminiFlash(
  userQuery: string,
  metadataKey: MetadataKey
): Promise<EnhancedQuery> {
  const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genai.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

  const systemPrompt = `당신은 보험 관련 쿼리를 최적화하는 전문가입니다.
메타데이터: ${JSON.stringify(metadataKey)}
응답은 JSON 형식으로.`;

  const result = await model.generateContent([systemPrompt, `질문: ${userQuery}`]);
  const text = result.response.text();

  return JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || '{}');
}

// OpenAI Embeddings
async function generateEmbedding(text: string): Promise<number[]> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

  const response = await openai.embeddings.create({
    model: 'text-embedding-3-large',
    input: text,
    dimensions: 3072,
  });

  return response.data[0].embedding;
}

// Pinecone Search
async function searchPinecone(
  embedding: number[],
  filters?: Record<string, any>,
  topK: number = 10
): Promise<PineconeSearchResult> {
  const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
  const index = pinecone.index(process.env.PINECONE_INDEX!);

  return await index.namespace('hof-knowledge-base-max').query({
    vector: embedding,
    topK,
    filter: filters,
    includeMetadata: true,
  });
}

// Gemini 2.5 Pro Answer Generation
async function generateAnswerWithGemini(
  userQuery: string,
  context: string
): Promise<string> {
  const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genai.getGenerativeModel({ model: 'gemini-2.5-pro-exp-0320' });

  const systemPrompt = `당신은 한국 보험 전문가 AI입니다.
컨텍스트: ${context}
답변 지침:
1. 반드시 한국어로만 답변
2. 컨텍스트 정보만 사용
3. 정확하고 구체적으로`;

  const result = await model.generateContent([systemPrompt, `질문: ${userQuery}`]);
  return result.response.text();
}
```

### 2. Commission Detector 포팅

#### Before (Python)
```python
# commission_detector.py
def detect_commission_query(query: str) -> dict:
    query_lower = query.lower().strip()
    matched_keywords = []

    KEYWORDS = ['수수료', '커미션', '보험', '%', '년납']

    for keyword in KEYWORDS:
        if keyword.lower() in query_lower:
            matched_keywords.append(keyword)

    confidence = calculate_confidence(matched_keywords)

    return {
        'is_commission_query': confidence >= 0.5,
        'confidence': confidence,
        'matched_keywords': matched_keywords
    }
```

#### After (TypeScript)
```typescript
// lib/services/commission-detector.ts
export interface CommissionDetectionResult {
  isCommissionQuery: boolean;
  confidence: number;
  matchedKeywords: string[];
  reasoning: string;
}

const COMMISSION_KEYWORDS = [
  '수수료', '커미션', 'commission', '보험료',
  '종신보험', '변액연금', '건강보험',
  'KB', '삼성', '미래에셋', '한화',
  '년납', '일시납', '%', '프로'
];

const STRONG_INDICATORS = ['수수료', '커미션', 'commission', '%'];

export function detectCommissionQuery(query: string): CommissionDetectionResult {
  const queryLower = query.toLowerCase().trim();
  const matchedKeywords: string[] = [];
  let strongMatch = false;

  // Keyword matching
  for (const keyword of COMMISSION_KEYWORDS) {
    if (queryLower.includes(keyword.toLowerCase())) {
      matchedKeywords.push(keyword);

      if (STRONG_INDICATORS.some(strong =>
        keyword.toLowerCase().includes(strong.toLowerCase())
      )) {
        strongMatch = true;
      }
    }
  }

  // Calculate confidence
  let confidence = 0.0;

  if (strongMatch) {
    confidence = 0.9;
  } else if (matchedKeywords.length >= 3) {
    confidence = 0.8;
  } else if (matchedKeywords.length >= 2) {
    confidence = 0.6;
  } else if (matchedKeywords.length === 1) {
    confidence = 0.3;
  }

  // Check percentage patterns
  const percentagePattern = /(\d+)\s*[%프프로센트]/;
  if (percentagePattern.test(queryLower)) {
    confidence = Math.max(confidence, 0.85);
    matchedKeywords.push('percentage_indicator');
  }

  const isCommissionQuery = confidence >= 0.5;

  const reasoning = isCommissionQuery
    ? `발견된 키워드: ${matchedKeywords.join(', ')}. ${
        strongMatch ? '강한 수수료 관련 키워드 발견.' :
        `${matchedKeywords.length}개의 관련 키워드 발견.`
      }`
    : '수수료 관련 키워드가 충분하지 않음.';

  return {
    isCommissionQuery,
    confidence,
    matchedKeywords,
    reasoning,
  };
}
```

### 3. Main Chat Handler 포팅

#### Before (Python)
```python
# app.py
def getTextFromGPT(prompt):
    # Step 1: Commission Detection
    detection = detect_commission_query(prompt)

    if detection['is_commission_query'] and detection['confidence'] >= 0.5:
        # Commission System
        commission_result = query_commission(prompt)
        context = format_commission_for_gpt(commission_result)
        return generate_commission_answer(prompt, context)

    # Step 2: RAG System
    return rag_answer(prompt, top_k=10)
```

#### After (TypeScript)
```typescript
// lib/services/chat.service.ts
import { detectCommissionQuery } from './commission-detector';
import { queryCommission, formatCommissionForGPT } from './commission.service';
import { ragAnswer } from './rag.service';
import { GoogleGenAI } from '@google/genai';

const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function getTextFromGPT(prompt: string): Promise<string> {
  try {
    console.log('='.repeat(80));
    console.log('🔍 Step 1: Commission Detection');

    const detection = detectCommissionQuery(prompt);

    console.log(`   Is Commission: ${detection.isCommissionQuery}`);
    console.log(`   Confidence: ${detection.confidence.toFixed(2)}`);
    console.log('='.repeat(80));

    // Route to Commission System
    if (detection.isCommissionQuery && detection.confidence >= 0.5) {
      console.log('🎯 Routing to COMMISSION SYSTEM');

      try {
        const commissionResult = await queryCommission(prompt);
        const context = formatCommissionForGPT(commissionResult);

        const model = 'gemini-flash-latest';

        const systemPrompt = `너는 한국 보험 수수료 전문가 AI입니다.
참조 정보: ${context}
모든 숫자는 백분율(%)로 변환하세요.`;

        const contents = [
          {
            role: 'user',
            parts: [
              {
                text: `${systemPrompt}\n\n질문: ${prompt}`,
              },
            ],
          },
        ];

        const config = {
          thinkingConfig: {
            thinkingBudget: 10000,
          },
          imageConfig: {
            imageSize: '1K',
          },
        };

        const response = await genai.models.generateContent({
          model,
          config,
          contents,
        });

        return response.text;

      } catch (error) {
        console.error('Commission 시스템 오류:', error);
        console.log('⚠️ Fallback to RAG...');
      }
    }

    // Route to RAG System
    console.log('📚 Routing to RAG SYSTEM');
    return await ragAnswer(prompt, 10);

  } catch (error) {
    console.error('getTextFromGPT Error:', error);
    return '죄송합니다. 응답 생성 중 오류가 발생했습니다.';
  }
}
```

### 4. Commission Service 통합

**기존**: Python subprocess로 Node.js 실행
**새로운**: 직접 TypeScript 모듈 import

#### Before (Python calling Node.js)
```python
# commission_service.py
import subprocess

def query_commission(user_query: str) -> dict:
    # Create temp script
    temp_script = f"""
    import {{ NaturalLanguageCommissionSystem }} from './src/nl_query_system_dynamic.js';
    const system = new NaturalLanguageCommissionSystem();
    const result = await system.executeQuery('{user_query}');
    console.log(JSON.stringify(result));
    """

    # Run Node.js
    result = subprocess.run(['node', 'temp.js'], ...)
    return json.loads(result.stdout)
```

#### After (TypeScript direct import)
```typescript
// lib/services/commission.service.ts
import { NaturalLanguageCommissionSystem } from '@/lib/commission-system/nl-query-system';

export async function queryCommission(userQuery: string): Promise<CommissionResult> {
  const system = new NaturalLanguageCommissionSystem();
  return await system.executeQuery(userQuery);
}

export function formatCommissionForGPT(result: CommissionResult): string {
  if (result.status === 'error') {
    return `수수료 조회 오류: ${result.message}`;
  }

  const lines: string[] = [];
  const bestMatch = result.best_match;

  lines.push('=== 수수료 조회 결과 ===');
  lines.push(`상품명: ${bestMatch.product_name}`);
  lines.push(`보험회사: ${bestMatch.company}`);
  lines.push(`납입기간: ${bestMatch.payment_period}`);

  // ... 나머지 포매팅

  return lines.join('\n');
}
```

---

## 데이터베이스 설계

### Supabase PostgreSQL 스키마

#### 1. 사용자 프로필 (Supabase Auth 확장)

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 기본 정보
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,

  -- 역할 및 권한
  role TEXT NOT NULL DEFAULT 'user',
  -- 'admin' | 'manager' | 'user' | 'guest'

  permissions JSONB DEFAULT '[]'::jsonb,

  -- 구독 정보
  subscription_tier TEXT DEFAULT 'free',
  -- 'free' | 'basic' | 'premium' | 'enterprise'

  subscription_status TEXT DEFAULT 'active',
  subscription_start TIMESTAMPTZ,
  subscription_end TIMESTAMPTZ,

  -- KakaoTalk 연동
  kakao_user_id TEXT UNIQUE,

  -- 사용자 메타데이터 (RBAC 필터링용)
  metadata JSONB DEFAULT '{}'::jsonb,
  -- { "department": "sales", "region": "seoul", "clearance_level": 2 }

  -- 인증
  is_verified BOOLEAN DEFAULT false,
  verification_method TEXT,
  verified_at TIMESTAMPTZ,

  -- 통계
  last_login_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ,
  total_queries INTEGER DEFAULT 0,
  total_sessions INTEGER DEFAULT 0,

  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_subscription_tier ON profiles(subscription_tier);
CREATE INDEX idx_profiles_kakao_user_id ON profiles(kakao_user_id);
CREATE INDEX idx_profiles_email ON profiles(email);

-- RLS (Row Level Security) 활성화
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 정책: 사용자는 자신의 프로필만 조회
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- 정책: 관리자는 모든 프로필 조회
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

#### 2. 쿼리 로그

```sql
CREATE TABLE query_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  kakao_user_id TEXT,
  session_id TEXT,

  -- 쿼리 내용
  query_text TEXT NOT NULL,
  response_text TEXT,
  response_time INTEGER, -- milliseconds

  -- 쿼리 타입
  query_type TEXT, -- 'commission' | 'rag' | 'unknown'
  was_commission_query BOOLEAN,
  commission_confidence DECIMAL(3,2),

  -- 메타데이터
  metadata JSONB DEFAULT '{}'::jsonb,
  -- { "matched_keywords": [...], "pinecone_results": 10, ... }

  -- 타임스탬프
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_query_logs_user_id ON query_logs(user_id);
CREATE INDEX idx_query_logs_kakao_user_id ON query_logs(kakao_user_id);
CREATE INDEX idx_query_logs_timestamp ON query_logs(timestamp DESC);
CREATE INDEX idx_query_logs_query_type ON query_logs(query_type);
CREATE INDEX idx_query_logs_session_id ON query_logs(session_id);

-- RLS
ALTER TABLE query_logs ENABLE ROW LEVEL SECURITY;

-- 정책: 사용자는 자신의 로그만 조회
CREATE POLICY "Users can view own logs"
  ON query_logs FOR SELECT
  USING (user_id = auth.uid());

-- 정책: 관리자는 모든 로그 조회
CREATE POLICY "Admins can view all logs"
  ON query_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

#### 3. 인증 코드

```sql
CREATE TABLE verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 코드 (형식: HXK-9F2-M7Q-3WP)
  code TEXT UNIQUE NOT NULL,

  -- 연결된 사용자 (인증 후)
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- 코드 속성
  code_type TEXT NOT NULL,
  -- 'registration' | 'kakao_verify' | 'subscription' | 'one_time_access'

  is_used BOOLEAN DEFAULT false,
  used_at TIMESTAMPTZ,

  -- 만료
  expires_at TIMESTAMPTZ NOT NULL,
  max_uses INTEGER DEFAULT 1,
  current_uses INTEGER DEFAULT 0,

  -- 메타데이터
  metadata JSONB DEFAULT '{}'::jsonb,
  -- { "subscription_tier": "premium", "access_level": "tier_2" }

  -- KakaoTalk 통합
  kakao_user_id TEXT,

  -- 분석 추적
  source TEXT, -- 'admin_dashboard' | 'bulk_import' | 'api_generate'
  campaign TEXT, -- 캠페인 식별자

  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_verification_codes_code ON verification_codes(code);
CREATE INDEX idx_verification_codes_user_id ON verification_codes(user_id);
CREATE INDEX idx_verification_codes_type_used ON verification_codes(code_type, is_used);
CREATE INDEX idx_verification_codes_expires_at ON verification_codes(expires_at);

-- RLS
ALTER TABLE verification_codes ENABLE ROW LEVEL SECURITY;

-- 정책: 관리자만 조회
CREATE POLICY "Only admins can view codes"
  ON verification_codes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

#### 4. 분석 이벤트

```sql
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  session_id TEXT,

  -- 이벤트 상세
  event_type TEXT NOT NULL,
  -- 'query' | 'login' | 'code_use' | 'document_access'

  event_category TEXT,
  event_action TEXT,
  event_label TEXT,

  -- 컨텍스트
  query_text TEXT,

  -- 메타데이터
  metadata JSONB DEFAULT '{}'::jsonb,

  -- 기술 정보
  ip_address INET,
  user_agent TEXT,

  -- 타임스탬프
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 (시계열 최적화)
CREATE INDEX idx_analytics_events_user_id_timestamp
  ON analytics_events(user_id, timestamp DESC);
CREATE INDEX idx_analytics_events_event_type_timestamp
  ON analytics_events(event_type, timestamp DESC);
CREATE INDEX idx_analytics_events_session_id
  ON analytics_events(session_id);

-- RLS
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- 정책: 관리자만 조회
CREATE POLICY "Only admins can view events"
  ON analytics_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

#### 5. 구독 계층 (관리자 설정)

```sql
CREATE TABLE subscription_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  -- 'free' | 'basic' | 'premium' | 'enterprise'

  display_name TEXT NOT NULL, -- "프리미엄 플랜"
  description TEXT,

  -- 가격
  price_monthly DECIMAL(10,2) DEFAULT 0,
  price_yearly DECIMAL(10,2) DEFAULT 0,
  currency TEXT DEFAULT 'KRW',

  -- 제한
  max_projects INTEGER DEFAULT -1, -- -1 = 무제한
  max_queries INTEGER DEFAULT -1,  -- 월별

  -- 기능
  features JSONB DEFAULT '{}'::jsonb,
  -- { "api_access": true, "advanced_analytics": true }

  -- 메타데이터
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,

  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 기본 데이터
INSERT INTO subscription_tiers (name, display_name, description, price_monthly, price_yearly, max_queries, features) VALUES
('free', '무료', '기본 기능 체험', 0, 0, 100, '{"api_access": false}'::jsonb),
('basic', '베이직', '개인 사용자용', 9900, 99000, 1000, '{"api_access": false, "advanced_analytics": true}'::jsonb),
('premium', '프리미엄', '비즈니스용', 29900, 299000, 10000, '{"api_access": true, "advanced_analytics": true}'::jsonb),
('enterprise', '엔터프라이즈', '대기업용', 0, 0, -1, '{"api_access": true, "advanced_analytics": true, "custom_models": true}'::jsonb);
```

---

## 관리자 대시보드

### 페이지 구조

```
/dashboard
├── /                      # 대시보드 홈 (개요)
├── /analytics             # 분석
├── /settings              # 설정
└── /chat                  # 챗봇 인터페이스

/admin (관리자 전용)
├── /users                 # 사용자 관리
│   ├── /                  # 사용자 목록
│   └── /[id]              # 사용자 상세
├── /codes                 # 인증 코드 관리
│   ├── /                  # 코드 목록
│   └── /generate          # 코드 생성
├── /logs                  # 쿼리 로그
└── /analytics             # 고급 분석

/auth
├── /login                 # 로그인
├── /register              # 회원가입
└── /callback              # OAuth 콜백
```

### 주요 기능

#### 1. **대시보드 홈** (`/dashboard`)
- 📊 오늘의 쿼리 수
- 👥 활성 사용자 수
- ⚡ 평균 응답 시간
- 📈 쿼리 타입 분포 (RAG vs Commission)

#### 2. **쿼리 로그** (`/admin/logs`)
- 📝 실시간 쿼리 로그
- 🔍 검색 및 필터링 (사용자, 날짜, 타입)
- 📊 쿼리 성능 분석
- 📥 CSV 내보내기

#### 3. **사용자 관리** (`/admin/users`)
- 👤 사용자 목록 (필터링, 정렬, 페이지네이션)
- ✏️ 사용자 정보 수정
- 🔑 역할 변경 (admin, manager, user, guest)
- 💳 구독 관리

#### 4. **인증 코드 관리** (`/admin/codes`)
- 🎫 코드 생성 (단일/대량)
- 📋 코드 목록 및 사용 현황
- 📊 코드 사용 통계
- 📥 CSV 내보내기

#### 5. **분석** (`/admin/analytics`)
- 📈 시스템 개요 (활성 사용자, 총 쿼리)
- 🔍 쿼리 패턴 분석
- 👥 사용자 행동 분석
- 🎯 인기 질문 트렌드

---

## API 설계

### API Routes 구조

```
app/api/
├── kakao/
│   ├── chat/route.ts          # POST /api/kakao/chat
│   ├── callback/route.ts      # POST /api/kakao/callback
│   └── upload-pdf/route.ts    # POST /api/kakao/upload-pdf
├── rag/
│   └── query/route.ts         # POST /api/rag/query
├── commission/
│   └── query/route.ts         # POST /api/commission/query
├── admin/
│   ├── users/
│   │   ├── route.ts           # GET/POST /api/admin/users
│   │   └── [id]/route.ts      # GET/PATCH/DELETE /api/admin/users/:id
│   ├── codes/
│   │   ├── route.ts           # GET/POST /api/admin/codes
│   │   └── generate/route.ts  # POST /api/admin/codes/generate
│   ├── logs/
│   │   └── route.ts           # GET /api/admin/logs
│   └── analytics/
│       └── route.ts           # GET /api/admin/analytics
└── auth/
    └── callback/route.ts      # GET /api/auth/callback (Supabase)
```

### 1. KakaoTalk Chat API

```typescript
// app/api/kakao/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getTextFromGPT } from '@/lib/services/chat.service';
import { logQuery } from '@/lib/services/analytics.service';

export const runtime = 'nodejs';
export const maxDuration = 30; // 30초 제한

interface KakaoRequest {
  user_message: string;
  user_id?: string;
  session_id?: string;
}

interface KakaoResponse {
  version: string;
  template: {
    outputs: Array<{ simpleText: { text: string } }>;
    quickReplies: any[];
  };
}

export async function POST(request: NextRequest) {
  try {
    const startTime = Date.now();
    const data: KakaoRequest = await request.json();

    const userMessage = data.user_message || '';
    const userId = data.user_id;
    const sessionId = data.session_id || `session_${Date.now()}`;

    console.log(`[KakaoTalk] User: ${userId}, Message: ${userMessage}`);

    // 타임아웃 처리 (KakaoTalk 5초 제한)
    const timeoutPromise = new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), 4500)
    );

    let response: string;

    try {
      response = await Promise.race([
        getTextFromGPT(userMessage),
        timeoutPromise
      ]);
    } catch (error) {
      // 타임아웃 시 빠른 응답 반환
      console.log('[KakaoTalk] Timeout - 빠른 응답 반환');

      return NextResponse.json({
        version: '2.0',
        template: {
          outputs: [{
            simpleText: {
              text: '아직 생각이 끝나지 않았어요.🙍‍♂️\n잠시 후 아래 버튼을 눌러주세요👆'
            }
          }],
          quickReplies: [{
            action: 'message',
            label: '생각 다 끝났나요?🙋‍♂️',
            messageText: '생각 다 끝났나요?'
          }]
        }
      });
    }

    const responseTime = Date.now() - startTime;

    // 로그 기록 (Supabase)
    await logQuery({
      userId,
      kakaoUserId: userId,
      sessionId,
      queryText: userMessage,
      responseText: response,
      responseTime,
    });

    console.log(`[KakaoTalk] 응답 시간: ${responseTime}ms`);

    return NextResponse.json({
      version: '2.0',
      template: {
        outputs: [{ simpleText: { text: response } }],
        quickReplies: []
      }
    });

  } catch (error) {
    console.error('[KakaoTalk] 오류:', error);

    return NextResponse.json({
      version: '2.0',
      template: {
        outputs: [{
          simpleText: {
            text: '죄송합니다. 일시적인 오류가 발생했습니다. 다시 시도해주세요.'
          }
        }],
        quickReplies: []
      }
    });
  }
}

// 헬스 체크
export async function GET() {
  return NextResponse.json({ status: 'ok', service: 'kakao-chat' });
}
```

### 2. Admin Users API

```typescript
// app/api/admin/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 관리자 권한 확인
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 쿼리 파라미터
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const role = searchParams.get('role');
    const tier = searchParams.get('tier');

    // 사용자 목록 조회
    let query = supabase
      .from('profiles')
      .select('*', { count: 'exact' });

    if (role) query = query.eq('role', role);
    if (tier) query = query.eq('subscription_tier', tier);

    const { data, error, count } = await query
      .range((page - 1) * limit, page * limit - 1)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      users: data,
      total: count,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    });

  } catch (error) {
    console.error('[Admin Users] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // 사용자 생성 로직
  // ...
}
```

### 3. Admin Logs API

```typescript
// app/api/admin/logs/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // 인증 및 권한 확인
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 쿼리 파라미터
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const queryType = searchParams.get('type');
    const userId = searchParams.get('user_id');

    // 로그 조회
    let query = supabase
      .from('query_logs')
      .select('*', { count: 'exact' });

    if (queryType) query = query.eq('query_type', queryType);
    if (userId) query = query.eq('user_id', userId);

    const { data, error, count } = await query
      .range((page - 1) * limit, page * limit - 1)
      .order('timestamp', { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      logs: data,
      total: count,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    });

  } catch (error) {
    console.error('[Admin Logs] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

## UI/UX 설계

### 디자인 시스템

#### 색상 팔레트

```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',  // 메인 브랜드 색상
          900: '#1e3a8a',
        },
        secondary: {
          50: '#fef2f2',
          500: '#ef4444',  // 액센트
          900: '#7f1d1d',
        },
      },
      fontFamily: {
        sans: ['var(--font-noto-sans-kr)', 'system-ui', 'sans-serif'],
      },
    },
  },
};
```

#### 타이포그래피

```typescript
// app/layout.tsx
import { Noto_Sans_KR } from 'next/font/google';

const notoSansKR = Noto_Sans_KR({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700', '900'],
  variable: '--font-noto-sans-kr',
  display: 'swap',
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={notoSansKR.variable}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
```

### 주요 컴포넌트

#### 1. 대시보드 레이아웃

```typescript
// components/layouts/dashboard-layout.tsx
'use client';

import { ReactNode } from 'react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';

export function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
```

#### 2. 사이드바

```typescript
// components/dashboard/sidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  FileText,
  BarChart3,
  Settings,
  KeyRound,
  MessageSquare,
} from 'lucide-react';

const navigation = [
  { name: '대시보드', href: '/dashboard', icon: LayoutDashboard },
  { name: '사용자', href: '/admin/users', icon: Users, adminOnly: true },
  { name: '인증 코드', href: '/admin/codes', icon: KeyRound, adminOnly: true },
  { name: '쿼리 로그', href: '/admin/logs', icon: FileText, adminOnly: true },
  { name: '분석', href: '/admin/analytics', icon: BarChart3, adminOnly: true },
  { name: '챗봇', href: '/chat', icon: MessageSquare },
  { name: '설정', href: '/dashboard/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="w-64 bg-white border-r border-gray-200">
      <div className="flex items-center justify-center h-16 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-primary-600">지사</h1>
      </div>
      <nav className="mt-6 px-3">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center px-3 py-2 mb-1 text-sm font-medium rounded-md',
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-700 hover:bg-gray-100'
              )}
            >
              <item.icon className="w-5 h-5 mr-3" />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
```

---

## 배포 전략

### 프로젝트 구조

```
jisa-app/
├── app/                           # Next.js 15 App Router
│   ├── api/                       # API Routes
│   │   ├── kakao/                 # KakaoTalk 웹훅
│   │   ├── rag/                   # RAG API
│   │   ├── commission/            # Commission API
│   │   └── admin/                 # Admin API
│   ├── dashboard/                 # 대시보드 UI
│   ├── admin/                     # 관리자 UI
│   ├── auth/                      # 인증 페이지
│   └── layout.tsx
├── lib/                           # TypeScript 서비스
│   ├── services/
│   │   ├── rag.service.ts
│   │   ├── chat.service.ts
│   │   ├── commission-detector.ts
│   │   ├── commission.service.ts
│   │   └── analytics.service.ts
│   ├── commission-system/         # Commission 쿼리 (기존 Node.js)
│   └── supabase/
│       ├── client.ts
│       └── server.ts
├── components/                    # React 컴포넌트
│   ├── ui/                        # Shadcn UI
│   └── dashboard/
├── public/
│   ├── metadata_key.json
│   └── pdf_urls.json
├── supabase/
│   └── migrations/                # DB 마이그레이션
├── .env.local
├── next.config.js
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

### 환경 변수

```bash
# .env.local

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# AI APIs
GEMINI_API_KEY=your_gemini_api_key
OPENAI_API_KEY=your_openai_api_key

# Pinecone
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX=hof-branch-chatbot

# App
NEXT_PUBLIC_APP_URL=https://jisa.vercel.app
```

### Vercel 배포

```json
// vercel.json
{
  "buildCommand": "pnpm build",
  "devCommand": "pnpm dev",
  "installCommand": "pnpm install",
  "framework": "nextjs",
  "regions": ["icn1"],
  "functions": {
    "app/api/**/*.ts": {
      "runtime": "nodejs20.x",
      "maxDuration": 30
    }
  }
}
```

### package.json

```json
{
  "name": "jisa-app",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@supabase/supabase-js": "^2.39.0",
    "@supabase/ssr": "^0.1.0",
    "@google/genai": "latest",
    "mime": "^4.0.0",
    "openai": "^4.77.0",
    "@pinecone-database/pinecone": "^3.0.0",
    "@radix-ui/react-dialog": "latest",
    "@radix-ui/react-dropdown-menu": "latest",
    "tailwindcss": "^3.4.0",
    "lucide-react": "^0.344.0",
    "zod": "^3.22.0",
    "zustand": "^4.5.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^19.0.0",
    "typescript": "^5.3.0"
  }
}
```

---

## 마이그레이션 로드맵

### Week 1: 기반 구축

#### Day 1-2: 프로젝트 초기화
- [ ] Next.js 15 프로젝트 생성
  ```bash
  npx create-next-app@latest jisa-app --typescript --tailwind --app --use-pnpm
  cd jisa-app
  ```
- [ ] 의존성 설치
  ```bash
  pnpm add @supabase/supabase-js @supabase/ssr
  pnpm add @google/generative-ai openai @pinecone-database/pinecone
  pnpm add @radix-ui/react-dialog @radix-ui/react-dropdown-menu
  pnpm add lucide-react zod zustand
  ```
- [ ] Shadcn UI 초기화
  ```bash
  npx shadcn@latest init
  ```

#### Day 3-5: 서비스 레이어 포팅
- [ ] `lib/services/rag.service.ts` 작성 (⚠️ `@google/genai` 사용)
- [ ] `lib/services/commission-detector.ts` 작성
- [ ] `lib/services/commission.service.ts` 작성
- [ ] `lib/services/chat.service.ts` 작성 (⚠️ `@google/genai` 사용)
- [ ] 테스트 스크립트 작성

#### Day 6-7: API Routes 구현
- [ ] `app/api/kakao/chat/route.ts`
- [ ] `app/api/kakao/callback/route.ts`
- [ ] `app/api/rag/query/route.ts`
- [ ] 로컬 테스트 (ngrok)

### Week 2: 데이터베이스 & 인증

#### Day 8-10: Supabase 설정
- [ ] Supabase 프로젝트 생성
- [ ] PostgreSQL 스키마 마이그레이션
- [ ] RLS 정책 설정
- [ ] Supabase 클라이언트 설정
- [ ] 인증 테스트

#### Day 11-14: 관리자 대시보드 기초
- [ ] 레이아웃 컴포넌트 (`DashboardLayout`, `Sidebar`, `Header`)
- [ ] 쿼리 로그 페이지 (`/admin/logs`)
- [ ] 사용자 목록 페이지 (`/admin/users`)
- [ ] 기본 분석 페이지 (`/admin/analytics`)

### Week 3: 통합 테스트 & 배포

#### Day 15-17: 기능 테스트
- [ ] KakaoTalk 웹훅 통합 테스트
- [ ] RAG 파이프라인 테스트
- [ ] Commission 시스템 테스트
- [ ] 관리자 대시보드 E2E 테스트

#### Day 18-21: 배포 & 최적화
- [ ] Vercel 프로젝트 연결
- [ ] 환경 변수 설정
- [ ] 프로덕션 배포
- [ ] 성능 최적화
- [ ] 모니터링 설정 (Vercel Analytics)
- [ ] 문서화

---

## 체크리스트

### ✅ Core Services (서비스 레이어)
- [ ] **RAG Service** (`lib/services/rag.service.ts`)
  - [ ] Query Enhancement (Gemini Flash)
  - [ ] Embedding Generation (OpenAI)
  - [ ] Pinecone Search
  - [ ] Context Formatting
  - [ ] PDF Attachment
  - [ ] Answer Generation (Gemini 2.5 Pro)

- [ ] **Commission Detector** (`lib/services/commission-detector.ts`)
  - [ ] Keyword matching
  - [ ] Confidence calculation
  - [ ] Reasoning generation

- [ ] **Commission Service** (`lib/services/commission.service.ts`)
  - [ ] Direct import (no subprocess)
  - [ ] Query execution
  - [ ] Result formatting

- [ ] **Chat Handler** (`lib/services/chat.service.ts`)
  - [ ] Commission detection
  - [ ] Routing logic
  - [ ] Error handling

### ✅ API Routes
- [ ] **KakaoTalk APIs**
  - [ ] POST `/api/kakao/chat`
  - [ ] POST `/api/kakao/callback`
  - [ ] POST `/api/kakao/upload-pdf`
  - [ ] GET `/` (health check)

- [ ] **Admin APIs**
  - [ ] GET `/api/admin/users`
  - [ ] GET `/api/admin/logs`
  - [ ] GET `/api/admin/analytics`
  - [ ] POST `/api/admin/codes/generate`

- [ ] **RAG API**
  - [ ] POST `/api/rag/query`

### ✅ Database (Supabase)
- [ ] **Schema Migration**
  - [ ] `profiles` 테이블
  - [ ] `query_logs` 테이블
  - [ ] `verification_codes` 테이블
  - [ ] `analytics_events` 테이블
  - [ ] `subscription_tiers` 테이블

- [ ] **RLS Policies**
  - [ ] 사용자 프로필 정책
  - [ ] 쿼리 로그 정책
  - [ ] 관리자 전용 정책

- [ ] **Indexes**
  - [ ] 성능 최적화 인덱스

### ✅ Authentication
- [ ] **Supabase Auth**
  - [ ] 이메일/비밀번호 로그인
  - [ ] 회원가입
  - [ ] 비밀번호 재설정

- [ ] **Admin Access**
  - [ ] 관리자 계정 생성
  - [ ] 권한 체계 구현
  - [ ] 보호된 라우트

### ✅ Dashboard UI
- [ ] **Layouts**
  - [ ] `DashboardLayout`
  - [ ] `Sidebar`
  - [ ] `Header`

- [ ] **Pages**
  - [ ] 대시보드 홈 (`/dashboard`)
  - [ ] 쿼리 로그 (`/admin/logs`)
  - [ ] 사용자 관리 (`/admin/users`)
  - [ ] 인증 코드 (`/admin/codes`)
  - [ ] 분석 (`/admin/analytics`)

- [ ] **Components**
  - [ ] Tables (Shadcn UI)
  - [ ] Forms (React Hook Form + Zod)
  - [ ] Charts (Recharts)
  - [ ] Modals
  - [ ] Badges, Buttons, Cards

### ✅ Testing
- [ ] **Unit Tests**
  - [ ] Service layer tests
  - [ ] Utility function tests

- [ ] **Integration Tests**
  - [ ] API route tests
  - [ ] Database tests

- [ ] **E2E Tests**
  - [ ] KakaoTalk webhook flow
  - [ ] Admin dashboard flow

### ✅ Deployment
- [ ] **Vercel**
  - [ ] 프로젝트 연결
  - [ ] 환경 변수 설정
  - [ ] 도메인 설정
  - [ ] Analytics 활성화

- [ ] **Monitoring**
  - [ ] Vercel Analytics
  - [ ] Supabase Logs
  - [ ] Error tracking

- [ ] **Documentation**
  - [ ] API 문서
  - [ ] 배포 가이드
  - [ ] 사용자 가이드

---

## 예상 비용

### 개발 단계 (무료)
- **Supabase**: Free 플랜
- **Vercel**: Hobby 플랜
- **Pinecone**: Starter 플랜
- **총계**: $0/월

### 프로덕션 (권장)
| 서비스 | 플랜 | 비용/월 |
|--------|------|---------|
| **Supabase** | Pro | $25 |
| **Vercel** | Pro | $20 |
| **Pinecone** | Standard | ~$70 |
| **총계** | | **~$115** |

---

## 다음 단계

### 즉시 시작 가능한 작업:

1. **프로젝트 초기화** 🚀
   ```bash
   npx create-next-app@latest jisa-app --typescript --tailwind --app --use-pnpm
   ```

2. **서비스 포팅 시작** ⚡
   - `lib/services/rag.service.ts` 작성

3. **Supabase 설정** 🗄️
   - 프로젝트 생성 및 마이그레이션

4. **API 라우트 구현** 🔌
   - `/api/kakao/chat/route.ts`

### 선택해주세요:
어떤 작업부터 시작하시겠습니까?

---

**문서 버전**: 1.0 (통합)
**최종 수정**: 2025-11-13
**상태**: ✅ 준비 완료 - 구현 대기 중
