# Phase 4: 테스트 & 배포 가이드

**문서 버전**: 1.0
**작성일**: 2025-11-13
**대상**: JISA 프로젝트 배포 준비

---

## 📋 목차

1. [테스트 전략](#테스트-전략)
2. [통합 테스트](#통합-테스트)
3. [E2E 테스트](#e2e-테스트)
4. [배포 준비](#배포-준비)
5. [Vercel 배포](#vercel-배포)
6. [성능 최적화](#성능-최적화)
7. [모니터링 설정](#모니터링-설정)
8. [프로덕션 체크리스트](#프로덕션-체크리스트)

---

## 테스트 전략

### 테스트 피라미드

```
         ┌─────────────────┐
         │   E2E Tests     │  ← 10% (Critical user flows)
         │   (Playwright)  │
         ├─────────────────┤
         │ Integration     │  ← 30% (API routes, DB)
         │    Tests        │
         ├─────────────────┤
         │  Unit Tests     │  ← 60% (Services, Utils)
         │   (Vitest)      │
         └─────────────────┘
```

### 테스트 우선순위

#### 🔴 Critical (P0) - 반드시 테스트
- KakaoTalk 웹훅 → RAG/Commission 응답 흐름
- 인증 (로그인/회원가입/액세스 코드)
- 관리자 대시보드 핵심 기능

#### 🟡 Important (P1) - 중요
- API 엔드포인트 전체
- 데이터베이스 쿼리
- 미들웨어 (route protection)

#### 🟢 Nice to Have (P2) - 선택
- UI 컴포넌트 단위 테스트
- 유틸리티 함수 테스트
- 성능 벤치마크

---

## 통합 테스트

### 1. KakaoTalk Webhook Flow

#### Test Case 1: Commission Query (수수료 문의)

**Given**: 사용자가 수수료 관련 질문 전송
**When**: POST /api/kakao/chat 호출
**Then**:
- Commission 감지 (confidence >= 0.5)
- Commission 시스템 응답 반환
- 쿼리 로그 DB 저장
- 응답 시간 < 5초

```typescript
// tests/integration/kakao-commission.test.ts
import { describe, it, expect } from 'vitest';

describe('KakaoTalk Commission Flow', () => {
  it('should detect and respond to commission query', async () => {
    const response = await fetch('http://localhost:3000/api/kakao/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_message: '한화생명 변액연금 10년납 수수료 얼마야?',
        user_id: 'test_user_123',
        session_id: 'test_session_456'
      })
    });

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.version).toBe('2.0');
    expect(data.template.outputs).toHaveLength(1);
    expect(data.template.outputs[0].simpleText.text).toContain('%');

    // Verify log was saved
    // ... check database
  }, 30000); // 30초 타임아웃
});
```

#### Test Case 2: RAG Query (일반 문의)

**Given**: 사용자가 보험 상품 관련 질문 전송
**When**: POST /api/kakao/chat 호출
**Then**:
- Commission 미감지 (confidence < 0.5)
- RAG 시스템 응답 반환
- Pinecone 검색 실행
- Gemini 답변 생성

```typescript
// tests/integration/kakao-rag.test.ts
describe('KakaoTalk RAG Flow', () => {
  it('should use RAG system for general queries', async () => {
    const response = await fetch('http://localhost:3000/api/kakao/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_message: '종신보험이란 무엇인가요?',
        user_id: 'test_user_123'
      })
    });

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.template.outputs[0].simpleText.text).toBeTruthy();
    expect(data.template.outputs[0].simpleText.text.length).toBeGreaterThan(50);
  }, 30000);
});
```

#### Test Case 3: Timeout Handling

**Given**: 쿼리 처리가 5초 초과
**When**: POST /api/kakao/chat 호출
**Then**:
- 4.5초 타임아웃 발생
- "생각이 끝나지 않았어요" 응답
- Quick reply 버튼 포함

```typescript
describe('KakaoTalk Timeout Handling', () => {
  it('should return timeout response if processing exceeds 4.5s', async () => {
    // Mock slow response
    const response = await fetch('http://localhost:3000/api/kakao/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_message: 'very complex query that takes long time...',
        user_id: 'test_user_123'
      })
    });

    const data = await response.json();

    if (data.template.outputs[0].simpleText.text.includes('생각이 끝나지')) {
      expect(data.template.quickReplies).toHaveLength(1);
      expect(data.template.quickReplies[0].label).toContain('생각 다 끝났나요');
    }
  }, 10000);
});
```

### 2. Authentication Flow

#### Test Case 4: User Registration with Access Code

**Given**: 새 사용자가 유효한 액세스 코드로 가입
**When**: 회원가입 프로세스 실행
**Then**:
1. 액세스 코드 검증 성공
2. Supabase Auth 사용자 생성
3. Profile 생성 (코드의 role/tier 적용)
4. 액세스 코드 사용 처리
5. 로그인 페이지로 리다이렉트

```typescript
// tests/integration/auth-registration.test.ts
describe('User Registration Flow', () => {
  it('should complete full registration with valid access code', async () => {
    // Step 1: Verify code
    const verifyResponse = await fetch('/api/auth/verify-code', {
      method: 'POST',
      body: JSON.stringify({ code: 'ABC-DEF-GHI-JKL' })
    });

    expect(verifyResponse.status).toBe(200);
    const { role, tier } = await verifyResponse.json();

    // Step 2: Register user (would use Supabase client in real test)
    // ...

    // Step 3: Mark code as used
    const useResponse = await fetch('/api/auth/use-code', {
      method: 'POST',
      body: JSON.stringify({
        code: 'ABC-DEF-GHI-JKL',
        userId: 'new_user_id'
      })
    });

    expect(useResponse.status).toBe(200);
  });
});
```

### 3. Admin API Tests

#### Test Case 5: Dashboard Stats API

```typescript
describe('Dashboard Stats API', () => {
  it('should return today stats with day-over-day comparison', async () => {
    const response = await fetch('/api/dashboard/stats', {
      headers: {
        'Cookie': 'auth_token=...' // Authenticated request
      }
    });

    const data = await response.json();

    expect(data).toHaveProperty('todayQueries');
    expect(data).toHaveProperty('queryChange');
    expect(data).toHaveProperty('activeUsers');
    expect(data).toHaveProperty('avgResponseTime');
    expect(data).toHaveProperty('successRate');

    expect(typeof data.todayQueries).toBe('number');
    expect(typeof data.queryChange).toBe('number');
  });
});
```

---

## E2E 테스트

### Playwright 설정

```bash
pnpm add -D @playwright/test
npx playwright install
```

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
});
```

### E2E Test Case 1: Admin Login & Dashboard

```typescript
// tests/e2e/admin-dashboard.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Admin Dashboard Flow', () => {
  test('should login and view dashboard stats', async ({ page }) => {
    // Navigate to login
    await page.goto('/auth/login');

    // Fill login form
    await page.fill('input[type="email"]', 'admin@test.com');
    await page.fill('input[type="password"]', 'Test1234!');

    // Submit
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL('/dashboard');

    // Verify dashboard loaded
    await expect(page.locator('h1')).toContainText('대시보드');

    // Verify stats cards are visible
    await expect(page.locator('text=오늘의 쿼리')).toBeVisible();
    await expect(page.locator('text=활성 사용자')).toBeVisible();
    await expect(page.locator('text=평균 응답 시간')).toBeVisible();
    await expect(page.locator('text=성공률')).toBeVisible();

    // Verify recent queries table
    await expect(page.locator('table')).toBeVisible();
  });
});
```

### E2E Test Case 2: Access Code Generation

```typescript
test.describe('Access Code Management', () => {
  test('should generate and view access codes', async ({ page }) => {
    // Login as admin
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'admin@test.com');
    await page.fill('input[type="password"]', 'Test1234!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');

    // Navigate to code generation
    await page.click('text=인증 코드');
    await page.waitForURL('/admin/codes');
    await page.click('text=코드 생성');
    await page.waitForURL('/admin/codes/generate');

    // Fill generation form
    await page.fill('input[name="count"]', '5');
    await page.selectOption('select[name="codeType"]', 'registration');
    await page.selectOption('select[name="role"]', 'user');
    await page.selectOption('select[name="tier"]', 'basic');
    await page.fill('input[name="expiresInDays"]', '30');
    await page.fill('input[name="maxUses"]', '1');

    // Submit
    await page.click('button[type="submit"]');

    // Wait for success message
    await expect(page.locator('text=5개의 코드가 성공적으로 생성되었습니다')).toBeVisible();

    // Verify codes are displayed
    const codeElements = await page.locator('code').count();
    expect(codeElements).toBe(5);

    // Test copy functionality
    await page.click('text=복사', { position: { x: 0, y: 0 } });
    // Note: Clipboard API testing requires special permissions
  });
});
```

### E2E Test Case 3: Query Logs Filtering

```typescript
test.describe('Query Logs Management', () => {
  test('should filter and view query logs', async ({ page }) => {
    // Login and navigate
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'admin@test.com');
    await page.fill('input[type="password"]', 'Test1234!');
    await page.click('button[type="submit"]');

    await page.click('text=쿼리 로그');
    await page.waitForURL('/admin/logs');

    // Verify logs table loaded
    await expect(page.locator('table')).toBeVisible();

    // Test search
    await page.fill('input[placeholder*="검색"]', '수수료');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000); // Wait for results

    // Verify filtered results
    const rows = await page.locator('tbody tr').count();
    expect(rows).toBeGreaterThan(0);

    // Test filter by type
    await page.selectOption('select[name="queryType"]', 'commission');
    await page.waitForTimeout(1000);

    // Click on a log to view details
    await page.click('tbody tr:first-child');

    // Verify modal opened
    await expect(page.locator('role=dialog')).toBeVisible();
    await expect(page.locator('text=쿼리 상세')).toBeVisible();
  });
});
```

---

## 배포 준비

### 환경 변수 검증

```typescript
// lib/env.ts - Environment validation
import { z } from 'zod';

const envSchema = z.object({
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // AI APIs
  GEMINI_API_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().startsWith('sk-'),

  // Pinecone
  PINECONE_API_KEY: z.string().min(1),
  PINECONE_INDEX: z.string().min(1),

  // App
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NODE_ENV: z.enum(['development', 'production', 'test']),
});

export function validateEnv() {
  try {
    envSchema.parse(process.env);
    console.log('✅ Environment variables validated');
  } catch (error) {
    console.error('❌ Invalid environment variables:', error);
    process.exit(1);
  }
}

// Call in app startup
if (process.env.NODE_ENV === 'production') {
  validateEnv();
}
```

### Vercel Configuration

```json
// vercel.json
{
  "buildCommand": "pnpm build",
  "devCommand": "pnpm dev",
  "installCommand": "pnpm install",
  "framework": "nextjs",
  "regions": ["icn1"],
  "functions": {
    "app/api/kakao/**/*.ts": {
      "runtime": "nodejs20.x",
      "maxDuration": 30,
      "memory": 1024
    },
    "app/api/admin/**/*.ts": {
      "runtime": "nodejs20.x",
      "maxDuration": 10,
      "memory": 512
    }
  },
  "rewrites": [
    {
      "source": "/api/kakao/:path*",
      "destination": "/api/kakao/:path*"
    }
  ],
  "headers": [
    {
      "source": "/api/:path*",
      "headers": [
        { "key": "Access-Control-Allow-Credentials", "value": "true" },
        { "key": "Access-Control-Allow-Origin", "value": "*" },
        { "key": "Access-Control-Allow-Methods", "value": "GET,POST,PUT,DELETE,OPTIONS" },
        { "key": "Access-Control-Allow-Headers", "value": "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version" }
      ]
    }
  ]
}
```

### Next.js Production Config

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Production optimizations
  swcMinify: true,

  // Image optimization
  images: {
    domains: ['your-supabase-project.supabase.co'],
    formats: ['image/avif', 'image/webp'],
  },

  // Environment variables (public)
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },

  // Headers for security
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          }
        ]
      }
    ];
  },

  // Redirects
  async redirects() {
    return [
      {
        source: '/',
        destination: '/dashboard',
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
```

---

## Vercel 배포

### 1. Vercel CLI 설치 및 로그인

```bash
pnpm add -g vercel
vercel login
```

### 2. 프로젝트 연결

```bash
# 프로젝트 루트에서
vercel

# 질문에 답변:
# ? Set up and deploy "~/jisa-app"? [Y/n] y
# ? Which scope do you want to deploy to? [Your Team]
# ? Link to existing project? [y/N] n
# ? What's your project's name? jisa-app
# ? In which directory is your code located? ./
```

### 3. 환경 변수 설정

```bash
# Production 환경 변수 설정
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add GEMINI_API_KEY production
vercel env add OPENAI_API_KEY production
vercel env add PINECONE_API_KEY production
vercel env add PINECONE_INDEX production
vercel env add NEXT_PUBLIC_APP_URL production

# Preview 환경 변수 (동일하게 설정)
# ...
```

### 4. 배포 실행

```bash
# Production 배포
vercel --prod

# 배포 확인
# ✅ Production: https://jisa-app.vercel.app [복사하여 테스트]
```

### 5. 도메인 설정 (선택사항)

```bash
# 커스텀 도메인 추가
vercel domains add jisa.yourdomain.com

# DNS 레코드 설정 필요:
# CNAME: jisa -> cname.vercel-dns.com
```

---

## 성능 최적화

### 1. 번들 분석

```bash
# Bundle analyzer 설치
pnpm add -D @next/bundle-analyzer

# next.config.js 수정
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer(nextConfig);

# 분석 실행
ANALYZE=true pnpm build
```

### 2. 이미지 최적화

```typescript
// components/optimized-image.tsx
import Image from 'next/image';

export function OptimizedImage({ src, alt, ...props }) {
  return (
    <Image
      src={src}
      alt={alt}
      quality={75}
      placeholder="blur"
      loading="lazy"
      {...props}
    />
  );
}
```

### 3. API Route 캐싱

```typescript
// app/api/dashboard/stats/route.ts
export const revalidate = 60; // 60초 캐시

export async function GET(request: NextRequest) {
  // ... 기존 코드
}
```

### 4. Database Query 최적화

```typescript
// 인덱스 추가 확인
// supabase/migrations/add_performance_indexes.sql

-- Query logs timestamp 인덱스 (이미 존재)
CREATE INDEX IF NOT EXISTS idx_query_logs_timestamp
  ON query_logs(timestamp DESC);

-- Composite 인덱스 for filtering
CREATE INDEX IF NOT EXISTS idx_query_logs_user_type_timestamp
  ON query_logs(user_id, query_type, timestamp DESC);

-- Profiles role 인덱스 (이미 존재)
CREATE INDEX IF NOT EXISTS idx_profiles_role
  ON profiles(role);
```

### 5. React Component 최적화

```typescript
// Use React.memo for expensive components
import { memo } from 'react';

export const QueryTypeChart = memo(function QueryTypeChart() {
  // ... 기존 코드
});

// Use useMemo for expensive calculations
import { useMemo } from 'react';

const processedData = useMemo(() => {
  return data.map(item => ({
    ...item,
    percentage: calculatePercentage(item.value, total)
  }));
}, [data, total]);
```

---

## 모니터링 설정

### 1. Vercel Analytics

```bash
# Vercel Dashboard에서 활성화
# https://vercel.com/[your-team]/jisa-app/analytics
```

```typescript
// app/layout.tsx - Analytics 추가
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

### 2. Error Tracking (Sentry)

```bash
pnpm add @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV,
});
```

### 3. Supabase Logs Monitoring

```sql
-- Create logging function
CREATE OR REPLACE FUNCTION log_slow_queries()
RETURNS trigger AS $$
BEGIN
  IF NEW.response_time > 5000 THEN
    INSERT INTO slow_query_alerts (query_id, response_time, query_text)
    VALUES (NEW.id, NEW.response_time, NEW.query_text);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER slow_query_trigger
  AFTER INSERT ON query_logs
  FOR EACH ROW
  EXECUTE FUNCTION log_slow_queries();
