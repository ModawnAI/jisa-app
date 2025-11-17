# 스키마 변경사항: 사용자당 과금 모델 구현

**작성일**: 2025-11-17
**상태**: 권장사항

---

## 개요

현재 스키마는 티어를 "구독 등급"으로 표현하고 있어 기능/가격 차이를 암시합니다.
실제 비즈니스 모델은 **모든 사용자 동일 가격 + 지식 접근 레벨 차이**입니다.

---

## 1. 컬럼 이름 변경 (권장)

### profiles 테이블

**현재**:
```sql
subscription_tier TEXT  -- "구독 티어"로 오해 가능
```

**권장**:
```sql
knowledge_access_level TEXT  -- 명확한 의미
-- 또는
content_tier TEXT           -- 짧은 대안
-- 또는 (기존 유지하되 주석 변경)
subscription_tier TEXT      -- 지식 접근 레벨 (free/basic/pro/enterprise)
```

### 마이그레이션 스크립트

```sql
-- 옵션 1: 컬럼 이름 변경
ALTER TABLE profiles
  RENAME COLUMN subscription_tier TO knowledge_access_level;

-- 옵션 2: 주석만 업데이트 (기존 코드 호환성 유지)
COMMENT ON COLUMN profiles.subscription_tier IS
  '지식 접근 레벨: free, basic, pro, enterprise. 요금은 모든 레벨 동일, 접근 가능한 콘텐츠만 차이';
```

**권장**: 옵션 2 (기존 코드와의 호환성 유지)

---

## 2. 청구 관련 테이블 추가

### company_subscriptions 테이블 (신규)

기업 단위 구독 관리:

```sql
CREATE TABLE IF NOT EXISTS public.company_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 기업 정보
  company_id UUID NOT NULL UNIQUE,
  company_name TEXT NOT NULL,

  -- 구독 상태
  subscription_status TEXT NOT NULL DEFAULT 'active'
    CHECK (subscription_status IN ('active', 'suspended', 'cancelled')),

  -- 가격 정보
  price_per_user_monthly INTEGER NOT NULL DEFAULT 30000,  -- ₩30,000/사용자/월
  currency TEXT DEFAULT 'KRW',

  -- 볼륨 할인
  volume_discount_percentage INTEGER DEFAULT 0,  -- 0-100

  -- 계약 정보
  contract_start_date DATE NOT NULL,
  contract_end_date DATE,  -- NULL = 무기한
  minimum_users INTEGER DEFAULT 5,

  -- 청구 정보
  billing_cycle TEXT DEFAULT 'monthly'
    CHECK (billing_cycle IN ('monthly', 'yearly')),
  billing_day INTEGER DEFAULT 1,  -- 매월 1일 청구
  payment_method TEXT,  -- 'invoice', 'card', 'transfer'

  -- 메타데이터
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_company_subscriptions_company ON company_subscriptions(company_id);
CREATE INDEX idx_company_subscriptions_status ON company_subscriptions(subscription_status);

-- RLS
ALTER TABLE company_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage company subscriptions"
  ON company_subscriptions
  FOR ALL
  USING (
    auth.jwt() ->> 'role' IN ('admin', 'ceo')
  );
```

### monthly_billing_records 테이블 (신규)

월별 청구 기록:

```sql
CREATE TABLE IF NOT EXISTS public.monthly_billing_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 연결
  company_id UUID NOT NULL REFERENCES company_subscriptions(company_id),

  -- 청구 기간
  billing_month DATE NOT NULL,  -- 2025-01-01 형식

  -- 사용자 수 집계
  total_users INTEGER NOT NULL,
  active_users INTEGER NOT NULL,  -- 실제 청구 대상

  -- 티어별 분포 (통계용)
  users_by_tier JSONB DEFAULT '{
    "free": 0,
    "basic": 0,
    "pro": 0,
    "enterprise": 0
  }',

  -- 금액 계산
  price_per_user INTEGER NOT NULL,
  subtotal INTEGER NOT NULL,  -- active_users × price_per_user
  discount_percentage INTEGER DEFAULT 0,
  discount_amount INTEGER DEFAULT 0,
  total_amount INTEGER NOT NULL,  -- subtotal - discount_amount

  -- 청구 상태
  billing_status TEXT DEFAULT 'pending'
    CHECK (billing_status IN ('pending', 'sent', 'paid', 'overdue', 'cancelled')),
  invoice_number TEXT UNIQUE,
  invoice_date DATE,
  payment_date DATE,

  -- 메타데이터
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_billing_records_company ON monthly_billing_records(company_id);
CREATE INDEX idx_billing_records_month ON monthly_billing_records(billing_month);
CREATE INDEX idx_billing_records_status ON monthly_billing_records(billing_status);

-- 유니크 제약: 회사당 월별 1개 청구서
CREATE UNIQUE INDEX idx_billing_unique_company_month
  ON monthly_billing_records(company_id, billing_month);

-- RLS
ALTER TABLE monthly_billing_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all billing records"
  ON monthly_billing_records
  FOR SELECT
  USING (
    auth.jwt() ->> 'role' IN ('admin', 'ceo')
  );
```

### user_activity_logs 테이블 (신규)

월별 활성 사용자 추적:

```sql
CREATE TABLE IF NOT EXISTS public.user_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 사용자 정보
  user_id UUID NOT NULL REFERENCES profiles(id),
  company_id UUID NOT NULL,

  -- 활동 기록
  activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
  query_count INTEGER DEFAULT 0,
  last_query_at TIMESTAMPTZ,

  -- 사용자 상태 (해당 시점)
  user_role TEXT NOT NULL,
  knowledge_tier TEXT NOT NULL,

  -- 메타데이터
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_user_activity_user ON user_activity_logs(user_id);
CREATE INDEX idx_user_activity_company_date ON user_activity_logs(company_id, activity_date);
CREATE INDEX idx_user_activity_date ON user_activity_logs(activity_date);

-- 유니크 제약: 사용자당 일별 1개 기록
CREATE UNIQUE INDEX idx_user_activity_unique
  ON user_activity_logs(user_id, activity_date);

-- RLS
ALTER TABLE user_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own activity"
  ON user_activity_logs
  FOR SELECT
  USING (
    auth.uid() = user_id
  );

CREATE POLICY "Admins can view all activity"
  ON user_activity_logs
  FOR SELECT
  USING (
    auth.jwt() ->> 'role' IN ('admin', 'ceo')
  );
```

---

## 3. profiles 테이블 업데이트

회사 연결 추가:

```sql
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES company_subscriptions(company_id),
  ADD COLUMN IF NOT EXISTS is_billable BOOLEAN DEFAULT true;

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_profiles_company ON profiles(company_id);

-- 주석
COMMENT ON COLUMN profiles.company_id IS '소속 기업 (B2B 모델)';
COMMENT ON COLUMN profiles.is_billable IS '청구 대상 여부 (퇴사자는 false)';
COMMENT ON COLUMN profiles.subscription_tier IS '지식 접근 레벨 (요금과 무관)';
```

---

## 4. 청구 자동화 함수

### 월별 활성 사용자 집계

```sql
CREATE OR REPLACE FUNCTION calculate_monthly_active_users(
  p_company_id UUID,
  p_month DATE
)
RETURNS TABLE(
  total_users INTEGER,
  active_users INTEGER,
  users_by_tier JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH user_stats AS (
    SELECT
      p.subscription_tier as tier,
      COUNT(*) as count,
      COUNT(*) FILTER (WHERE ual.user_id IS NOT NULL) as active_count
    FROM profiles p
    LEFT JOIN user_activity_logs ual
      ON p.id = ual.user_id
      AND ual.activity_date >= DATE_TRUNC('month', p_month)
      AND ual.activity_date < DATE_TRUNC('month', p_month) + INTERVAL '1 month'
    WHERE
      p.company_id = p_company_id
      AND p.is_billable = true
    GROUP BY p.subscription_tier
  )
  SELECT
    (SELECT SUM(count) FROM user_stats)::INTEGER,
    (SELECT SUM(active_count) FROM user_stats)::INTEGER,
    (
      SELECT jsonb_object_agg(tier, active_count)
      FROM user_stats
    );
END;
$$;
```

