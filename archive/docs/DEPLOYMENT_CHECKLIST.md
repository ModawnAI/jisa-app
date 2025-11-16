# JISA 배포 체크리스트

**프로젝트**: JISA App (KakaoTalk RAG Chatbot Platform)
**버전**: 1.0
**작성일**: 2025-11-13

---

## 🚀 빠른 배포 가이드

### 1단계: 사전 준비 (5분)
```bash
# 프로젝트 빌드 테스트
pnpm install
pnpm build
pnpm start  # 테스트 후 종료
```

### 2단계: Vercel 배포 (5분)
```bash
# Vercel CLI 설치
pnpm add -g vercel

# 로그인
vercel login

# 배포
vercel --prod
```

### 3단계: 환경 변수 설정 (10분)
```bash
# Vercel Dashboard 또는 CLI로 설정
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add GEMINI_API_KEY production
vercel env add OPENAI_API_KEY production
vercel env add PINECONE_API_KEY production
vercel env add PINECONE_INDEX production
vercel env add NEXT_PUBLIC_APP_URL production
```

### 4단계: 검증 (5분)
- [ ] 웹사이트 접속: https://jisa-app.vercel.app
- [ ] 로그인 테스트
- [ ] 대시보드 로드 확인
- [ ] KakaoTalk 웹훅 연결 (URL 업데이트 필요)

---

## 📋 상세 체크리스트

### Phase 1: 배포 전 준비

#### A. 코드 품질 검증 ✅

```bash
# 1. TypeScript 타입 체크
pnpm tsc --noEmit
```
- [ ] TypeScript 에러 없음
- [ ] 빌드 성공

```bash
# 2. ESLint 검사
pnpm lint
```
- [ ] ESLint 에러/경고 해결
- [ ] 코드 스타일 일관성 확인

```bash
# 3. 프로덕션 빌드 테스트
pnpm build
```
- [ ] 빌드 성공 (에러 없음)
- [ ] 번들 크기 확인 (<1MB 권장)
- [ ] 빌드 경고 검토

```bash
# 4. 로컬 프로덕션 테스트
pnpm start
```
- [ ] 로컬에서 프로덕션 모드 실행 확인
- [ ] 주요 페이지 접속 테스트
- [ ] API 엔드포인트 응답 확인

#### B. 환경 변수 검증 🔐

**필수 환경 변수 체크:**

```bash
# .env.local 파일 확인
cat .env.local
```

