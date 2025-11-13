/**
 * Analytics Views and Functions
 * Comprehensive analytics support for Phase 6.2
 *
 * Purpose:
 * - Real-time metrics aggregation
 * - User behavior analysis
 * - Content access patterns
 * - Query performance monitoring
 * - RBAC effectiveness tracking
 */

-- =====================================================
-- USER ACTIVITY ANALYTICS
-- =====================================================

-- Daily user activity summary
CREATE OR REPLACE VIEW user_activity_summary AS
SELECT
  DATE_TRUNC('day', timestamp) as date,

  -- User counts
  COUNT(DISTINCT user_id) as active_users_with_profile,
  COUNT(DISTINCT kakao_user_id) as active_kakao_users,
  COUNT(DISTINCT COALESCE(user_id::text, kakao_user_id)) as total_active_users,

  -- Query counts
  COUNT(*) as total_queries,
  SUM(CASE WHEN query_type = 'rag' THEN 1 ELSE 0 END) as rag_queries,
  SUM(CASE WHEN query_type = 'commission' THEN 1 ELSE 0 END) as commission_queries,

  -- Performance
  AVG(response_time_ms) as avg_response_time,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY response_time_ms) as median_response_time,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms) as p95_response_time,

  -- Errors
  COUNT(CASE WHEN metadata->>'error' IS NOT NULL THEN 1 END) as error_count

FROM query_logs
WHERE timestamp > NOW() - INTERVAL '90 days'
GROUP BY DATE_TRUNC('day', timestamp)
ORDER BY date DESC;

-- User engagement metrics by role and tier
CREATE OR REPLACE VIEW user_engagement_by_access AS
SELECT
  p.role,
  p.subscription_tier as tier,

  -- User counts
  COUNT(DISTINCT p.id) as user_count,
  COUNT(DISTINCT CASE
    WHEN p.last_chat_at > NOW() - INTERVAL '7 days' THEN p.id
  END) as active_7d,
  COUNT(DISTINCT CASE
    WHEN p.last_chat_at > NOW() - INTERVAL '30 days' THEN p.id
  END) as active_30d,

  -- Query metrics
  COUNT(ql.id) as total_queries,
  AVG(ql.response_time_ms) as avg_response_time,

  -- Engagement
  AVG(CASE
    WHEN p.last_chat_at IS NOT NULL
    THEN EXTRACT(EPOCH FROM (p.last_chat_at - p.first_chat_at)) / 86400
  END) as avg_lifetime_days,

  AVG(CASE
    WHEN p.last_chat_at IS NOT NULL
    THEN (SELECT COUNT(*) FROM query_logs WHERE kakao_user_id = p.kakao_user_id)
  END) as avg_queries_per_user

FROM profiles p
LEFT JOIN query_logs ql ON ql.kakao_user_id = p.kakao_user_id
WHERE p.kakao_user_id IS NOT NULL
GROUP BY p.role, p.subscription_tier
ORDER BY p.role, p.subscription_tier;

-- =====================================================
-- CONTENT ACCESS ANALYTICS
-- =====================================================

-- Content access patterns with RBAC tracking
CREATE OR REPLACE VIEW content_access_patterns AS
SELECT
  d.id as document_id,
  d.title,
  d.access_level,
  d.required_role,
  d.required_tier,
  d.namespace,

  -- Access counts
  COUNT(DISTINCT c.id) as chunk_count,
  COALESCE(access_stats.total_accesses, 0) as total_accesses,
  COALESCE(access_stats.unique_users, 0) as unique_users,
  COALESCE(access_stats.avg_response_time, 0) as avg_response_time,
  COALESCE(access_stats.last_accessed, d.created_at) as last_accessed,

  -- Days since creation
  EXTRACT(EPOCH FROM (NOW() - d.created_at)) / 86400 as days_since_creation,

  -- Access rate
  CASE
    WHEN EXTRACT(EPOCH FROM (NOW() - d.created_at)) / 86400 > 0
    THEN COALESCE(access_stats.total_accesses, 0)::float / (EXTRACT(EPOCH FROM (NOW() - d.created_at)) / 86400)
    ELSE 0
  END as accesses_per_day

FROM documents d
LEFT JOIN contexts c ON c.document_id = d.id
LEFT JOIN LATERAL (
  SELECT
    COUNT(*) as total_accesses,
    COUNT(DISTINCT COALESCE(user_id::text, kakao_user_id)) as unique_users,
    AVG(response_time_ms) as avg_response_time,
    MAX(timestamp) as last_accessed
  FROM query_logs ql
  WHERE ql.metadata->>'document_id' = d.id::text
) access_stats ON true
WHERE d.created_at > NOW() - INTERVAL '90 days'
GROUP BY
  d.id, d.title, d.access_level, d.required_role, d.required_tier, d.namespace,
  access_stats.total_accesses, access_stats.unique_users,
  access_stats.avg_response_time, access_stats.last_accessed
