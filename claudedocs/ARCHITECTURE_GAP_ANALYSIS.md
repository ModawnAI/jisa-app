# JISA App - Architecture Gap Analysis & Phase 5-8 Roadmap

**Document Version:** 1.0
**Date:** 2025-11-13
**Status:** Phase 1-4 Complete → Phase 5-8 Planning
**Purpose:** Identify critical gaps and plan advanced features for production-ready enterprise system

---

## Executive Summary

**Current State:** Phase 1-4 Complete (Backend, Frontend, Integration, Testing/Deployment Prep)
**Target State:** Enterprise-grade RAG chatbot platform with comprehensive admin capabilities

**Critical Finding:** While the core chatbot functionality and basic admin dashboard are complete, significant gaps exist in:
1. **Data Ingestion Pipeline** (Completely Missing - CRITICAL)
2. **Advanced Analytics & Reporting** (Basic → Comprehensive)
3. **Document Management System** (No hierarchical access control)
4. **Subscription & Billing** (Basic schema → Full featured)
5. **Code Generation & Distribution** (Simple → Campaign-based)
6. **KakaoTalk Deep Integration** (Webhook only → Full messaging platform)
7. **Performance Monitoring** (None → Real-time observability)
8. **User Feedback & Training** (Missing → AI improvement loop)
9. **Multi-tenant Architecture** (Single org → Full isolation)
10. **API Platform** (Internal only → External API with rate limiting)

**Business Impact:**
- **Phase 5-6 (Critical):** 70% of enterprise sales requirements
- **Phase 7-8 (Advanced):** 25% competitive differentiation
- **Phase 9+ (Future):** 5% innovation edge

---

## TOP 10 Critical Gaps

### 1. Data Ingestion Pipeline 🔴 CRITICAL
**Status:** Completely Missing
**Priority:** P0 - Blocks content updates
**Business Value:** CRITICAL - Without this, content cannot be updated

**Current State:**
- No UI for document upload
- No automated ingestion from file systems
- No document versioning
- No metadata extraction
- Manual Pinecone updates via Python scripts

**Required State:**
```typescript
// Data Ingestion Architecture
┌─────────────────────────────────────────────────────────┐
│                 Document Sources                         │
├────────────┬──────────────┬─────────────┬──────────────┤
│  Manual    │   File       │    URL      │    API       │
│  Upload    │   Watch      │   Scraper   │  Integration │
└────────────┴──────────────┴─────────────┴──────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│              Document Processing Pipeline                │
├─────────────────────────────────────────────────────────┤
│  1. File Validation (PDF, DOCX, TXT, etc.)             │
│  2. Text Extraction (pdf-parse, mammoth, etc.)         │
│  3. Document Chunking (Smart overlap strategy)         │
│  4. Metadata Extraction (Auto-tagging)                 │
│  5. Embedding Generation (OpenAI batch API)            │
│  6. Vector Storage (Pinecone upsert)                   │
│  7. Document Versioning (Track changes)                │
│  8. Access Control Assignment (Role/Tier mapping)      │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                 Storage & Indexing                       │
├──────────────┬─────────────┬────────────┬──────────────┤
│   Supabase   │   Pinecone  │  Full-text │   Audit      │
│   Storage    │   Vectors   │   Search   │    Log       │
└──────────────┴─────────────┴────────────┴──────────────┘
```

**Implementation Requirements:**

**Database Schema:**
```sql
-- Documents table
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- File information
  filename TEXT NOT NULL,
  file_url TEXT NOT NULL, -- Supabase Storage URL
  file_size BIGINT,
  file_type TEXT, -- 'pdf' | 'docx' | 'txt' | 'url'
  mime_type TEXT,

  -- Content
  title TEXT NOT NULL,
  description TEXT,
  content TEXT, -- Full extracted text

  -- Metadata (RBAC filtering)
  metadata JSONB DEFAULT '{}'::jsonb,
  -- {
  --   "department": "sales",
  --   "product_line": "insurance",
  --   "classification": "confidential",
  --   "tags": ["hanwha", "commission", "2024"],
  --   "author": "admin@company.com"
  -- }

  -- Access control
  required_role TEXT DEFAULT 'user', -- Minimum role
  required_tier TEXT DEFAULT 'free', -- Minimum tier
  classification_level TEXT DEFAULT 'basic', -- Info classification

  -- Processing status
  processing_status TEXT DEFAULT 'pending',
  -- 'pending' | 'processing' | 'completed' | 'failed'

  error_message TEXT,

  -- Versioning
  version INTEGER DEFAULT 1,
  parent_document_id UUID REFERENCES documents(id),
  is_active BOOLEAN DEFAULT true,

  -- Pinecone integration
  pinecone_namespace TEXT,
  pinecone_ids TEXT[], -- Array of chunk IDs
  total_chunks INTEGER DEFAULT 0,
  total_vectors INTEGER DEFAULT 0,

  -- Analytics
  view_count INTEGER DEFAULT 0,
  query_count INTEGER DEFAULT 0, -- How many queries matched this doc
  last_accessed_at TIMESTAMPTZ,

  -- Timestamps
  uploaded_by UUID REFERENCES profiles(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Document chunks (for retrieval tracking)
CREATE TABLE document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,

  -- Chunk content
  chunk_text TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,

  -- Embedding info
  pinecone_id TEXT UNIQUE NOT NULL,
  embedding_model TEXT DEFAULT 'text-embedding-3-large',

  -- Context
  page_number INTEGER,
  section_title TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ingestion jobs
CREATE TABLE ingestion_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Job info
  job_type TEXT NOT NULL, -- 'manual_upload' | 'file_watch' | 'url_scrape'
  status TEXT DEFAULT 'queued',
  -- 'queued' | 'processing' | 'completed' | 'failed'

  -- Input
  source_path TEXT,
  source_url TEXT,
  file_count INTEGER DEFAULT 0,

  -- Progress
  processed_files INTEGER DEFAULT 0,
  failed_files INTEGER DEFAULT 0,
  total_chunks_created INTEGER DEFAULT 0,

  -- Results
  document_ids UUID[],
  error_log JSONB DEFAULT '[]'::jsonb,

  -- Timestamps
  started_by UUID REFERENCES profiles(id),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_documents_status ON documents(processing_status);
CREATE INDEX idx_documents_active ON documents(is_active);
CREATE INDEX idx_documents_metadata ON documents USING gin(metadata);
CREATE INDEX idx_documents_pinecone_ids ON documents USING gin(pinecone_ids);
CREATE INDEX idx_document_chunks_document_id ON document_chunks(document_id);
CREATE INDEX idx_document_chunks_pinecone_id ON document_chunks(pinecone_id);
CREATE INDEX idx_ingestion_jobs_status ON ingestion_jobs(status);
```

**API Endpoints:**
```typescript
// app/api/admin/documents/upload/route.ts
POST /api/admin/documents/upload
// Upload single or multiple files
// Body: FormData with files + metadata
// Response: { job_id, document_ids }

// app/api/admin/documents/route.ts
GET /api/admin/documents
// List all documents with filtering
// Query: ?status=completed&classification=confidential&page=1

POST /api/admin/documents
// Create document from URL or text

// app/api/admin/documents/[id]/route.ts
GET /api/admin/documents/[id]
// Get document details + chunks

PATCH /api/admin/documents/[id]
// Update metadata, access control

DELETE /api/admin/documents/[id]
// Soft delete (mark inactive) or hard delete (remove from Pinecone)

// app/api/admin/documents/[id]/reprocess/route.ts
POST /api/admin/documents/[id]/reprocess
// Re-chunk and re-embed document

// app/api/admin/ingestion/jobs/route.ts
GET /api/admin/ingestion/jobs
// List ingestion jobs with status

POST /api/admin/ingestion/jobs
// Create new ingestion job (batch upload, URL scrape, etc.)

// app/api/admin/ingestion/jobs/[id]/route.ts
GET /api/admin/ingestion/jobs/[id]
// Get job details and progress
```

**Service Layer:**
```typescript
// lib/services/ingestion.service.ts
export class IngestionService {
  async uploadDocument(
    file: File,
    metadata: DocumentMetadata,
    accessControl: AccessControl
  ): Promise<string> {
    // 1. Upload to Supabase Storage
    const fileUrl = await this.uploadToStorage(file);

    // 2. Create document record
    const documentId = await this.createDocumentRecord({
      filename: file.name,
      file_url: fileUrl,
      metadata,
      ...accessControl
    });

    // 3. Queue processing job
    await this.queueProcessingJob(documentId);

    return documentId;
  }

  async processDocument(documentId: string): Promise<void> {
    // 1. Download from storage
    const content = await this.downloadDocument(documentId);

    // 2. Extract text (PDF/DOCX/etc)
    const text = await this.extractText(content);

    // 3. Chunk text
    const chunks = await this.chunkText(text, {
      maxTokens: 512,
      overlap: 50
    });

    // 4. Generate embeddings (batch)
    const embeddings = await this.generateEmbeddings(chunks);

    // 5. Upsert to Pinecone
    const pineconeIds = await this.upsertToPinecone(
      documentId,
      chunks,
      embeddings
    );

    // 6. Update document record
    await this.updateDocumentStatus(documentId, {
      status: 'completed',
      pinecone_ids: pineconeIds,
      total_chunks: chunks.length
    });
  }

  async chunkText(
    text: string,
    options: ChunkOptions
  ): Promise<TextChunk[]> {
    // Smart chunking with overlap
    // Preserve semantic boundaries (paragraphs, sections)
  }

  async generateEmbeddings(chunks: TextChunk[]): Promise<number[][]> {
    // Batch embedding generation with OpenAI
    // Handle rate limits and retries
  }

  async upsertToPinecone(
    documentId: string,
    chunks: TextChunk[],
    embeddings: number[][]
  ): Promise<string[]> {
    // Upsert to Pinecone with metadata
    // Return Pinecone IDs
  }
}
```