- [ ] `NEXT_PUBLIC_SUPABASE_URL` - Supabase 프로젝트 URL
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (⚠️ 중요)
- [ ] `GEMINI_API_KEY` - Google Gemini API key
- [ ] `OPENAI_API_KEY` - OpenAI API key (임베딩용)
- [ ] `PINECONE_API_KEY` - Pinecone API key
- [ ] `PINECONE_INDEX` - Pinecone 인덱스 이름
- [ ] `NEXT_PUBLIC_APP_URL` - 앱 URL (프로덕션: https://jisa-app.vercel.app)

**보안 체크:**
- [ ] API keys가 코드에 하드코딩되지 않음
- [ ] `.env.local` 파일이 `.gitignore`에 포함됨
- [ ] SERVICE_ROLE_KEY가 클라이언트 코드에 노출되지 않음

#### C. 데이터베이스 준비 🗄️

**Supabase 설정:**

```sql
-- 1. 마이그레이션 적용 확인
SELECT * FROM supabase_migrations.schema_migrations ORDER BY version DESC LIMIT 5;
```

- [ ] 모든 마이그레이션 적용됨
- [ ] profiles 테이블 존재
- [ ] query_logs 테이블 존재
- [ ] verification_codes 테이블 존재
- [ ] analytics_events 테이블 존재
- [ ] subscription_tiers 테이블 존재

**RLS 정책 확인:**

```sql
-- 2. RLS 활성화 확인
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = true;
```

- [ ] profiles RLS 활성화
- [ ] query_logs RLS 활성화
- [ ] verification_codes RLS 활성화
- [ ] analytics_events RLS 활성화

**인덱스 최적화:**

```sql
-- 3. 인덱스 확인
SELECT tablename, indexname FROM pg_indexes WHERE schemaname = 'public';
```

- [ ] `idx_profiles_role` 존재
- [ ] `idx_profiles_email` 존재
- [ ] `idx_query_logs_timestamp` 존재
- [ ] `idx_query_logs_user_id` 존재
- [ ] `idx_verification_codes_code` 존재

**테스트 데이터:**

- [ ] 관리자 계정 생성 (role='admin' or 'ceo')
- [ ] 테스트 액세스 코드 생성 (최소 1개)
- [ ] 샘플 쿼리 로그 존재 (대시보드 테스트용)

#### D. 외부 서비스 확인 🌐

**Pinecone:**
- [ ] Index 존재: `hof-branch-chatbot`
- [ ] Namespace: `hof-knowledge-base-max`
- [ ] 벡터 데이터 업로드 완료
- [ ] API 연결 테스트 성공

**Google Gemini:**
- [ ] API 키 유효
- [ ] Models 접근 가능:
  - `gemini-2.0-flash-exp` (쿼리 향상)
  - `gemini-2.5-pro-exp-0320` (답변 생성)
- [ ] API 사용량 확인

**OpenAI:**
- [ ] API 키 유효
- [ ] Model 접근 가능: `text-embedding-3-large`
- [ ] 크레딧 잔액 확인

---

### Phase 2: Vercel 배포

#### A. Vercel 프로젝트 설정 🚀

**Vercel CLI 배포:**

```bash
# 1. Vercel 로그인
vercel login

# 2. 프로젝트 연결 (최초 1회)
vercel

# 질문 답변:
# ? Set up and deploy? Yes
# ? Which scope? [Your Team/Personal]
# ? Link to existing project? No
# ? Project name? jisa-app
# ? Directory? ./
```

- [ ] Vercel 계정 로그인 완료
- [ ] 프로젝트 연결 완료
- [ ] Team/Scope 선택 완료

**프로덕션 배포:**

```bash
# 3. 프로덕션 배포
vercel --prod
```

- [ ] 배포 성공
- [ ] 배포 URL 확인: https://jisa-app.vercel.app (또는 생성된 URL)
- [ ] 배포 로그 확인 (에러 없음)

#### B. 환경 변수 설정 (Vercel) 🔐

**방법 1: Vercel CLI**

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL production
# 값 입력: https://your-project.supabase.co

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
# 값 입력: your_anon_key

vercel env add SUPABASE_SERVICE_ROLE_KEY production
# 값 입력: your_service_role_key

vercel env add GEMINI_API_KEY production
# 값 입력: your_gemini_key

vercel env add OPENAI_API_KEY production
# 값 입력: sk-your_openai_key

vercel env add PINECONE_API_KEY production
# 값 입력: your_pinecone_key

vercel env add PINECONE_INDEX production
# 값 입력: hof-branch-chatbot

vercel env add NEXT_PUBLIC_APP_URL production
# 값 입력: https://jisa-app.vercel.app
```

**방법 2: Vercel Dashboard**

1. https://vercel.com/[team]/jisa-app/settings/environment-variables 접속
2. 각 환경 변수 추가:
   - Environment: Production
   - Key: 변수명
   - Value: 값 입력

- [ ] 모든 환경 변수 설정 완료
- [ ] Preview 환경 변수도 설정 (선택)
- [ ] Development 환경 변수 설정 (선택)

**환경 변수 재배포:**

```bash
# 환경 변수 변경 후 재배포 필요
vercel --prod --force
```

- [ ] 환경 변수 적용을 위한 재배포 완료

#### C. 도메인 설정 (선택) 🌐

**커스텀 도메인 추가 (선택사항):**

```bash
# Vercel에 도메인 추가
vercel domains add jisa.yourdomain.com

# DNS 설정 필요:
# Type: CNAME
# Name: jisa
# Value: cname.vercel-dns.com
```

- [ ] 커스텀 도메인 추가 (선택)
- [ ] DNS 레코드 설정 (선택)
- [ ] SSL 인증서 발급 확인 (자동)
- [ ] 도메인 접속 테스트

---

### Phase 3: 배포 후 검증

#### A. 웹사이트 접근 확인 ✅

**기본 접근:**
- [ ] https://jisa-app.vercel.app 접속 성공
- [ ] 자동 리다이렉트 작동 (/ → /dashboard)
- [ ] 로딩 시간 확인 (<3초)

**보안 헤더 확인:**

```bash
# curl로 헤더 확인
curl -I https://jisa-app.vercel.app
```

- [ ] `Strict-Transport-Security` 존재
- [ ] `X-Frame-Options: SAMEORIGIN` 존재
- [ ] `X-Content-Type-Options: nosniff` 존재
- [ ] `X-XSS-Protection: 1; mode=block` 존재

#### B. 인증 시스템 테스트 🔐

**로그인 테스트:**

1. https://jisa-app.vercel.app/auth/login 접속
2. 관리자 계정으로 로그인
   - Email: admin@test.com
   - Password: Test1234!

- [ ] 로그인 페이지 로드
- [ ] 로그인 성공
- [ ] /dashboard로 리다이렉트
- [ ] 세션 유지 (새로고침 후에도 로그인 상태)

**회원가입 테스트:**

1. https://jisa-app.vercel.app/auth/register 접속
2. 유효한 액세스 코드로 회원가입
3. 프로필 생성 확인 (Supabase)

- [ ] 회원가입 페이지 로드
- [ ] 액세스 코드 검증 작동
- [ ] 회원가입 성공
- [ ] Profile 생성 확인 (role/tier 적용)
- [ ] 액세스 코드 사용 처리

**Route Protection 테스트:**

```bash
# 인증 없이 protected route 접근 시도
curl -I https://jisa-app.vercel.app/admin/users
```

- [ ] 비로그인 시 /auth/login으로 리다이렉트
- [ ] 관리자 아닌 사용자는 /admin 접근 불가
- [ ] 리다이렉트 URL 파라미터 작동

#### C. 대시보드 기능 테스트 📊

**대시보드 홈:**
- [ ] /dashboard 접속 성공
- [ ] 통계 카드 4개 표시
- [ ] 실시간 데이터 로드 (오늘의 쿼리, 활성 사용자 등)
- [ ] 변화율 표시 (day-over-day)
- [ ] 최근 쿼리 테이블 표시
- [ ] 쿼리 타입 차트 (Pie chart) 표시

**사용자 관리:**
- [ ] /admin/users 접속 성공
- [ ] 사용자 목록 표시
- [ ] 역할 배지 표시 (CEO, Admin, etc.)
- [ ] 티어 배지 표시 (Enterprise, Pro, etc.)
- [ ] 필터링 작동 (role, tier)
- [ ] 페이지네이션 작동

**쿼리 로그:**
- [ ] /admin/logs 접속 성공
- [ ] 로그 테이블 표시
- [ ] 검색 기능 작동
- [ ] 필터링 작동 (query_type)
- [ ] 상세 모달 열림
- [ ] 페이지네이션 작동

**액세스 코드 관리:**
- [ ] /admin/codes 접속 성공
- [ ] 코드 목록 표시
- [ ] 상태 배지 표시 (사용 가능, 만료, 사용 완료)
- [ ] /admin/codes/generate 접속
- [ ] 코드 생성 폼 작동
- [ ] 코드 생성 성공 (5개 생성 테스트)
- [ ] 생성된 코드 표시
- [ ] 복사 기능 작동

#### D. API 엔드포인트 테스트 🔌

**Health Check:**

```bash
curl https://jisa-app.vercel.app/api/kakao/chat
# Expected: { "status": "ok", "service": "kakao-chat" }
```

- [ ] Health check 응답 성공

**Dashboard Stats API:**

```bash
curl https://jisa-app.vercel.app/api/dashboard/stats \
  -H "Cookie: auth_token=..." # 인증 필요
```

- [ ] API 응답 성공
- [ ] 통계 데이터 반환

**Recent Queries API:**

```bash
curl https://jisa-app.vercel.app/api/dashboard/recent-queries?limit=10 \
  -H "Cookie: auth_token=..."
```

- [ ] API 응답 성공
- [ ] 쿼리 로그 반환
- [ ] 페이지네이션 작동

**Chart Data API:**

```bash
curl https://jisa-app.vercel.app/api/dashboard/chart-data?days=7 \
  -H "Cookie: auth_token=..."
```

- [ ] API 응답 성공
- [ ] 차트 데이터 반환
- [ ] queryTypeDistribution, queryTrends 포함

---

### Phase 4: KakaoTalk 통합 테스트

#### A. 웹훅 설정 💬

**KakaoTalk 스킬 서버 설정:**

1. KakaoTalk i Open Builder 접속
2. 스킬 서버 URL 업데이트:
   - URL: `https://jisa-app.vercel.app/api/kakao/chat`
   - 메서드: POST

- [ ] 스킬 서버 URL 업데이트 완료
- [ ] 연결 테스트 성공

**로컬 테스트 (선택 - ngrok):**

```bash
# 로컬 개발 서버 실행
pnpm dev

# ngrok으로 터널 생성
ngrok http 3000

# KakaoTalk 스킬 URL: https://your-ngrok-url.ngrok.io/api/kakao/chat
```

- [ ] ngrok 터널 생성 (선택)
- [ ] KakaoTalk 연결 테스트 (선택)

#### B. Commission Query 테스트 💰

**테스트 케이스 1: 수수료 문의**

KakaoTalk에서 메시지 전송:
```
한화생명 변액연금 10년납 수수료는?
```

**Expected Response:**
- 수수료 정보 포함 (%, 프로 등)
- Commission 시스템 사용 (로그 확인)
- 응답 시간 < 5초

- [ ] 메시지 전송 성공
- [ ] 수수료 정보 응답
- [ ] 응답 시간 적절
- [ ] 로그 DB 저장 확인 (query_type='commission')

**테스트 케이스 2: 복잡한 수수료 문의**

```
KB생명 종신보험 5년납 수수료와 삼성생명 비교해줘
```

- [ ] 메시지 전송 성공
- [ ] 비교 정보 응답
- [ ] Commission 감지 (confidence >= 0.5)

#### C. RAG Query 테스트 📚

**테스트 케이스 3: 일반 문의**

```
종신보험이란 무엇인가요?
```

**Expected Response:**
- 종신보험 설명
- RAG 시스템 사용 (Pinecone + Gemini)
- PDF 첨부 가능

- [ ] 메시지 전송 성공
- [ ] 종신보험 설명 응답
- [ ] RAG 사용 확인 (query_type='rag')
- [ ] Pinecone 검색 실행 확인

**테스트 케이스 4: 복잡한 일반 문의**

```
변액연금과 변액보험의 차이점을 자세히 설명해주세요
```

- [ ] 메시지 전송 성공
- [ ] 상세 설명 응답
- [ ] 관련 문서 컨텍스트 포함

#### D. 타임아웃 처리 테스트 ⏱️

**테스트 케이스 5: 긴 처리 시간**

복잡한 쿼리로 4.5초 이상 걸리도록 유도:

```
한화생명, 삼성생명, KB생명 모든 변액연금 상품의 수수료를 비교 분석하고, 각 상품의 장단점과 추천 대상을 상세히 알려주세요. 추가로 세금 혜택과 해지환급금 정보도 포함해주세요.
```

**Expected Response:**
```
아직 생각이 끝나지 않았어요.🙍‍♂️
잠시 후 아래 버튼을 눌러주세요👆
```

**Quick Reply Button:**
```
생각 다 끝났나요?🙋‍♂️
```

- [ ] 타임아웃 응답 수신
- [ ] Quick reply 버튼 표시
- [ ] 버튼 클릭 시 재시도 가능

---

### Phase 5: 성능 & 모니터링

#### A. 성능 측정 ⚡

**Lighthouse 점수 (Chrome DevTools):**

```
1. Chrome에서 https://jisa-app.vercel.app 접속
2. F12 → Lighthouse → Generate report
```

**목표 점수:**
- [ ] Performance: >= 90
- [ ] Accessibility: >= 95
- [ ] Best Practices: >= 90
- [ ] SEO: >= 85

**로딩 시간:**
- [ ] FCP (First Contentful Paint): < 1.5초
- [ ] LCP (Largest Contentful Paint): < 2.5초
- [ ] TBT (Total Blocking Time): < 200ms
- [ ] CLS (Cumulative Layout Shift): < 0.1

**API 응답 시간:**

```bash
# 10회 평균 측정
for i in {1..10}; do
  time curl -s https://jisa-app.vercel.app/api/dashboard/stats \
    -H "Cookie: ..." > /dev/null
done
```

- [ ] 평균 응답 시간: < 1초
- [ ] 95th percentile: < 2초
- [ ] 최대 응답 시간: < 3초

#### B. 모니터링 설정 📊

**Vercel Analytics:**

1. Vercel Dashboard → jisa-app → Analytics
2. Analytics 활성화

- [ ] Vercel Analytics 활성화
- [ ] Real-time 방문자 확인
- [ ] 페이지 성능 모니터링 활성화

**Vercel Logs:**

1. Vercel Dashboard → jisa-app → Logs
2. 실시간 로그 확인

- [ ] Function logs 확인 가능
- [ ] 에러 로그 필터링 가능
- [ ] 로그 검색 기능 확인

**Supabase Monitoring:**

1. Supabase Dashboard → Database → Logs
2. API Logs 확인

- [ ] Database 로그 확인 가능
- [ ] API 요청 로그 확인
- [ ] 슬로우 쿼리 모니터링

**Error Tracking (선택 - Sentry):**

```bash
pnpm add @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

- [ ] Sentry 설정 (선택)
- [ ] Error capture 확인
- [ ] Source maps 업로드

#### C. 알림 설정 (선택) 🔔

**Vercel Deployment 알림:**

1. Vercel Dashboard → Settings → Notifications
2. Deployment 알림 활성화

- [ ] 배포 성공 알림
- [ ] 배포 실패 알림
- [ ] Production 배포 알림

**Uptime Monitoring (선택):**

무료 서비스: UptimeRobot, Pingdom, etc.

- [ ] Uptime 모니터링 설정 (선택)
- [ ] 다운타임 알림 설정 (이메일/Slack)

---

### Phase 6: 프로덕션 준비 완료

#### A. 문서화 📝

**README.md 업데이트:**
- [ ] 배포 URL 추가
- [ ] 환경 변수 리스트
- [ ] 시작 가이드
- [ ] 기여 가이드

**API 문서:**
- [ ] API 엔드포인트 목록
- [ ] 요청/응답 예제
- [ ] 인증 방법
- [ ] 에러 코드

**운영 문서:**
- [ ] 배포 가이드 (이 파일)
- [ ] 트러블슈팅 가이드
- [ ] 긴급 연락망
- [ ] 롤백 절차

#### B. 백업 계획 💾

**데이터베이스 백업:**

1. Supabase Dashboard → Database → Backups
2. 자동 백업 활성화 (기본 활성화됨)

- [ ] 자동 백업 활성화 확인
- [ ] 백업 스케줄 확인 (일일)
- [ ] 백업 보관 기간 확인 (7-30일)

**수동 백업 (선택):**

```sql
-- pg_dump 명령어 (Supabase CLI 필요)
supabase db dump > backup_$(date +%Y%m%d).sql
```

- [ ] 수동 백업 절차 문서화
- [ ] 백업 복원 테스트 (선택)

#### C. 보안 체크 최종 ✅

**API Key 보안:**
- [ ] 모든 API keys가 환경 변수로 관리됨
- [ ] SERVICE_ROLE_KEY가 클라이언트에 노출되지 않음
- [ ] `.env.local` 파일이 Git에 커밋되지 않음
- [ ] `.env.production.example` 파일만 Git에 포함됨

**CORS 설정:**
- [ ] API 엔드포인트 CORS 설정 확인
- [ ] 필요한 origin만 허용 (프로덕션 URL)

**RLS (Row Level Security):**
- [ ] 모든 테이블에 RLS 활성화
- [ ] 정책 테스트 완료 (unauthorized access 차단)
- [ ] Admin 권한 테스트 완료

#### D. 사용자 교육 (선택) 👥

**관리자 교육:**
- [ ] 대시보드 사용법
- [ ] 액세스 코드 생성 방법
- [ ] 사용자 관리 방법
- [ ] 로그 분석 방법

**사용자 가이드:**
- [ ] KakaoTalk 챗봇 사용법
- [ ] 회원가입 절차
- [ ] 액세스 코드 사용 방법

---

## 🎉 배포 완료!

### 최종 확인 사항

- [ ] ✅ 모든 체크리스트 항목 완료
- [ ] ✅ 프로덕션 URL 접속 가능: https://jisa-app.vercel.app
- [ ] ✅ KakaoTalk 웹훅 연결 완료
- [ ] ✅ 관리자 계정 로그인 성공
- [ ] ✅ 대시보드 모든 기능 작동
- [ ] ✅ 모니터링 활성화
- [ ] ✅ 문서화 완료

### 배포 정보 기록

**배포일**: ___________ (YYYY-MM-DD)
**배포 URL**: https://jisa-app.vercel.app
**Vercel 프로젝트 ID**: ___________
**배포 담당자**: ___________
**Vercel Team**: ___________

### Next Steps (배포 후)

#### 24시간 이내:
- [ ] 실시간 모니터링 (에러율, 응답 시간)
- [ ] 사용자 피드백 수집
- [ ] 로그 분석

#### 1주일 이내:
- [ ] 성능 트렌드 분석
- [ ] 비용 분석 (API 사용량)
- [ ] 개선 사항 도출

#### 1개월 이내:
- [ ] 사용자 행동 분석
- [ ] 기능 최적화
- [ ] 추가 기능 계획

---

## 🚨 트러블슈팅

### 일반적인 문제

#### 1. 배포 실패

**증상**: `vercel --prod` 실패
**해결**:
```bash
# 빌드 로그 확인
vercel logs

# 로컬 빌드 테스트
pnpm build

# 환경 변수 확인
vercel env ls
```

#### 2. 환경 변수 적용 안 됨

**증상**: API 호출 실패, undefined 에러
**해결**:
```bash
# 환경 변수 재설정
vercel env add VARIABLE_NAME production

# 강제 재배포
vercel --prod --force
```

#### 3. Database 연결 실패

**증상**: Supabase 연결 에러
**해결**:
- Supabase 프로젝트 상태 확인
- SUPABASE_URL, ANON_KEY 확인
- RLS 정책 확인

#### 4. KakaoTalk 웹훅 응답 없음

**증상**: 챗봇이 응답하지 않음
**해결**:
- 스킬 서버 URL 확인
- API 엔드포인트 health check
- Vercel Function logs 확인

### 긴급 연락망

**1차 담당자**: [이름] - [전화번호] - [이메일]
**2차 담당자**: [이름] - [전화번호] - [이메일]
**Vercel Support**: support@vercel.com
**Supabase Support**: support@supabase.io

### 롤백 절차

```bash
# Vercel 즉시 롤백
vercel rollback

# 또는 Vercel Dashboard:
# https://vercel.com/[team]/jisa-app/deployments
# → 이전 배포 선택 → "Promote to Production"
```

---

**체크리스트 버전**: 1.0
**최종 수정**: 2025-11-13
**작성자**: JISA Development Team