### 청구서 자동 생성

```sql
CREATE OR REPLACE FUNCTION generate_monthly_invoice(
  p_company_id UUID,
  p_month DATE
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_invoice_id UUID;
  v_subscription RECORD;
  v_stats RECORD;
  v_subtotal INTEGER;
  v_discount_amount INTEGER;
  v_total INTEGER;
BEGIN
  -- 구독 정보 조회
  SELECT * INTO v_subscription
  FROM company_subscriptions
  WHERE company_id = p_company_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Company subscription not found';
  END IF;

  -- 활성 사용자 집계
  SELECT * INTO v_stats
  FROM calculate_monthly_active_users(p_company_id, p_month);

  -- 금액 계산
  v_subtotal := v_stats.active_users * v_subscription.price_per_user_monthly;
  v_discount_amount := v_subtotal * v_subscription.volume_discount_percentage / 100;
  v_total := v_subtotal - v_discount_amount;

  -- 청구서 생성
  INSERT INTO monthly_billing_records (
    company_id,
    billing_month,
    total_users,
    active_users,
    users_by_tier,
    price_per_user,
    subtotal,
    discount_percentage,
    discount_amount,
    total_amount,
    invoice_number,
    invoice_date
  )
  VALUES (
    p_company_id,
    p_month,
    v_stats.total_users,
    v_stats.active_users,
    v_stats.users_by_tier,
    v_subscription.price_per_user_monthly,
    v_subtotal,
    v_subscription.volume_discount_percentage,
    v_discount_amount,
    v_total,
    'INV-' || TO_CHAR(p_month, 'YYYYMM') || '-' || LPAD(nextval('invoice_seq')::TEXT, 6, '0'),
    CURRENT_DATE
  )
  RETURNING id INTO v_invoice_id;

  RETURN v_invoice_id;
END;
$$;

-- 청구서 번호 시퀀스
CREATE SEQUENCE IF NOT EXISTS invoice_seq START 1;
```

---

## 5. 트리거 설정

### 사용자 활동 자동 기록

```sql
CREATE OR REPLACE FUNCTION log_user_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO user_activity_logs (
    user_id,
    company_id,
    activity_date,
    query_count,
    last_query_at,
    user_role,
    knowledge_tier
  )
  VALUES (
    NEW.user_id,
    (SELECT company_id FROM profiles WHERE id = NEW.user_id),
    CURRENT_DATE,
    1,
    NOW(),
    (SELECT role FROM profiles WHERE id = NEW.user_id),
    (SELECT subscription_tier FROM profiles WHERE id = NEW.user_id)
  )
  ON CONFLICT (user_id, activity_date)
  DO UPDATE SET
    query_count = user_activity_logs.query_count + 1,
    last_query_at = NOW();

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_log_user_activity
AFTER INSERT ON query_logs
FOR EACH ROW
EXECUTE FUNCTION log_user_activity();
```

---

## 6. 마이그레이션 순서

```sql
-- 1. 기존 데이터 백업
BEGIN;

-- 2. 새 테이블 생성
\i company_subscriptions.sql
\i monthly_billing_records.sql
\i user_activity_logs.sql

-- 3. profiles 테이블 업데이트
ALTER TABLE profiles
  ADD COLUMN company_id UUID,
  ADD COLUMN is_billable BOOLEAN DEFAULT true;

-- 4. 주석 업데이트
COMMENT ON COLUMN profiles.subscription_tier IS
  '지식 접근 레벨: free, basic, pro, enterprise. 요금은 모든 레벨 동일';

-- 5. 함수 및 트리거 생성
\i billing_functions.sql
\i activity_triggers.sql

-- 6. 기본 회사 데이터 생성 (예시)
INSERT INTO company_subscriptions (
  company_id,
  company_name,
  price_per_user_monthly,
  contract_start_date
)
VALUES (
  gen_random_uuid(),
  'JISA 보험 주식회사',
  30000,
  CURRENT_DATE
);

-- 7. 기존 사용자를 기본 회사에 연결
UPDATE profiles
SET company_id = (SELECT company_id FROM company_subscriptions LIMIT 1)
WHERE company_id IS NULL;

COMMIT;
```