```

### 4. Custom Monitoring Dashboard

```typescript
// app/admin/monitoring/page.tsx
export default function MonitoringPage() {
  return (
    <DashboardLayout>
      <h1>시스템 모니터링</h1>

      {/* API Health */}
      <section>
        <h2>API 상태</h2>
        <HealthCheck endpoint="/api/kakao/chat" />
        <HealthCheck endpoint="/api/admin/users" />
      </section>

      {/* Performance Metrics */}
      <section>
        <h2>성능 지표</h2>
        <MetricCard title="평균 응답 시간" value="2.3s" />
        <MetricCard title="에러율" value="0.1%" />
        <MetricCard title="업타임" value="99.9%" />
      </section>

      {/* Recent Errors */}
      <section>
        <h2>최근 에러</h2>
        <ErrorLogTable />
      </section>
    </DashboardLayout>
  );
}
```

---

## 프로덕션 체크리스트

### 배포 전 확인사항

#### ✅ 코드 품질
- [ ] TypeScript 에러 없음 (`pnpm tsc --noEmit`)
- [ ] ESLint 에러 없음 (`pnpm lint`)
- [ ] 빌드 성공 (`pnpm build`)
- [ ] 모든 critical 테스트 통과

#### ✅ 보안
- [ ] 환경 변수 모두 설정됨
- [ ] API keys가 코드에 하드코딩되지 않음
- [ ] RLS 정책 모두 활성화됨
- [ ] CORS 설정 확인
- [ ] Rate limiting 설정 (선택)
- [ ] Security headers 설정됨

#### ✅ 데이터베이스
- [ ] 모든 마이그레이션 적용됨
- [ ] 인덱스 최적화 완료
- [ ] 백업 전략 수립
- [ ] RLS 정책 테스트 완료

#### ✅ 성능
- [ ] 이미지 최적화 완료
- [ ] 번들 크기 확인 (< 1MB)
- [ ] API 응답 시간 확인 (< 3초)
- [ ] Lighthouse 점수 확인 (>90)

#### ✅ 모니터링
- [ ] Vercel Analytics 활성화
- [ ] Error tracking 설정 (Sentry)
- [ ] 로그 수집 설정
- [ ] Alert 설정 (선택)

#### ✅ 문서화
- [ ] API 문서 작성
- [ ] 배포 가이드 작성
- [ ] 환경 변수 문서화
- [ ] 트러블슈팅 가이드

#### ✅ 통합 테스트
- [ ] KakaoTalk 웹훅 테스트 (ngrok)
- [ ] 관리자 대시보드 E2E 테스트
- [ ] 인증 흐름 테스트
- [ ] 액세스 코드 생성/사용 테스트

### KakaoTalk Webhook 설정

```bash
# 1. ngrok으로 로컬 테스트
ngrok http 3000