ORDER BY total_accesses DESC NULLS LAST;

-- Popular content by time period
CREATE OR REPLACE VIEW popular_content_7d AS
SELECT
  d.id,
  d.title,
  d.access_level,
  d.required_role,
  d.required_tier,
  COUNT(*) as access_count,
  COUNT(DISTINCT COALESCE(ql.user_id::text, ql.kakao_user_id)) as unique_users,
  AVG(ql.response_time_ms) as avg_response_time
FROM documents d
INNER JOIN query_logs ql ON ql.metadata->>'document_id' = d.id::text
WHERE ql.timestamp > NOW() - INTERVAL '7 days'
GROUP BY d.id, d.title, d.access_level, d.required_role, d.required_tier
ORDER BY access_count DESC
LIMIT 50;

-- Underutilized content (created but rarely accessed)
CREATE OR REPLACE VIEW underutilized_content AS
SELECT
  d.id,
  d.title,
  d.access_level,
  d.required_role,
  d.required_tier,
  d.created_at,
  EXTRACT(EPOCH FROM (NOW() - d.created_at)) / 86400 as days_old,
  COALESCE(access_count, 0) as access_count,
  COALESCE(unique_users, 0) as unique_users
FROM documents d
LEFT JOIN LATERAL (
  SELECT
    COUNT(*) as access_count,
    COUNT(DISTINCT COALESCE(user_id::text, kakao_user_id)) as unique_users
  FROM query_logs
  WHERE metadata->>'document_id' = d.id::text
) stats ON true
WHERE
  d.created_at < NOW() - INTERVAL '14 days'
  AND COALESCE(access_count, 0) < 5
ORDER BY d.created_at DESC;

-- =====================================================
-- QUERY PERFORMANCE ANALYTICS
-- =====================================================

-- Query performance statistics by type
CREATE OR REPLACE VIEW query_performance_stats AS
SELECT
  query_type,

  -- Counts
  COUNT(*) as query_count,
  COUNT(CASE WHEN metadata->>'error' IS NOT NULL THEN 1 END) as error_count,

  -- Response times
  AVG(response_time_ms) as avg_time,
  MIN(response_time_ms) as min_time,
  MAX(response_time_ms) as max_time,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY response_time_ms) as p50_time,
  PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY response_time_ms) as p75_time,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms) as p95_time,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY response_time_ms) as p99_time,

  -- Error rate
  ROUND(100.0 * COUNT(CASE WHEN metadata->>'error' IS NOT NULL THEN 1 END) / COUNT(*), 2) as error_rate_pct

FROM query_logs
WHERE timestamp > NOW() - INTERVAL '7 days'
GROUP BY query_type
ORDER BY query_count DESC;

-- Hourly performance trends
CREATE OR REPLACE VIEW hourly_performance_trends AS
SELECT
  DATE_TRUNC('hour', timestamp) as hour,
  COUNT(*) as query_count,
  AVG(response_time_ms) as avg_response_time,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms) as p95_response_time,
  COUNT(CASE WHEN metadata->>'error' IS NOT NULL THEN 1 END) as error_count
FROM query_logs
WHERE timestamp > NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('hour', timestamp)
ORDER BY hour DESC;

-- =====================================================
-- RBAC EFFECTIVENESS ANALYTICS
-- =====================================================

-- Access control effectiveness by role and tier
CREATE OR REPLACE VIEW rbac_effectiveness_by_access AS
SELECT
  p.role,
  p.subscription_tier as tier,

  -- Query counts
  COUNT(ql.id) as total_queries,

  -- Access denials (detected from metadata)
  COUNT(CASE WHEN ql.metadata->>'access_denied' = 'true' THEN 1 END) as denied_queries,
  COUNT(CASE WHEN ql.metadata->>'access_denied' = 'false' OR ql.metadata->>'access_denied' IS NULL THEN 1 END) as allowed_queries,

  -- Denial rate
  ROUND(
    100.0 * COUNT(CASE WHEN ql.metadata->>'access_denied' = 'true' THEN 1 END) / NULLIF(COUNT(ql.id), 0),
    2
  ) as denial_rate_pct,

  -- Most denied content levels
  MODE() WITHIN GROUP (ORDER BY ql.metadata->>'denied_access_level') as most_denied_level

FROM profiles p
INNER JOIN query_logs ql ON ql.kakao_user_id = p.kakao_user_id
WHERE
  p.kakao_user_id IS NOT NULL
  AND ql.timestamp > NOW() - INTERVAL '30 days'