---

## 7. API 엔드포인트 (신규 필요)

### 청구 관리

```
GET  /api/admin/billing/invoices          - 청구서 목록
GET  /api/admin/billing/invoices/:id      - 청구서 상세
POST /api/admin/billing/generate          - 월별 청구서 생성
PUT  /api/admin/billing/invoices/:id      - 청구서 상태 업데이트

GET  /api/admin/billing/stats              - 청구 통계
GET  /api/admin/billing/active-users       - 활성 사용자 현황
```

### 회사 관리

```
GET  /api/admin/companies                  - 회사 목록
GET  /api/admin/companies/:id              - 회사 상세
POST /api/admin/companies                  - 회사 등록
PUT  /api/admin/companies/:id              - 회사 정보 수정
```

---

## 8. 대시보드 위젯 (추가 필요)

### 관리자 대시보드

```typescript
// 청구 위젯
<BillingOverviewWidget>
  - 이번 달 청구 예상액
  - 활성 사용자 수
  - 티어별 분포
  - 지난 달 대비 변화
</BillingOverviewWidget>

// 사용자 활동 위젯
<UserActivityWidget>
  - 일별 활성 사용자 추이
  - 쿼리 수 추이
  - 비활성 사용자 알림
</UserActivityWidget>
```

---

## 9. 기존 코드 영향도

### 변경 불필요 (호환)

- `lib/services/rbac.service.ts` - subscription_tier 사용 그대로
- `lib/services/rbac-filter.service.ts` - 필터링 로직 동일
- `app/api/kakao/chat/route.ts` - 티어 할당 로직 동일

### 변경 필요

- UI 텍스트: "구독 티어" → "지식 접근 레벨" (완료)
- Analytics: 티어별 사용자 수 표시 시 설명 추가
- Documentation: 가격 모델 명시

---

## 10. 롤백 계획

문제 발생 시:

```sql
-- 1. 트리거 비활성화
DROP TRIGGER IF EXISTS trigger_log_user_activity ON query_logs;

-- 2. 새 테이블 제거
DROP TABLE IF EXISTS user_activity_logs CASCADE;
DROP TABLE IF EXISTS monthly_billing_records CASCADE;
DROP TABLE IF EXISTS company_subscriptions CASCADE;

-- 3. profiles 컬럼 제거
ALTER TABLE profiles
  DROP COLUMN IF EXISTS company_id,
  DROP COLUMN IF EXISTS is_billable;

-- 4. 주석 복원
COMMENT ON COLUMN profiles.subscription_tier IS 'Subscription tier';
```

---

## 11. 테스트 체크리스트

- [ ] 새 회사 등록 가능
- [ ] 사용자-회사 연결 정상
- [ ] 쿼리 실행 시 activity_log 자동 기록
- [ ] 월별 활성 사용자 집계 정확
- [ ] 청구서 생성 정상 작동
- [ ] 볼륨 할인 계산 정확
- [ ] 티어별 분포 통계 정확
- [ ] 기존 RBAC 필터링 정상 작동
- [ ] UI에서 "지식 접근 레벨" 표시 정상

---

## 문서 끝

**관련 문서**:
- [PRICING_MODEL.md](./PRICING_MODEL.md) - 가격 모델 상세
- [KAKAO_APP_FLOW_TRACKING.md](./KAKAO_APP_FLOW_TRACKING.md) - 앱 흐름