**UI Components:**
```typescript
// app/admin/documents/page.tsx
// Document management dashboard
// - Upload button → Modal with drag-drop
// - Document list with filters (status, classification, date)
// - Bulk actions (delete, reprocess, update access control)
// - Document details modal (chunks, metadata, stats)

// components/admin/document-upload.tsx
<DocumentUploadModal>
  <FileDropzone
    accept=".pdf,.docx,.txt"
    maxSize={50MB}
    multiple
  />
  <MetadataForm>
    <Input name="title" />
    <Textarea name="description" />
    <TagInput name="tags" />
    <Select name="classification" />
    <Select name="required_role" />
    <Select name="required_tier" />
  </MetadataForm>
</DocumentUploadModal>

// components/admin/document-table.tsx
<DocumentTable>
  <Column>Filename</Column>
  <Column>Status</Column>
  <Column>Classification</Column>
  <Column>Chunks</Column>
  <Column>Uploaded</Column>
  <Column>Actions</Column>
</DocumentTable>

// components/admin/ingestion-progress.tsx
<IngestionJobProgress jobId={jobId}>
  <ProgressBar value={processed / total} />
  <Stats>
    <Stat>Processed: {processed}</Stat>
    <Stat>Failed: {failed}</Stat>
    <Stat>Total Chunks: {totalChunks}</Stat>
  </Stats>
  <ErrorLog errors={errors} />
</IngestionJobProgress>
```

**Dependencies:**
```json
{
  "dependencies": {
    "pdf-parse": "^1.1.1",
    "mammoth": "^1.6.0",
    "cheerio": "^1.0.0-rc.12",
    "langchain": "^0.1.0",
    "@langchain/openai": "^0.0.1"
  }
}
```

**Implementation Plan:**
1. **Week 1:** Database schema + API routes
2. **Week 2:** Service layer (text extraction, chunking, embedding)
3. **Week 3:** Pinecone integration + job queue
4. **Week 4:** UI components + testing

**Risk Assessment:**
- **Breaking Changes:** None (new feature)
- **Performance Impact:** Heavy (embedding generation)
  - Mitigation: Background jobs with queue
- **Security:** File upload vulnerabilities
  - Mitigation: File validation, virus scanning, size limits

**Success Metrics:**
- Upload → Searchable: < 2 minutes for 10-page PDF
- Batch processing: 100 documents/hour
- Error rate: < 1%

---

### 2. Advanced Analytics & Reporting 🟡 HIGH
**Status:** Basic stats only
**Priority:** P1 - Revenue impact
**Business Value:** HIGH - Customer insights, usage optimization

**Current State:**
- Basic dashboard stats (query count, active users, response time, success rate)
- Simple query logs table
- No cohort analysis
- No funnel tracking
- No predictive analytics
- No custom reports
- No data export capabilities

**Required State:**
```typescript
// Advanced Analytics Architecture
┌─────────────────────────────────────────────────────────┐
│                   Analytics Engine                       │
├─────────────────────────────────────────────────────────┤
│  Real-time → Event Stream → Aggregation → Storage       │
└─────────────────────────────────────────────────────────┘

// Event Types
interface AnalyticsEvent {
  event_id: string;
  event_type: 'query' | 'login' | 'document_access' | 'code_use' | 'api_call';
  user_id: string;
  session_id: string;
  timestamp: Date;

  // Query-specific
  query_text?: string;
  query_type?: 'commission' | 'rag' | 'unknown';
  response_time?: number;
  success?: boolean;
  error_type?: string;

  // Engagement
  satisfaction_score?: number; // 1-5 rating
  feedback_text?: string;

  // Context
  metadata: {
    user_role: string;
    subscription_tier: string;
    platform: 'kakao' | 'web' | 'api';
    location?: string;
    device_type?: string;
  };
}
```

**Database Schema:**
```sql
-- User cohorts
CREATE TABLE user_cohorts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,

  -- Cohort definition
  filters JSONB NOT NULL,
  -- {
  --   "signup_date": { "from": "2024-01-01", "to": "2024-01-31" },
  --   "subscription_tier": ["premium", "enterprise"],
  --   "query_count": { "min": 100 }
  -- }

  -- Stats
  user_count INTEGER DEFAULT 0,

  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Aggregated metrics (time-series)
CREATE TABLE metrics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,

  -- User metrics
  total_users INTEGER DEFAULT 0,
  active_users INTEGER DEFAULT 0,
  new_users INTEGER DEFAULT 0,
  churned_users INTEGER DEFAULT 0,

  -- Query metrics
  total_queries INTEGER DEFAULT 0,
  commission_queries INTEGER DEFAULT 0,
  rag_queries INTEGER DEFAULT 0,
  failed_queries INTEGER DEFAULT 0,

  -- Performance metrics
  avg_response_time INTEGER, -- ms
  p50_response_time INTEGER,
  p95_response_time INTEGER,
  p99_response_time INTEGER,

  -- Engagement metrics
  avg_queries_per_user DECIMAL(10,2),
  avg_session_duration INTEGER, -- seconds

  -- Revenue metrics (if billing implemented)
  revenue DECIMAL(10,2) DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User activity tracking
CREATE TABLE user_activity_summary (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,

  -- Query stats
  total_queries INTEGER DEFAULT 0,
  last_query_at TIMESTAMPTZ,
  first_query_at TIMESTAMPTZ,
  avg_queries_per_day DECIMAL(10,2),

  -- Engagement
  total_sessions INTEGER DEFAULT 0,
  avg_session_duration INTEGER, -- seconds
  last_active_at TIMESTAMPTZ,

  -- Satisfaction
  avg_satisfaction_score DECIMAL(3,2),
  feedback_count INTEGER DEFAULT 0,

  -- Lifecycle stage
  lifecycle_stage TEXT,
  -- 'new' | 'active' | 'at_risk' | 'churned' | 'resurrected'

  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Custom reports
CREATE TABLE custom_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,

  -- Report definition
  report_type TEXT NOT NULL,
  -- 'query_analysis' | 'user_behavior' | 'performance' | 'revenue'

  filters JSONB DEFAULT '{}'::jsonb,
  grouping JSONB DEFAULT '{}'::jsonb,
  metrics JSONB DEFAULT '{}'::jsonb,

  -- Scheduling
  schedule TEXT, -- cron expression
  recipients TEXT[], -- email addresses

  -- Results
  last_run_at TIMESTAMPTZ,
  last_result JSONB,

  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_metrics_daily_date ON metrics_daily(date DESC);
CREATE INDEX idx_user_activity_summary_lifecycle ON user_activity_summary(lifecycle_stage);
CREATE INDEX idx_user_activity_summary_last_active ON user_activity_summary(last_active_at DESC);
```

**API Endpoints:**
```typescript
// app/api/admin/analytics/overview/route.ts
GET /api/admin/analytics/overview
// Dashboard overview with key metrics
// Response: { users, queries, performance, engagement }

// app/api/admin/analytics/users/route.ts
GET /api/admin/analytics/users
// User analytics (cohorts, lifecycle, retention)

// app/api/admin/analytics/queries/route.ts
GET /api/admin/analytics/queries
// Query analytics (types, trends, popular questions)

// app/api/admin/analytics/performance/route.ts
GET /api/admin/analytics/performance
// Performance metrics (response times, error rates)

// app/api/admin/analytics/reports/route.ts
GET /api/admin/analytics/reports
// List custom reports

POST /api/admin/analytics/reports
// Create custom report

// app/api/admin/analytics/reports/[id]/run/route.ts
POST /api/admin/analytics/reports/[id]/run
// Run report and get results

// app/api/admin/analytics/export/route.ts
POST /api/admin/analytics/export
// Export data to CSV/Excel
```

**Service Layer:**
```typescript
// lib/services/analytics.service.ts
export class AnalyticsService {
  async calculateDailyMetrics(date: Date): Promise<DailyMetrics> {
    // Aggregate all events for the day
    // Calculate metrics from query_logs, analytics_events, profiles
  }

  async getUserCohorts(): Promise<Cohort[]> {
    // Calculate user cohorts based on signup date
    // Track retention by cohort
  }

  async calculateLifecycleStage(userId: string): Promise<LifecycleStage> {
    // Determine user lifecycle stage based on activity
    // New → Active → At Risk → Churned → Resurrected
  }

  async predictChurnRisk(userId: string): Promise<number> {
    // ML model to predict churn probability
    // Based on query frequency, satisfaction, engagement
  }

  async generateReport(reportDef: ReportDefinition): Promise<ReportResult> {
    // Generate custom report based on definition
    // Apply filters, grouping, metrics calculation
  }

  async exportData(
    query: AnalyticsQuery,
    format: 'csv' | 'excel' | 'json'
  ): Promise<Buffer> {
    // Export analytics data in specified format
  }
}
```