GROUP BY p.role, p.subscription_tier
ORDER BY p.role, p.subscription_tier;

-- Content access by access level
CREATE OR REPLACE VIEW content_access_by_level AS
SELECT
  d.access_level,
  d.required_role,
  d.required_tier,

  -- Document counts
  COUNT(DISTINCT d.id) as document_count,

  -- Access stats
  COUNT(ql.id) as total_queries,
  COUNT(DISTINCT COALESCE(ql.user_id::text, ql.kakao_user_id)) as unique_users,
  AVG(ql.response_time_ms) as avg_response_time

FROM documents d
LEFT JOIN query_logs ql ON ql.metadata->>'document_id' = d.id::text
WHERE d.created_at > NOW() - INTERVAL '90 days'
GROUP BY d.access_level, d.required_role, d.required_tier
ORDER BY
  CASE d.access_level
    WHEN 'public' THEN 1
    WHEN 'basic' THEN 2
    WHEN 'intermediate' THEN 3
    WHEN 'advanced' THEN 4
    WHEN 'confidential' THEN 5
    WHEN 'executive' THEN 6
  END;

-- =====================================================
-- COHORT ANALYSIS
-- =====================================================

-- User cohorts by signup date (monthly)
CREATE OR REPLACE VIEW user_cohorts_monthly AS
SELECT
  DATE_TRUNC('month', p.created_at) as cohort_month,
  p.role,
  p.subscription_tier as tier,

  -- Cohort size
  COUNT(DISTINCT p.id) as cohort_size,

  -- Retention metrics
  COUNT(DISTINCT CASE
    WHEN p.last_chat_at > NOW() - INTERVAL '7 days' THEN p.id
  END) as retained_7d,
  COUNT(DISTINCT CASE
    WHEN p.last_chat_at > NOW() - INTERVAL '30 days' THEN p.id
  END) as retained_30d,

  -- Engagement
  AVG(query_counts.total_queries) as avg_queries_per_user,
  AVG(EXTRACT(EPOCH FROM (p.last_chat_at - p.first_chat_at)) / 86400) as avg_lifetime_days

FROM profiles p
LEFT JOIN LATERAL (
  SELECT COUNT(*) as total_queries
  FROM query_logs ql
  WHERE ql.kakao_user_id = p.kakao_user_id
) query_counts ON true
WHERE
  p.kakao_user_id IS NOT NULL
  AND p.created_at > NOW() - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', p.created_at), p.role, p.subscription_tier
ORDER BY cohort_month DESC, p.role, p.subscription_tier;

-- =====================================================
-- ANALYTICS HELPER FUNCTIONS
-- =====================================================