# 2. KakaoTalk 스킬 설정
# URL: https://your-ngrok-url.ngrok.io/api/kakao/chat
# OR
# URL: https://jisa-app.vercel.app/api/kakao/chat (프로덕션)

# 3. 테스트 메시지 전송
# - "한화생명 변액연금 수수료" (Commission)
# - "종신보험이란?" (RAG)
# - 복잡한 쿼리 (Timeout 테스트)
```

### 배포 후 확인사항

#### ✅ 즉시 확인 (T+0)
- [ ] 웹사이트 접속 가능
- [ ] 로그인 작동
- [ ] 대시보드 로드
- [ ] API 엔드포인트 응답
- [ ] KakaoTalk 웹훅 작동

#### ✅ 24시간 모니터링 (T+1)
- [ ] 에러율 < 1%
- [ ] 평균 응답 시간 < 3초
- [ ] 메모리 사용량 정상
- [ ] 데이터베이스 연결 안정

#### ✅ 1주일 모니터링 (T+7)
- [ ] 사용자 피드백 수집
- [ ] 성능 트렌드 분석
- [ ] 비용 분석 (API 사용량)
- [ ] 개선 사항 도출

---

## 롤백 계획

### Vercel 롤백

```bash
# 이전 배포로 즉시 롤백
vercel rollback