**UI Components:**
```typescript
// app/admin/analytics/page.tsx
// Advanced analytics dashboard with multiple tabs:
// - Overview (key metrics, trends)
// - Users (cohorts, lifecycle, retention)
// - Queries (types, trends, popular questions)
// - Performance (response times, error rates)
// - Custom Reports (create, schedule, view)

// components/admin/analytics-chart.tsx
<AnalyticsChart
  type="line" | "bar" | "pie" | "heatmap"
  data={chartData}
  xAxis="date"
  yAxis="queries"
  groupBy="query_type"
/>

// components/admin/cohort-table.tsx
<CohortTable>
  <CohortRow cohort="2024-01">
    <Cell>Jan 2024 Signups</Cell>
    <Cell>Week 1: 95%</Cell>
    <Cell>Week 2: 82%</Cell>
    <Cell>Week 4: 68%</Cell>
    <Cell>Month 3: 45%</Cell>
  </CohortRow>
</CohortTable>

// components/admin/report-builder.tsx
<ReportBuilder>
  <Select name="report_type" />
  <FilterBuilder filters={filters} />
  <MetricsSelector metrics={availableMetrics} />
  <GroupingSelector dimensions={dimensions} />
  <ScheduleConfig schedule={schedule} />
</ReportBuilder>
```

**Implementation Plan:**
1. **Week 1:** Database schema + aggregation jobs
2. **Week 2:** Analytics service + API endpoints
3. **Week 3:** Chart components + dashboard UI
4. **Week 4:** Custom reports + export functionality

**Dependencies:**
```json
{
  "dependencies": {
    "recharts": "^2.12.0",
    "d3": "^7.8.5",
    "papaparse": "^5.4.1",
    "xlsx": "^0.18.5"
  }
}
```

---

### 3. Document Management with Hierarchical Access 🟡 HIGH
**Status:** No document management UI
**Priority:** P1 - Security requirement
**Business Value:** HIGH - Enterprise security compliance

**Current State:**
- Documents table exists with access control fields
- No UI for document management
- No hierarchical organization (folders, categories)
- No document sharing/permissions
- No audit trail for document access

**Required State:**
```typescript
// Document Management Architecture
┌─────────────────────────────────────────────────────────┐
│              Document Organization                       │
├─────────────────────────────────────────────────────────┤
│  Categories → Folders → Documents → Versions            │
│  + Access Control at each level (inherited/overridden)  │
└─────────────────────────────────────────────────────────┘
```

**Database Schema:**
```sql
-- Document categories (top-level organization)
CREATE TABLE document_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,

  -- Access control (default for all documents in category)
  default_required_role TEXT DEFAULT 'user',
  default_required_tier TEXT DEFAULT 'free',
  default_classification TEXT DEFAULT 'basic',

  -- Hierarchy
  parent_category_id UUID REFERENCES document_categories(id),
  path TEXT, -- Materialized path (e.g., "/insurance/health")

  -- Stats
  document_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Document folders (sub-organization)
CREATE TABLE document_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES document_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,

  -- Access control (can override category defaults)
  override_access_control BOOLEAN DEFAULT false,
  required_role TEXT,
  required_tier TEXT,
  classification TEXT,

  -- Hierarchy
  parent_folder_id UUID REFERENCES document_folders(id),
  path TEXT,

  document_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(category_id, slug)
);

-- Update documents table to include folder reference
ALTER TABLE documents ADD COLUMN folder_id UUID REFERENCES document_folders(id);
ALTER TABLE documents ADD COLUMN category_id UUID REFERENCES document_categories(id);

-- Document access log (audit trail)
CREATE TABLE document_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),

  -- Access details
  access_type TEXT NOT NULL,
  -- 'view' | 'download' | 'query_match' | 'share' | 'update' | 'delete'

  access_granted BOOLEAN DEFAULT true,
  denial_reason TEXT, -- If access denied

  -- Context
  ip_address INET,
  user_agent TEXT,
  query_text TEXT, -- If accessed via query

  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Document sharing (temporary access grants)
CREATE TABLE document_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,

  -- Share type
  share_type TEXT NOT NULL,
  -- 'user' | 'role' | 'tier' | 'public_link'

  -- Recipients
  shared_with_user_id UUID REFERENCES profiles(id),
  shared_with_role TEXT,
  shared_with_tier TEXT,

  -- Public link
  public_link_token TEXT UNIQUE,

  -- Permissions
  can_view BOOLEAN DEFAULT true,
  can_download BOOLEAN DEFAULT false,
  can_share BOOLEAN DEFAULT false,

  -- Expiration
  expires_at TIMESTAMPTZ,

  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_document_categories_path ON document_categories USING gist(path);
CREATE INDEX idx_document_folders_category_id ON document_folders(category_id);
CREATE INDEX idx_document_folders_path ON document_folders USING gist(path);
CREATE INDEX idx_documents_folder_id ON documents(folder_id);
CREATE INDEX idx_documents_category_id ON documents(category_id);
CREATE INDEX idx_document_access_log_document_id ON document_access_log(document_id);
CREATE INDEX idx_document_access_log_user_id ON document_access_log(user_id);
CREATE INDEX idx_document_access_log_timestamp ON document_access_log(timestamp DESC);
CREATE INDEX idx_document_shares_document_id ON document_shares(document_id);
CREATE INDEX idx_document_shares_public_link_token ON document_shares(public_link_token);
```

**API Endpoints:**
```typescript
// Categories
GET /api/admin/documents/categories
POST /api/admin/documents/categories
GET /api/admin/documents/categories/[id]
PATCH /api/admin/documents/categories/[id]
DELETE /api/admin/documents/categories/[id]

// Folders
GET /api/admin/documents/folders
POST /api/admin/documents/folders
GET /api/admin/documents/folders/[id]
PATCH /api/admin/documents/folders/[id]
DELETE /api/admin/documents/folders/[id]

// Document organization
PATCH /api/admin/documents/[id]/move
// Move document to different folder/category

// Document sharing
POST /api/admin/documents/[id]/share
// Create share link or grant access

GET /api/admin/documents/[id]/shares
// List all shares for document

DELETE /api/admin/documents/shares/[shareId]
// Revoke share

// Access log
GET /api/admin/documents/[id]/access-log
// View document access history

GET /api/admin/documents/access-log
// View all document access across system
```

**UI Components:**
```typescript
// app/admin/documents/page.tsx
<DocumentManagement>
  <Sidebar>
    <CategoryTree
      categories={categories}
      onSelectCategory={handleCategorySelect}
    />
  </Sidebar>

  <Main>
    <Breadcrumb path={currentPath} />

    <Toolbar>
      <CreateFolderButton />
      <UploadDocumentButton />
      <BulkActionsMenu />
    </Toolbar>

    <FolderGrid folders={folders} />
    <DocumentTable
      documents={documents}
      onShare={handleShare}
      onMove={handleMove}
      onDelete={handleDelete}
    />
  </Main>
</DocumentManagement>

// components/admin/document-share-dialog.tsx
<ShareDialog document={document}>
  <TabList>
    <Tab>Share with User</Tab>
    <Tab>Share with Role</Tab>
    <Tab>Public Link</Tab>
  </TabList>

  <TabPanel value="user">
    <UserSelector />
    <PermissionsCheckboxes />
    <ExpirationDatePicker />
  </TabPanel>

  <TabPanel value="role">
    <RoleSelector />
    <PermissionsCheckboxes />
  </TabPanel>

  <TabPanel value="public">
    <GeneratePublicLinkButton />
    <PublicLinkDisplay link={publicLink} />
    <CopyLinkButton />
  </TabPanel>
</ShareDialog>

// components/admin/document-access-log.tsx
<AccessLog documentId={documentId}>
  <Table>
    <Column>User</Column>
    <Column>Action</Column>
    <Column>Granted/Denied</Column>
    <Column>IP Address</Column>
    <Column>Timestamp</Column>
  </Table>
</AccessLog>
```

**Implementation Plan:**
1. **Week 1:** Category/folder schema + API
2. **Week 2:** Document organization UI (tree view, drag-drop)
3. **Week 3:** Sharing functionality + access log
4. **Week 4:** Audit trail + compliance reports

---

### 4. Subscription & Billing Management 🟡 HIGH
**Status:** Basic schema only
**Priority:** P1 - Revenue generation
**Business Value:** HIGH - Direct revenue impact

**Current State:**
- subscription_tiers table exists
- No billing integration
- No payment processing
- No subscription lifecycle management
- No usage metering
- No invoice generation

**Required State:**
```typescript
// Subscription & Billing Architecture
┌─────────────────────────────────────────────────────────┐
│                Subscription Lifecycle                    │
├─────────────────────────────────────────────────────────┤
│  Free → Trial → Paid → Upgrade/Downgrade → Churn        │
│  + Usage Metering → Billing → Payment → Invoice         │
└─────────────────────────────────────────────────────────┘
```