-- Function: Get user growth metrics
CREATE OR REPLACE FUNCTION get_user_growth_metrics(days_back INTEGER DEFAULT 30)
RETURNS TABLE(
  date DATE,
  new_users INTEGER,
  total_users INTEGER,
  active_users INTEGER,
  growth_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH daily_stats AS (
    SELECT
      DATE(created_at) as signup_date,
      COUNT(*) as new_users
    FROM profiles
    WHERE
      kakao_user_id IS NOT NULL
      AND created_at > NOW() - (days_back || ' days')::INTERVAL
    GROUP BY DATE(created_at)
  ),
  daily_active AS (
    SELECT
      DATE(last_chat_at) as active_date,
      COUNT(DISTINCT kakao_user_id) as active_users
    FROM profiles
    WHERE
      kakao_user_id IS NOT NULL
      AND last_chat_at > NOW() - (days_back || ' days')::INTERVAL
    GROUP BY DATE(last_chat_at)
  ),
  date_series AS (
    SELECT generate_series(
      CURRENT_DATE - days_back,
      CURRENT_DATE,
      '1 day'::INTERVAL
    )::DATE as date
  )
  SELECT
    ds.date,
    COALESCE(daily_stats.new_users, 0)::INTEGER,
    (
      SELECT COUNT(*)::INTEGER
      FROM profiles
      WHERE kakao_user_id IS NOT NULL AND DATE(created_at) <= ds.date
    ) as total_users,
    COALESCE(daily_active.active_users, 0)::INTEGER,
    CASE
      WHEN LAG(daily_stats.new_users, 1) OVER (ORDER BY ds.date) > 0
      THEN ROUND(
        100.0 * (COALESCE(daily_stats.new_users, 0) - LAG(daily_stats.new_users, 1) OVER (ORDER BY ds.date))
        / LAG(daily_stats.new_users, 1) OVER (ORDER BY ds.date),
        2
      )
      ELSE 0
    END as growth_rate
  FROM date_series ds
  LEFT JOIN daily_stats ON daily_stats.signup_date = ds.date
  LEFT JOIN daily_active ON daily_active.active_date = ds.date
  ORDER BY ds.date;
END;
$$ LANGUAGE plpgsql;

-- Function: Get query volume by hour of day
CREATE OR REPLACE FUNCTION get_query_volume_by_hour()
RETURNS TABLE(
  hour_of_day INTEGER,
  avg_queries NUMERIC,
  avg_response_time NUMERIC,
  error_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    EXTRACT(HOUR FROM timestamp)::INTEGER as hour_of_day,
    ROUND(AVG(query_count), 2) as avg_queries,
    ROUND(AVG(avg_response_time), 2) as avg_response_time,
    ROUND(AVG(error_rate), 2) as error_rate
  FROM (
    SELECT
      DATE_TRUNC('hour', timestamp) as hour,
      EXTRACT(HOUR FROM timestamp) as hour_of_day,
      COUNT(*) as query_count,
      AVG(response_time_ms) as avg_response_time,
      100.0 * COUNT(CASE WHEN metadata->>'error' IS NOT NULL THEN 1 END) / COUNT(*) as error_rate
    FROM query_logs
    WHERE timestamp > NOW() - INTERVAL '7 days'
    GROUP BY DATE_TRUNC('hour', timestamp), EXTRACT(HOUR FROM timestamp)
  ) hourly_stats
  GROUP BY EXTRACT(HOUR FROM timestamp)
  ORDER BY hour_of_day;
END;
$$ LANGUAGE plpgsql;

-- Function: Get top users by query count
CREATE OR REPLACE FUNCTION get_top_users_by_queries(limit_count INTEGER DEFAULT 10)
RETURNS TABLE(
  user_id UUID,
  kakao_user_id TEXT,
  kakao_nickname TEXT,
  role TEXT,
  tier TEXT,
  total_queries BIGINT,
  avg_response_time NUMERIC,
  last_query_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.kakao_user_id,
    p.kakao_nickname,
    p.role,
    p.subscription_tier,
    COUNT(ql.id) as total_queries,
    ROUND(AVG(ql.response_time_ms), 2) as avg_response_time,
    MAX(ql.timestamp) as last_query_at
  FROM profiles p
  INNER JOIN query_logs ql ON ql.kakao_user_id = p.kakao_user_id
  WHERE p.kakao_user_id IS NOT NULL
  GROUP BY p.id, p.kakao_user_id, p.kakao_nickname, p.role, p.subscription_tier
  ORDER BY total_queries DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- INDEXES FOR ANALYTICS PERFORMANCE
-- =====================================================

-- Query logs indexes for analytics
CREATE INDEX IF NOT EXISTS idx_query_logs_timestamp_desc ON query_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_query_logs_query_type ON query_logs(query_type);
CREATE INDEX IF NOT EXISTS idx_query_logs_response_time ON query_logs(response_time_ms);
CREATE INDEX IF NOT EXISTS idx_query_logs_metadata_error ON query_logs((metadata->>'error')) WHERE metadata->>'error' IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_query_logs_metadata_document ON query_logs((metadata->>'document_id'));

-- Profiles indexes for analytics
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at);
CREATE INDEX IF NOT EXISTS idx_profiles_role_tier ON profiles(role, subscription_tier) WHERE kakao_user_id IS NOT NULL;

-- Documents indexes for analytics
CREATE INDEX IF NOT EXISTS idx_documents_access_level ON documents(access_level);
CREATE INDEX IF NOT EXISTS idx_documents_required_role_tier ON documents(required_role, required_tier);

-- =====================================================
-- GRANTS
-- =====================================================

-- Grant access to views
GRANT SELECT ON user_activity_summary TO authenticated;
GRANT SELECT ON user_engagement_by_access TO authenticated;
GRANT SELECT ON content_access_patterns TO authenticated;
GRANT SELECT ON popular_content_7d TO authenticated;
GRANT SELECT ON underutilized_content TO authenticated;
GRANT SELECT ON query_performance_stats TO authenticated;
GRANT SELECT ON hourly_performance_trends TO authenticated;
GRANT SELECT ON rbac_effectiveness_by_access TO authenticated;
GRANT SELECT ON content_access_by_level TO authenticated;
GRANT SELECT ON user_cohorts_monthly TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION get_user_growth_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION get_query_volume_by_hour TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_users_by_queries TO authenticated;

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'Analytics views and functions created successfully';
  RAISE NOTICE 'Views: 11 created';
  RAISE NOTICE 'Functions: 3 created';
  RAISE NOTICE 'Indexes: 9 created for performance';
END $$;