# 특정 배포로 롤백
vercel rollback [deployment-url]

# Vercel Dashboard에서도 가능:
# https://vercel.com/[team]/jisa-app/deployments
# → 이전 배포 선택 → "Promote to Production"
```

### 데이터베이스 롤백

```sql
-- 마이그레이션 롤백 (Supabase)
-- supabase/migrations/에서 down 마이그레이션 실행

-- 또는 수동 롤백
BEGIN;
  -- 변경사항 되돌리기
  -- ...
ROLLBACK; -- 문제 발생 시
-- 또는
COMMIT; -- 확인 후
```

### 긴급 연락망

```
1차 담당자: [이름] - [전화번호]
2차 담당자: [이름] - [전화번호]
Vercel Support: support@vercel.com
Supabase Support: support@supabase.io
```

---

## 다음 단계

### 즉시 실행 가능:

1. **로컬 테스트 실행** 🧪
   ```bash
   pnpm dev
   # ngrok으로 KakaoTalk 테스트
   ngrok http 3000
   ```

2. **Vercel 배포** 🚀
   ```bash
   vercel
   vercel --prod
   ```

3. **모니터링 설정** 📊
   - Vercel Analytics 활성화
   - Sentry 설정 (선택)

4. **KakaoTalk 웹훅 연결** 💬
   - 프로덕션 URL 설정
   - 테스트 메시지 전송

---

**문서 버전**: 1.0
**최종 수정**: 2025-11-13
**작성자**: JISA Development Team