**Database Schema:**
```sql
-- Subscription plans (detailed pricing)
CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_id UUID REFERENCES subscription_tiers(id),

  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,

  -- Pricing
  billing_period TEXT NOT NULL, -- 'monthly' | 'yearly'
  price DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'KRW',

  -- Trial
  trial_days INTEGER DEFAULT 0,

  -- Limits
  limits JSONB DEFAULT '{}'::jsonb,
  -- {
  --   "queries_per_month": 1000,
  --   "api_calls_per_day": 100,
  --   "storage_gb": 10,
  --   "users": 5
  -- }

  -- Features
  features JSONB DEFAULT '{}'::jsonb,

  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User subscriptions
CREATE TABLE user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES subscription_plans(id),

  -- Status
  status TEXT NOT NULL DEFAULT 'active',
  -- 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired'

  -- Dates
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  canceled_at TIMESTAMPTZ,

  -- Billing
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,

  -- Auto-renewal
  cancel_at_period_end BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Usage tracking
CREATE TABLE usage_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES user_subscriptions(id),

  -- Usage type
  usage_type TEXT NOT NULL,
  -- 'query' | 'api_call' | 'storage' | 'user'

  -- Quantity
  quantity INTEGER NOT NULL DEFAULT 1,

  -- Billing period
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,

  -- Context
  metadata JSONB DEFAULT '{}'::jsonb,

  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Invoices
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES user_subscriptions(id),

  -- Invoice details
  invoice_number TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  -- 'draft' | 'open' | 'paid' | 'void' | 'uncollectible'

  -- Amounts
  subtotal DECIMAL(10,2) NOT NULL,
  tax DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'KRW',

  -- Billing period
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,

  -- Line items
  line_items JSONB NOT NULL,
  -- [
  --   {
  --     "description": "Pro Plan - Monthly",
  --     "quantity": 1,
  --     "unit_price": 29900,
  --     "total": 29900
  --   },
  --   {
  --     "description": "Overage - Queries",
  --     "quantity": 500,
  --     "unit_price": 10,
  --     "total": 5000
  --   }
  -- ]

  -- Payment
  stripe_invoice_id TEXT UNIQUE,
  payment_method TEXT,
  paid_at TIMESTAMPTZ,

  -- Dates
  due_date TIMESTAMPTZ,
  issued_at TIMESTAMPTZ DEFAULT NOW(),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment methods
CREATE TABLE payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,

  -- Method type
  method_type TEXT NOT NULL,
  -- 'card' | 'bank_transfer' | 'paypal'

  -- Card details (if applicable)
  card_brand TEXT,
  card_last4 TEXT,
  card_exp_month INTEGER,
  card_exp_year INTEGER,

  -- Stripe
  stripe_payment_method_id TEXT UNIQUE,

  -- Status
  is_default BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX idx_usage_records_user_id ON usage_records(user_id);
CREATE INDEX idx_usage_records_period ON usage_records(period_start, period_end);
CREATE INDEX idx_invoices_user_id ON invoices(user_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_payment_methods_user_id ON payment_methods(user_id);
```

**API Endpoints:**
```typescript
// Subscription management
GET /api/subscriptions/plans
// List available plans

POST /api/subscriptions
// Create new subscription (start trial or paid)

GET /api/subscriptions/current
// Get user's current subscription

PATCH /api/subscriptions/current
// Update subscription (upgrade, downgrade, cancel)

DELETE /api/subscriptions/current
// Cancel subscription

// Billing
GET /api/billing/usage
// Get usage stats for current period

GET /api/billing/invoices
// List user's invoices

GET /api/billing/invoices/[id]
// Get invoice details (PDF generation)

POST /api/billing/payment-methods
// Add payment method

GET /api/billing/payment-methods
// List payment methods

DELETE /api/billing/payment-methods/[id]
// Remove payment method

// Stripe webhooks
POST /api/webhooks/stripe
// Handle Stripe events (payment succeeded, failed, etc.)

// Admin endpoints
GET /api/admin/subscriptions
// List all subscriptions

GET /api/admin/invoices
// List all invoices

POST /api/admin/subscriptions/[id]/refund
// Issue refund
```

**Service Layer:**
```typescript
// lib/services/subscription.service.ts
export class SubscriptionService {
  async createSubscription(
    userId: string,
    planId: string,
    paymentMethodId?: string
  ): Promise<Subscription> {
    const plan = await this.getPlan(planId);

    // Check if trial available
    if (plan.trial_days > 0) {
      return this.startTrial(userId, planId);
    }

    // Create Stripe subscription
    const stripeSubscription = await stripe.subscriptions.create({
      customer: stripeCustomerId,
      items: [{ plan: plan.stripe_price_id }],
      default_payment_method: paymentMethodId,
      trial_end: trialEnd,
    });

    // Create local subscription record
    return this.createSubscriptionRecord(userId, planId, stripeSubscription);
  }

  async upgradeSubscription(
    subscriptionId: string,
    newPlanId: string
  ): Promise<Subscription> {
    // Calculate prorated amount
    // Update Stripe subscription
    // Update local record
  }

  async cancelSubscription(
    subscriptionId: string,
    immediate: boolean = false
  ): Promise<void> {
    if (immediate) {
      // Cancel immediately
      await stripe.subscriptions.cancel(stripeSubscriptionId);
    } else {
      // Cancel at period end
      await stripe.subscriptions.update(stripeSubscriptionId, {
        cancel_at_period_end: true
      });
    }
  }

  async trackUsage(
    userId: string,
    usageType: UsageType,
    quantity: number = 1
  ): Promise<void> {
    // Record usage
    // Check against limits
    // Trigger overage alerts if needed
  }

  async generateInvoice(subscriptionId: string): Promise<Invoice> {
    // Calculate charges for period
    // Include overage charges
    // Generate invoice record
    // Create Stripe invoice
  }
}

// lib/services/billing.service.ts
export class BillingService {
  async calculateUsageCharges(
    userId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<UsageCharges> {
    // Get usage records
    // Calculate overage charges
    // Apply discounts if any
  }

  async processPayment(invoiceId: string): Promise<Payment> {
    // Charge payment method
    // Update invoice status
    // Send receipt email
  }

  async issueRefund(
    invoiceId: string,
    amount: number,
    reason: string
  ): Promise<Refund> {
    // Process Stripe refund
    // Update invoice status
    // Send refund notification
  }
}
```

**UI Components:**
```typescript
// app/dashboard/subscription/page.tsx
<SubscriptionPage>
  <CurrentPlan plan={currentPlan} usage={usage} />
  <UsageChart data={usageData} limits={limits} />
  <UpgradeButton />
  <CancelButton />
</SubscriptionPage>

// app/dashboard/billing/page.tsx
<BillingPage>
  <PaymentMethods methods={paymentMethods} />
  <InvoiceHistory invoices={invoices} />
  <UsageBreakdown usage={usage} />
</BillingPage>

// components/subscription/plan-selector.tsx
<PlanSelector>
  <PlanCard
    plan="free"
    price="₩0"
    features={freeFeatures}
    current={currentPlan === 'free'}
  />
  <PlanCard
    plan="basic"
    price="₩9,900/월"
    features={basicFeatures}
    popular
  />
  <PlanCard
    plan="premium"
    price="₩29,900/월"
    features={premiumFeatures}
  />
</PlanSelector>

// components/billing/usage-meter.tsx
<UsageMeter>
  <Meter
    type="queries"
    used={850}
    limit={1000}
    unit="queries/month"
  />
  <Meter
    type="api_calls"
    used={45}
    limit={100}
    unit="calls/day"
  />
</UsageMeter>

// components/billing/invoice-pdf.tsx
<InvoicePDF invoice={invoice}>
  <InvoiceHeader company={company} invoice={invoice} />
  <BillingInfo customer={customer} />
  <LineItems items={invoice.line_items} />
  <Totals subtotal={invoice.subtotal} tax={invoice.tax} total={invoice.total} />
  <PaymentInfo method={paymentMethod} paid_at={invoice.paid_at} />
</InvoicePDF>
```

**Stripe Integration:**
```typescript
// lib/stripe/client.ts
import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});

// Webhook handler
export async function handleStripeWebhook(
  event: Stripe.Event
): Promise<void> {
  switch (event.type) {
    case 'customer.subscription.created':
      await handleSubscriptionCreated(event.data.object);
      break;
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object);
      break;
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object);
      break;
    case 'invoice.payment_succeeded':
      await handlePaymentSucceeded(event.data.object);
      break;
    case 'invoice.payment_failed':
      await handlePaymentFailed(event.data.object);
      break;
  }
}
```

**Implementation Plan:**
1. **Week 1:** Database schema + Stripe integration
2. **Week 2:** Subscription service + usage tracking
3. **Week 3:** Billing service + invoice generation
4. **Week 4:** UI components + testing

**Dependencies:**
```json
{
  "dependencies": {
    "stripe": "^14.10.0",
    "@stripe/stripe-js": "^2.4.0",
    "@stripe/react-stripe-js": "^2.4.0",
    "pdfkit": "^0.13.0"
  }
}
```

---

### 5. Advanced Code Generation & Campaign Management 🟡 MEDIUM
**Status:** Simple code generation
**Priority:** P2 - User activation
**Business Value:** MEDIUM - User onboarding efficiency

**Current State:**
- Basic verification_codes table
- Simple XXX-XXX-XXX-XXX format
- No campaign tracking
- No bulk generation
- No code analytics

**Required State:**
```typescript
// Code Generation Architecture
┌─────────────────────────────────────────────────────────┐
│            Campaign-based Code Management                │
├─────────────────────────────────────────────────────────┤
│  Campaign → Batch → Codes → Distribution → Analytics    │
└─────────────────────────────────────────────────────────┘
```

**Database Schema:**
```sql
-- Code campaigns (marketing/distribution campaigns)
CREATE TABLE code_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,

  -- Campaign type
  campaign_type TEXT NOT NULL,
  -- 'onboarding' | 'promotional' | 'partnership' | 'event' | 'referral'

  -- Code configuration
  code_type TEXT NOT NULL,
  code_prefix TEXT, -- Custom prefix (e.g., "PROMO-", "EVENT-")
  total_codes INTEGER NOT NULL,
  codes_generated INTEGER DEFAULT 0,
  codes_used INTEGER DEFAULT 0,

  -- Access control defaults
  default_role TEXT DEFAULT 'user',
  default_tier TEXT DEFAULT 'free',
  default_metadata JSONB DEFAULT '{}'::jsonb,

  -- Validity
  valid_from TIMESTAMPTZ NOT NULL,
  valid_until TIMESTAMPTZ NOT NULL,
  max_uses_per_code INTEGER DEFAULT 1,

  -- Distribution
  distribution_method TEXT,
  -- 'manual' | 'email' | 'api' | 'partner_portal'

  distribution_list TEXT[], -- Email addresses if email distribution

  -- Tracking
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,

  -- Status
  status TEXT DEFAULT 'draft',
  -- 'draft' | 'active' | 'paused' | 'completed' | 'canceled'

  -- Stats (updated via trigger)
  conversion_rate DECIMAL(5,2),
  avg_time_to_use INTEGER, -- seconds

  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Code batches (within campaigns)
CREATE TABLE code_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES code_campaigns(id) ON DELETE CASCADE,

  batch_number INTEGER NOT NULL,
  batch_size INTEGER NOT NULL,

  -- Generation status
  generation_status TEXT DEFAULT 'pending',
  -- 'pending' | 'generating' | 'completed' | 'failed'

  codes_generated INTEGER DEFAULT 0,
  error_message TEXT,

  -- File export
  export_file_url TEXT, -- CSV/Excel export

  generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(campaign_id, batch_number)
);

-- Update verification_codes table
ALTER TABLE verification_codes ADD COLUMN campaign_id UUID REFERENCES code_campaigns(id);
ALTER TABLE verification_codes ADD COLUMN batch_id UUID REFERENCES code_batches(id);
ALTER TABLE verification_codes ADD COLUMN utm_source TEXT;
ALTER TABLE verification_codes ADD COLUMN utm_medium TEXT;
ALTER TABLE verification_codes ADD COLUMN utm_campaign TEXT;

-- Code analytics events
CREATE TABLE code_analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id UUID REFERENCES verification_codes(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES code_campaigns(id),

  event_type TEXT NOT NULL,
  -- 'generated' | 'sent' | 'viewed' | 'attempted' | 'used' | 'failed'

  user_id UUID REFERENCES profiles(id),

  -- Context
  ip_address INET,
  user_agent TEXT,
  referrer TEXT,

  -- Failure reasons
  failure_reason TEXT,

  metadata JSONB DEFAULT '{}'::jsonb,

  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Referral tracking (if referral codes)
CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Referrer
  referrer_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  referrer_code TEXT NOT NULL,

  -- Referee
  referee_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  referee_email TEXT,

  -- Status
  status TEXT DEFAULT 'pending',
  -- 'pending' | 'completed' | 'canceled'

  -- Rewards
  referrer_reward JSONB,
  referee_reward JSONB,

  -- Dates
  referred_at TIMESTAMPTZ DEFAULT NOW(),
  converted_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_code_campaigns_status ON code_campaigns(status);
CREATE INDEX idx_code_campaigns_valid ON code_campaigns(valid_from, valid_until);
CREATE INDEX idx_code_batches_campaign_id ON code_batches(campaign_id);
CREATE INDEX idx_verification_codes_campaign_id ON verification_codes(campaign_id);
CREATE INDEX idx_verification_codes_batch_id ON verification_codes(batch_id);
CREATE INDEX idx_code_analytics_events_code_id ON code_analytics_events(code_id);
CREATE INDEX idx_code_analytics_events_campaign_id ON code_analytics_events(campaign_id);
CREATE INDEX idx_code_analytics_events_timestamp ON code_analytics_events(timestamp DESC);
CREATE INDEX idx_referrals_referrer_user_id ON referrals(referrer_user_id);
CREATE INDEX idx_referrals_referee_user_id ON referrals(referee_user_id);
```

**API Endpoints:**
```typescript
// Campaigns
POST /api/admin/codes/campaigns
// Create new campaign

GET /api/admin/codes/campaigns
// List all campaigns

GET /api/admin/codes/campaigns/[id]
// Get campaign details + stats

PATCH /api/admin/codes/campaigns/[id]
// Update campaign

DELETE /api/admin/codes/campaigns/[id]
// Delete campaign

// Batch generation
POST /api/admin/codes/campaigns/[id]/generate
// Generate batch of codes for campaign
// Body: { batch_size, custom_metadata? }

GET /api/admin/codes/campaigns/[id]/batches
// List batches for campaign

GET /api/admin/codes/batches/[id]/export
// Export batch codes as CSV/Excel

// Code distribution
POST /api/admin/codes/campaigns/[id]/distribute
// Distribute codes via email/API
// Body: { method: 'email', recipients: [...] }

// Analytics
GET /api/admin/codes/campaigns/[id]/analytics
// Get campaign analytics (conversion funnel, timeline, etc.)

GET /api/admin/codes/analytics
// Get overall code analytics

// Referrals
POST /api/referrals
// Create referral code for user

GET /api/referrals/my-referrals
// Get user's referrals

GET /api/admin/referrals
// List all referrals (admin only)
```

**Service Layer:**
```typescript
// lib/services/code-campaign.service.ts
export class CodeCampaignService {
  async createCampaign(
    campaignData: CampaignDefinition
  ): Promise<Campaign> {
    // Validate campaign configuration
    // Create campaign record
    // Set up tracking
  }

  async generateCodeBatch(
    campaignId: string,
    batchSize: number
  ): Promise<Batch> {
    // Create batch record
    // Generate codes with campaign settings
    // Associate codes with campaign
    // Track generation metrics

    const codes: string[] = [];
    const campaign = await this.getCampaign(campaignId);

    for (let i = 0; i < batchSize; i++) {
      const code = await this.generateUniqueCode(campaign.code_prefix);
      codes.push(code);

      await this.createCodeRecord({
        code,
        campaign_id: campaignId,
        batch_id: batchId,
        code_type: campaign.code_type,
        metadata: campaign.default_metadata,
        expires_at: campaign.valid_until,
        max_uses: campaign.max_uses_per_code,
        utm_source: campaign.utm_source,
        utm_medium: campaign.utm_medium,
        utm_campaign: campaign.utm_campaign,
      });
    }

    return batch;
  }

  async distributeCodes(
    campaignId: string,
    method: DistributionMethod,
    recipients: string[]
  ): Promise<DistributionResult> {
    // Get codes from campaign
    // Send via specified method (email, API, etc.)
    // Track distribution events

    if (method === 'email') {
      for (const recipient of recipients) {
        const code = await this.assignCodeToRecipient(campaignId, recipient);
        await this.sendCodeEmail(recipient, code);
        await this.trackEvent(code.id, 'sent', { recipient });
      }
    }
  }

  async trackCodeEvent(
    codeId: string,
    eventType: CodeEventType,
    metadata?: any
  ): Promise<void> {
    // Record analytics event
    // Update campaign stats
    // Trigger webhooks if configured
  }

  async getCampaignAnalytics(
    campaignId: string
  ): Promise<CampaignAnalytics> {
    // Calculate conversion funnel
    // Generate: X → Sent: Y → Viewed: Z → Used: W
    // Conversion rate = W / X
    // Avg time to use
    // Geographic distribution
    // Referral source breakdown
  }
}

// lib/services/referral.service.ts
export class ReferralService {
  async createReferralCode(userId: string): Promise<ReferralCode> {
    // Generate unique referral code
    // Create code record
    // Return shareable link
  }

  async trackReferral(
    referrerCode: string,
    refereeEmail: string
  ): Promise<Referral> {
    // Create referral record
    // Send invite email
    // Track conversion
  }

  async completeReferral(referralId: string): Promise<void> {
    // Mark referral as completed
    // Grant rewards to referrer and referee
    // Send notification emails
  }
}
```

**UI Components:**
```typescript
// app/admin/codes/campaigns/page.tsx
<CampaignManagement>
  <CampaignList campaigns={campaigns}>
    <CampaignCard
      campaign={campaign}
      stats={campaignStats}
      actions={['view', 'pause', 'generate', 'distribute']}
    />
  </CampaignList>

  <CreateCampaignButton />
</CampaignManagement>

// app/admin/codes/campaigns/new/page.tsx
<CreateCampaignForm>
  <Step1>
    <Input name="name" label="Campaign Name" />
    <Select name="campaign_type" options={campaignTypes} />
    <Textarea name="description" />
  </Step1>

  <Step2>
    <Select name="code_type" options={codeTypes} />
    <Input name="code_prefix" placeholder="PROMO-" />
    <Input name="total_codes" type="number" />
    <Input name="max_uses_per_code" type="number" />
  </Step2>

  <Step3>
    <DateRangePicker
      label="Valid Period"
      from={validFrom}
      until={validUntil}
    />
    <Select name="default_role" options={roles} />
    <Select name="default_tier" options={tiers} />
  </Step3>

  <Step4>
    <Input name="utm_source" />
    <Input name="utm_medium" />
    <Input name="utm_campaign" />
  </Step4>
</CreateCampaignForm>

// app/admin/codes/campaigns/[id]/page.tsx
<CampaignDetails campaign={campaign}>
  <CampaignHeader campaign={campaign} />

  <StatsGrid>
    <Stat label="Total Codes" value={campaign.total_codes} />
    <Stat label="Generated" value={campaign.codes_generated} />
    <Stat label="Used" value={campaign.codes_used} />
    <Stat label="Conversion Rate" value={campaign.conversion_rate} />
  </StatsGrid>

  <AnalyticsChart data={analyticsData} />

  <ConversionFunnel
    stages={[
      { name: 'Generated', count: 1000 },
      { name: 'Sent', count: 950 },
      { name: 'Viewed', count: 750 },
      { name: 'Attempted', count: 600 },
      { name: 'Used', count: 550 },
    ]}
  />

  <CodeBatchesTable batches={batches} />

  <Actions>
    <GenerateBatchButton />
    <DistributeCodesButton />
    <ExportCodesButton />
    <PauseCampaignButton />
  </Actions>
</CampaignDetails>

// components/admin/code-distribution-dialog.tsx
<DistributeCodesDialog campaign={campaign}>
  <Select name="distribution_method" options={['email', 'api', 'partner_portal']} />

  <ConditionalContent when={method === 'email'}>
    <TextareaWithList
      name="recipients"
      placeholder="email1@example.com
email2@example.com"
    />
    <EmailTemplate template={emailTemplate} />
  </ConditionalContent>

  <ConditionalContent when={method === 'api'}>
    <CodeBlock language="bash">
      {`curl -X POST https://api.jisa.app/v1/codes/assign \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{"campaign_id": "${campaign.id}", "recipient": "user@example.com"}'`}
    </CodeBlock>
  </ConditionalContent>
</DistributeCodesDialog>

// components/referral/referral-dashboard.tsx
<ReferralDashboard user={user}>
  <ReferralLink link={referralLink} />
  <CopyButton text={referralLink} />

  <StatsGrid>
    <Stat label="Total Referrals" value={totalReferrals} />
    <Stat label="Conversions" value={conversions} />
    <Stat label="Rewards Earned" value={rewardsEarned} />
  </StatsGrid>

  <ReferralsList referrals={referrals} />
</ReferralDashboard>
```

**Implementation Plan:**
1. **Week 1:** Campaign schema + core API
2. **Week 2:** Batch generation + distribution service
3. **Week 3:** Analytics + conversion tracking
4. **Week 4:** UI components + referral system

---

## Remaining Gaps (6-10)

### 6. KakaoTalk Deep Integration 🟢 MEDIUM
**Status:** Webhook only
**Priority:** P2 - UX enhancement
**Business Value:** MEDIUM - User engagement

**Missing Features:**
- Deep links (direct to specific content)
- Rich message templates (buttons, carousels)
- User profile sync
- Notification management
- Chatbot personality configuration

### 7. Performance Monitoring & Observability 🟢 MEDIUM
**Status:** None
**Priority:** P2 - Operations
**Business Value:** MEDIUM - System reliability

**Missing Features:**
- Real-time performance metrics
- Error tracking and alerting
- Query performance profiling
- Pinecone latency monitoring
- API rate limit tracking
- Cost optimization dashboards

### 8. User Feedback & AI Training Loop 🟢 LOW
**Status:** None
**Priority:** P3 - Quality improvement
**Business Value:** MEDIUM - Answer quality

**Missing Features:**
- Thumbs up/down feedback
- Detailed feedback forms
- Feedback→Training pipeline
- A/B testing framework
- Model fine-tuning workflow

### 9. Multi-tenant Architecture 🟢 LOW
**Status:** Single organization
**Priority:** P3 - Scalability
**Business Value:** LOW - Future growth

**Missing Features:**
- Organization management
- Team workspaces
- Data isolation
- Cross-org analytics
- Tenant-specific customization

### 10. External API Platform 🟢 LOW
**Status:** Internal only
**Priority:** P3 - Ecosystem
**Business Value:** LOW - Partner integration

**Missing Features:**
- Public API documentation
- API key management
- Rate limiting per API key
- Usage analytics per client
- Webhook delivery system
- SDK generation (Python, JS, etc.)

---

## Implementation Roadmap: Phase 5-8

### Phase 5: Critical Missing Features (Weeks 1-2) 🔴

**Goal:** Enable content management and enterprise-grade analytics

**Week 1: Data Ingestion Pipeline**
- Database schema (documents, chunks, ingestion_jobs)
- Document upload API + service
- Text extraction (PDF, DOCX)
- Chunking + embedding generation
- Pinecone upsert integration
- Upload UI (drag-drop, progress tracking)

**Week 2: Document Management + Advanced Analytics**
- Category/folder hierarchy
- Document organization UI
- Access control enforcement
- Analytics aggregation jobs
- Custom report builder
- Chart components

**Deliverables:**
- ✅ Document upload and processing pipeline
- ✅ Hierarchical document organization
- ✅ Advanced analytics dashboard
- ✅ Custom report generation
- ✅ Data export (CSV, Excel)

**Success Metrics:**
- Upload → Searchable: < 2 minutes for 10-page PDF
- 100 documents/hour processing capacity
- Real-time analytics (< 1 second query time)

---

### Phase 6: High-Value Enhancements (Weeks 3-4) 🟡

**Goal:** Revenue generation and user activation

**Week 3: Subscription & Billing**
- Stripe integration
- Subscription lifecycle management
- Usage tracking and metering
- Invoice generation
- Payment method management
- Billing UI components

**Week 4: Code Campaign Management**
- Campaign creation and management
- Batch code generation
- Code distribution (email, API)
- Analytics and conversion tracking
- Referral system
- Campaign UI

**Deliverables:**
- ✅ Full subscription management
- ✅ Automated billing and invoicing
- ✅ Usage-based metering
- ✅ Campaign-based code generation
- ✅ Referral program
- ✅ Code analytics

**Success Metrics:**
- Subscription conversion rate: > 5%
- Payment processing: 99.9% success rate
- Code redemption rate: > 60%

---

### Phase 7: Advanced Features (Weeks 5-6) 🟢

**Goal:** Operational excellence and user experience

**Week 5: Performance Monitoring + KakaoTalk Deep Integration**
- Observability stack (Datadog/New Relic/Prometheus)
- Real-time performance dashboards
- Error tracking and alerting
- Cost optimization tools
- KakaoTalk rich messages
- Deep linking
- Notification management

**Week 6: User Feedback & Training Loop**
- Feedback collection (thumbs up/down, forms)
- Feedback analytics
- A/B testing framework
- Model performance tracking
- Fine-tuning workflow
- Feedback → Improvement loop

**Deliverables:**
- ✅ Real-time performance monitoring
- ✅ Error tracking and alerting
- ✅ KakaoTalk rich UI
- ✅ User feedback system
- ✅ A/B testing framework
- ✅ AI training pipeline

**Success Metrics:**
- Incident detection: < 1 minute
- Mean time to recovery: < 15 minutes
- User satisfaction score: > 4.0/5.0
- Answer quality improvement: +10% monthly

---

### Phase 8: Future Innovations (Weeks 7-8) 🟢

**Goal:** Ecosystem expansion and competitive differentiation

**Week 7: Multi-tenant Architecture**
- Organization management
- Team workspaces
- Data isolation (row-level security)
- Cross-org analytics
- Tenant-specific customization

**Week 8: External API Platform**
- Public API documentation
- API key management
- Rate limiting and quotas
- Usage analytics per client
- Webhook delivery system
- SDK generation (Python, JS, Go)

**Deliverables:**
- ✅ Multi-organization support
- ✅ Team collaboration features
- ✅ Public API with documentation
- ✅ Partner integration capabilities
- ✅ Developer portal
- ✅ SDKs (3+ languages)

**Success Metrics:**
- Support 100+ organizations
- 99.95% API uptime
- 10+ partner integrations
- Developer adoption: 50+ API clients

---

## Technical Specifications: TOP 5 Critical Gaps

### 1. Data Ingestion Pipeline (DETAILED)

**System Architecture:**
```
┌─────────────────────────────────────────────────────────┐
│                     Upload Sources                       │
├──────────────┬──────────────┬──────────────┬───────────┤
│   Web UI     │   File       │     URL      │    API    │
│  (Admin)     │   Watch      │   Scraper    │ Endpoint  │
└──────────────┴──────────────┴──────────────┴───────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                File Validation Layer                     │
├─────────────────────────────────────────────────────────┤
│  • File type check (PDF, DOCX, TXT, MD, HTML)          │
│  • Size validation (max 50MB per file)                 │
│  • Virus scanning (ClamAV integration)                 │
│  • Duplicate detection (hash-based)                    │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                 Text Extraction                          │
├─────────────────────────────────────────────────────────┤
│  PDF      → pdf-parse                                   │
│  DOCX     → mammoth                                     │
│  HTML     → cheerio                                     │
│  TXT/MD   → raw read                                    │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│              Smart Chunking Engine                       │
├─────────────────────────────────────────────────────────┤
│  Strategy: Semantic chunking with overlap               │
│  • Max tokens: 512 (configurable)                      │
│  • Overlap: 50 tokens (configurable)                   │
│  • Preserve boundaries (paragraphs, sections)          │
│  • Maintain context (include section headers)          │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│            Metadata Extraction                           │
├─────────────────────────────────────────────────────────┤
│  Automatic tagging:                                     │
│  • Named entities (companies, products)                │
│  • Key phrases (TF-IDF)                                │
│  • Topics (LDA clustering)                             │
│  • Dates and references                                │
│  Manual metadata:                                       │
│  • Department, product line, author                    │
│  • Classification level                                │
│  • Access control (role, tier)                         │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│           Embedding Generation (Batch)                   │
├─────────────────────────────────────────────────────────┤
│  Model: text-embedding-3-large                          │
│  Dimensions: 3072                                       │
│  Batch size: 100 chunks                                │
│  Rate limit: 3000 RPM                                   │
│  Retry strategy: Exponential backoff                   │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│             Pinecone Upsert                              │
├─────────────────────────────────────────────────────────┤
│  Namespace: hof-knowledge-base-max                      │
│  Metadata: {                                            │
│    document_id, chunk_index, section_title,            │
│    classification, required_role, required_tier        │
│  }                                                      │
│  Batch size: 100 vectors                               │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│            Database Record Update                        │
├─────────────────────────────────────────────────────────┤
│  • Update document status → 'completed'                │
│  • Store Pinecone IDs                                  │
│  • Record chunk count, processing time                 │
│  • Trigger indexing for full-text search              │
└─────────────────────────────────────────────────────────┘
```

**Code Structure:**
```typescript
// lib/services/ingestion/
├── ingestion.service.ts         // Main orchestrator
├── validators/
│   ├── file-validator.ts       // File type, size, format validation
│   └── virus-scanner.ts        // ClamAV integration
├── extractors/
│   ├── pdf-extractor.ts        // pdf-parse wrapper
│   ├── docx-extractor.ts       // mammoth wrapper
│   ├── html-extractor.ts       // cheerio-based extraction
│   └── text-extractor.ts       // Plain text/markdown
├── chunkers/
│   ├── semantic-chunker.ts     // Token-based semantic chunking
│   └── boundary-detector.ts    // Section/paragraph boundaries
├── metadata/
│   ├── auto-tagger.ts          // NLP-based auto-tagging
│   └── entity-extractor.ts     // Named entity recognition
├── embeddings/
│   ├── batch-embedder.ts       // OpenAI batch embedding
│   └── rate-limiter.ts         // Rate limit handling
└── storage/
    ├── pinecone-upserter.ts    // Pinecone batch upsert
    └── db-recorder.ts          // Supabase record creation

// lib/services/ingestion/ingestion.service.ts
export class IngestionService {
  constructor(
    private validator: FileValidator,
    private extractorFactory: ExtractorFactory,
    private chunker: SemanticChunker,
    private autoTagger: AutoTagger,
    private embedder: BatchEmbedder,
    private pineconeUpserter: PineconeUpserter,
    private dbRecorder: DBRecorder
  ) {}

  async ingestDocument(
    file: File,
    metadata: DocumentMetadata,
    accessControl: AccessControl
  ): Promise<IngestionResult> {
    // 1. Validate
    await this.validator.validate(file);

    // 2. Upload to Supabase Storage
    const fileUrl = await this.uploadToStorage(file);

    // 3. Create document record (status: 'processing')
    const documentId = await this.dbRecorder.createDocument({
      filename: file.name,
      file_url: fileUrl,
      metadata,
      ...accessControl,
      processing_status: 'processing'
    });

    // 4. Queue processing job
    await this.processDocument(documentId);

    return { documentId, status: 'processing' };
  }

  private async processDocument(documentId: string): Promise<void> {
    try {
      // 1. Download from storage
      const fileBuffer = await this.downloadFromStorage(documentId);

      // 2. Extract text
      const extractor = this.extractorFactory.getExtractor(fileType);
      const extractedText = await extractor.extract(fileBuffer);

      // 3. Chunk text
      const chunks = await this.chunker.chunk(extractedText, {
        maxTokens: 512,
        overlap: 50,
        preserveBoundaries: true
      });

      // 4. Auto-tag
      const autoTags = await this.autoTagger.generateTags(extractedText);

      // 5. Generate embeddings (batch)
      const embeddings = await this.embedder.embed(
        chunks.map(c => c.text)
      );

      // 6. Upsert to Pinecone
      const pineconeIds = await this.pineconeUpserter.upsert(
        documentId,
        chunks,
        embeddings,
        metadata
      );

      // 7. Update document record
      await this.dbRecorder.updateDocument(documentId, {
        processing_status: 'completed',
        content: extractedText.full,
        pinecone_ids: pineconeIds,
        total_chunks: chunks.length,
        metadata: { ...metadata, auto_tags: autoTags },
        processed_at: new Date()
      });

    } catch (error) {
      // Mark as failed
      await this.dbRecorder.updateDocument(documentId, {
        processing_status: 'failed',
        error_message: error.message
      });

      throw error;
    }
  }
}

// lib/services/ingestion/chunkers/semantic-chunker.ts
export class SemanticChunker {
  async chunk(
    text: string,
    options: ChunkOptions
  ): Promise<TextChunk[]> {
    const { maxTokens, overlap, preserveBoundaries } = options;

    // 1. Split into paragraphs
    const paragraphs = this.splitParagraphs(text);

    // 2. Tokenize each paragraph
    const tokenized = paragraphs.map(p => ({
      text: p,
      tokens: this.tokenize(p)
    }));

    // 3. Merge paragraphs into chunks (up to maxTokens)
    const chunks: TextChunk[] = [];
    let currentChunk: string[] = [];
    let currentTokens = 0;

    for (const para of tokenized) {
      if (currentTokens + para.tokens.length > maxTokens) {
        // Finalize current chunk
        chunks.push({
          text: currentChunk.join('\n\n'),
          tokenCount: currentTokens,
          index: chunks.length
        });

        // Start new chunk with overlap
        if (overlap > 0) {
          const overlapText = this.getLastNTokens(
            currentChunk.join('\n\n'),
            overlap
          );
          currentChunk = [overlapText, para.text];
          currentTokens = overlap + para.tokens.length;
        } else {
          currentChunk = [para.text];
          currentTokens = para.tokens.length;
        }
      } else {
        currentChunk.push(para.text);
        currentTokens += para.tokens.length;
      }
    }

    // Add final chunk
    if (currentChunk.length > 0) {
      chunks.push({
        text: currentChunk.join('\n\n'),
        tokenCount: currentTokens,
        index: chunks.length
      });
    }

    return chunks;
  }

  private tokenize(text: string): string[] {
    // Simple whitespace tokenization (or use tiktoken for GPT tokenization)
    return text.split(/\s+/);
  }

  private splitParagraphs(text: string): string[] {
    // Split on double newlines, preserve sections
    return text.split(/\n\n+/).filter(p => p.trim().length > 0);
  }

  private getLastNTokens(text: string, n: number): string {
    const tokens = this.tokenize(text);
    return tokens.slice(-n).join(' ');
  }
}

// lib/services/ingestion/embeddings/batch-embedder.ts
export class BatchEmbedder {
  private openai: OpenAI;
  private rateLimiter: RateLimiter;

  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.rateLimiter = new RateLimiter({ requestsPerMinute: 3000 });
  }

  async embed(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];

    // Process in batches of 100
    for (let i = 0; i < texts.length; i += 100) {
      const batch = texts.slice(i, i + 100);

      await this.rateLimiter.waitForSlot();

      try {
        const response = await this.openai.embeddings.create({
          model: 'text-embedding-3-large',
          input: batch,
          dimensions: 3072
        });

        embeddings.push(...response.data.map(d => d.embedding));

      } catch (error) {
        if (error.code === 'rate_limit_exceeded') {
          // Exponential backoff
          await this.sleep(2000);
          i -= 100; // Retry this batch
        } else {
          throw error;
        }
      }
    }

    return embeddings;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// lib/services/ingestion/storage/pinecone-upserter.ts
export class PineconeUpserter {
  private pinecone: Pinecone;
  private index: PineconeIndex;

  constructor() {
    this.pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    this.index = this.pinecone.index(process.env.PINECONE_INDEX!);
  }

  async upsert(
    documentId: string,
    chunks: TextChunk[],
    embeddings: number[][],
    metadata: DocumentMetadata
  ): Promise<string[]> {
    const vectors: PineconeVector[] = chunks.map((chunk, i) => ({
      id: `${documentId}_chunk_${i}`,
      values: embeddings[i],
      metadata: {
        document_id: documentId,
        chunk_index: i,
        text: chunk.text,
        token_count: chunk.tokenCount,
        ...metadata
      }
    }));

    // Upsert in batches of 100
    const pineconeIds: string[] = [];

    for (let i = 0; i < vectors.length; i += 100) {
      const batch = vectors.slice(i, i + 100);

      await this.index.namespace('hof-knowledge-base-max').upsert(batch);

      pineconeIds.push(...batch.map(v => v.id));
    }

    return pineconeIds;
  }
}
```

**Migration Strategy:**
1. **No Breaking Changes:** New feature, existing RAG continues working
2. **Parallel Testing:** Test ingestion pipeline with subset of documents before full migration
3. **Gradual Rollout:** Start with manual uploads, then file watch, then automated scraping

**Performance Benchmarks:**
```
Small doc (10 pages):  < 1 minute
Medium doc (50 pages): < 3 minutes
Large doc (200 pages): < 10 minutes

Batch processing: 100 docs/hour
Embedding cost: ~$0.13 per 1M tokens
Storage cost: Pinecone ~$0.096/GB/month
```

---

### 2. Advanced Analytics (DETAILED)

**Database Aggregation Strategy:**
```sql
-- Daily metrics aggregation (runs daily at midnight)
CREATE OR REPLACE FUNCTION aggregate_daily_metrics()
RETURNS void AS $$
BEGIN
  INSERT INTO metrics_daily (date, total_users, active_users, new_users, total_queries, ...)
  SELECT
    CURRENT_DATE - INTERVAL '1 day' as date,
    COUNT(DISTINCT p.id) as total_users,
    COUNT(DISTINCT CASE WHEN p.last_activity_at >= CURRENT_DATE - INTERVAL '1 day' THEN p.id END) as active_users,
    COUNT(DISTINCT CASE WHEN p.created_at >= CURRENT_DATE - INTERVAL '1 day' THEN p.id END) as new_users,
    COUNT(q.id) as total_queries,
    COUNT(CASE WHEN q.query_type = 'commission' THEN 1 END) as commission_queries,
    COUNT(CASE WHEN q.query_type = 'rag' THEN 1 END) as rag_queries,
    AVG(q.response_time) as avg_response_time,
    PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY q.response_time) as p50_response_time,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY q.response_time) as p95_response_time,
    PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY q.response_time) as p99_response_time
  FROM profiles p
  LEFT JOIN query_logs q ON q.user_id = p.id AND q.timestamp >= CURRENT_DATE - INTERVAL '1 day' AND q.timestamp < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Schedule with pg_cron
SELECT cron.schedule('aggregate-daily-metrics', '0 0 * * *', 'SELECT aggregate_daily_metrics()');
```

**Cohort Analysis Implementation:**
```typescript
// lib/services/analytics/cohort-analyzer.ts
export class CohortAnalyzer {
  async calculateRetention(
    cohortMonth: string // 'YYYY-MM'
  ): Promise<CohortRetention> {
    // Get users who signed up in cohortMonth
    const cohortUsers = await this.getCohortUsers(cohortMonth);

    // Calculate retention for each week/month after signup
    const retentionData: RetentionPeriod[] = [];

    for (let period = 0; period <= 12; period++) {
      const periodStart = addMonths(cohortMonth, period);
      const periodEnd = addMonths(cohortMonth, period + 1);

      const activeUsers = await this.getActiveUsers(
        cohortUsers,
        periodStart,
        periodEnd
      );

      retentionData.push({
        period,
        activeUsers: activeUsers.length,
        retentionRate: (activeUsers.length / cohortUsers.length) * 100
      });
    }

    return {
      cohortMonth,
      cohortSize: cohortUsers.length,
      retention: retentionData
    };
  }

  private async getCohortUsers(month: string): Promise<User[]> {
    const startDate = new Date(month + '-01');
    const endDate = addMonths(startDate, 1);

    return await db.profiles.findMany({
      where: {
        created_at: {
          gte: startDate,
          lt: endDate
        }
      }
    });
  }

  private async getActiveUsers(
    cohortUsers: User[],
    periodStart: Date,
    periodEnd: Date
  ): Promise<User[]> {
    const userIds = cohortUsers.map(u => u.id);

    return await db.profiles.findMany({
      where: {
        id: { in: userIds },
        last_activity_at: {
          gte: periodStart,
          lt: periodEnd
        }
      }
    });
  }
}
```

**Real-time Metrics:**
```typescript
// lib/services/analytics/realtime-metrics.ts
export class RealtimeMetricsService {
  private redis: Redis;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL);
  }

  async trackEvent(event: AnalyticsEvent): Promise<void> {
    // Increment counters in Redis
    const today = format(new Date(), 'yyyy-MM-dd');

    await Promise.all([
      // Total queries today
      this.redis.incr(`metrics:${today}:queries`),

      // Queries by type
      this.redis.hincrby(`metrics:${today}:query_types`, event.query_type, 1),

      // Active users (set with expiry)
      this.redis.sadd(`metrics:${today}:active_users`, event.user_id),
      this.redis.expire(`metrics:${today}:active_users`, 86400),

      // Response times (sorted set for percentile calculation)
      this.redis.zadd(
        `metrics:${today}:response_times`,
        event.response_time,
        `${event.event_id}`
      ),
    ]);
  }

  async getCurrentStats(): Promise<RealtimeStats> {
    const today = format(new Date(), 'yyyy-MM-dd');

    const [
      totalQueries,
      queryTypes,
      activeUsers,
      responseTimes
    ] = await Promise.all([
      this.redis.get(`metrics:${today}:queries`),
      this.redis.hgetall(`metrics:${today}:query_types`),
      this.redis.scard(`metrics:${today}:active_users`),
      this.redis.zrange(`metrics:${today}:response_times`, 0, -1, 'WITHSCORES')
    ]);

    // Calculate percentiles from response times
    const times = responseTimes
      .filter((_, i) => i % 2 === 1)
      .map(Number)
      .sort((a, b) => a - b);

    return {
      total_queries: Number(totalQueries) || 0,
      query_types: queryTypes,
      active_users: activeUsers,
      avg_response_time: times.length > 0 ? times.reduce((a, b) => a + b) / times.length : 0,
      p50_response_time: this.percentile(times, 0.50),
      p95_response_time: this.percentile(times, 0.95),
      p99_response_time: this.percentile(times, 0.99),
    };
  }

  private percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[index];
  }
}
```

---

## Risk Assessment & Mitigation

### Breaking Changes: None Expected ✅
All new features are additive. Existing Phase 1-4 functionality remains unchanged.

### Performance Implications:

**Data Ingestion:**
- **Risk:** High CPU usage during embedding generation
- **Mitigation:** Background job queue (BullMQ), rate limiting, batch processing
- **Impact:** Minimal if processed asynchronously

**Analytics:**
- **Risk:** Slow dashboard queries on large datasets
- **Mitigation:** Pre-aggregated metrics, caching (Redis), indexed queries
- **Impact:** Dashboard load time < 2 seconds with proper optimization

**Document Management:**
- **Risk:** Large file storage costs
- **Mitigation:** Compression, deduplication, lifecycle policies
- **Impact:** Estimated $50-100/month for 10GB storage

### Security Considerations:

**File Upload:**
- **Risk:** Malicious file execution, XSS via PDF
- **Mitigation:** File validation, virus scanning (ClamAV), sandboxed processing
- **Implementation:** Mandatory virus scan before processing

**Document Access:**
- **Risk:** Unauthorized access to confidential documents
- **Mitigation:** RLS policies, access audit log, encryption at rest
- **Implementation:** Triple-layer access control (role + tier + classification)

**Billing Integration:**
- **Risk:** Payment data exposure
- **Mitigation:** PCI compliance via Stripe, no card storage, tokenization
- **Implementation:** Stripe handles all card data

### Migration Strategy:

**Phase 5-6 (Critical):**
1. Deploy schema changes (backward compatible)
2. Enable new features with feature flags
3. Test with subset of users (beta group)
4. Monitor performance metrics
5. Gradually rollout to all users

**Phase 7-8 (Advanced):**
1. Beta test with pilot organizations
2. Collect feedback and iterate
3. Full production rollout

**Rollback Plan:**
- All schema changes are backward compatible
- Feature flags allow instant disable
- Database migrations are reversible
- No data loss during rollback

---

## Resource Estimation

### Development Time:
- **Phase 5 (Critical):** 2 weeks (1 senior engineer)
- **Phase 6 (High-Value):** 2 weeks (1 senior engineer)
- **Phase 7 (Advanced):** 2 weeks (1 senior + 1 junior)
- **Phase 8 (Future):** 2 weeks (1 senior + 1 junior)

**Total:** 8 weeks, ~320 hours

### Infrastructure Costs (Monthly):

**Phase 5-6 (Production):**
```
Supabase Pro: $25
Vercel Pro: $20
Pinecone Standard: $70
Redis (Upstash): $10
Stripe fees: 2.9% + ₩300 per transaction
Total: ~$125/month base + transaction fees
```

**Phase 7-8 (Scale):**
```
Supabase Team: $599
Vercel Pro: $20
Pinecone Pod-based: $200-500
Redis cluster: $50
Datadog APM: $15/host
Total: ~$900-1200/month
```

### Team Requirements:
- **Phase 5-6:** 1 senior full-stack engineer
- **Phase 7-8:** 1 senior + 1 junior engineer
- **Design:** 0.5 FTE UI/UX designer (ongoing)
- **QA:** 0.3 FTE QA engineer (Phase 6-8)

---

## Success Metrics & KPIs

### Phase 5: Data Ingestion
- ✅ Upload → Searchable: < 2 minutes (10-page PDF)
- ✅ Batch processing: 100 documents/hour
- ✅ Processing error rate: < 1%
- ✅ Search accuracy: > 90% relevant results

### Phase 6: Revenue Generation
- ✅ Subscription conversion: > 5%
- ✅ Payment success rate: > 99%
- ✅ Code redemption rate: > 60%
- ✅ Referral conversion: > 10%

### Phase 7: Operational Excellence
- ✅ Incident detection: < 1 minute
- ✅ Mean time to recovery: < 15 minutes
- ✅ User satisfaction: > 4.0/5.0
- ✅ Answer quality: +10% monthly improvement

### Phase 8: Ecosystem Growth
- ✅ Support 100+ organizations
- ✅ API uptime: > 99.95%
- ✅ Partner integrations: 10+
- ✅ Developer adoption: 50+ API clients

---

## Conclusion

**Current State:** Strong foundation (Phase 1-4 complete)
**Critical Gaps:** 10 identified, 5 require immediate action
**Roadmap:** 8-week plan to reach enterprise-grade maturity
**Investment:** ~320 hours development + $125-1200/month infrastructure
**ROI:** High - Enables enterprise sales, revenue generation, operational excellence

**Recommendation:** Execute Phase 5-6 immediately (Weeks 1-4) to unlock revenue and enable enterprise sales. Phase 7-8 can follow based on customer demand and feedback.

**Next Steps:**
1. ✅ Review and approve Phase 5-6 roadmap
2. ✅ Allocate development resources (1 senior engineer)
3. ✅ Set up infrastructure (Stripe account, Redis, monitoring)
4. 🚀 Begin Phase 5: Week 1 - Data Ingestion Pipeline

---

**Document Version:** 1.0
**Last Updated:** 2025-11-13
**Status:** Ready for Review & Approval
