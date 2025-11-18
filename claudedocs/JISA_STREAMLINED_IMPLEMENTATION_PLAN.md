# JISA Gated KakaoTalk Chatbot - Streamlined Implementation Plan

rep
**Platform:** Next.js 15 + Supabase + Pinecone
**Analysis Date:** November 17, 2025
**Purpose:** Ultra-detailed implementation plan for streamlined employee chatbot system

---

## 🎯 Goal Summary

Build a **streamlined** gated KakaoTalk chatbot system where:

1. **Bulk upload employees** with different tiers (via CSV/Excel)
2. **Generate special codes** that employees can use
3. **Employees link their code** in KakaoTalk chat (one-time verification)
4. **After linking**, employees can ask RAG FAQ questions
5. **Admin can view** each employee's chat information
6. **Admin can view** Pinecone data/knowledge base
7. **Payment page** for subscription management

---

## 📊 Current State Analysis

### ✅ What Already Exists (Good Foundation)

#### **Database Schema (Supabase: kuixphvkbuuzfezoeyii)**

**Core Tables:**
- ✅ `user_credentials` - Employee credential storage
  - `full_name`, `email`, `phone_number`, `employee_id`
  - `department`, `team`, `position`, `hire_date`, `location`
  - `status` (pending/verified/suspended/inactive)
  - `metadata` (JSONB for flexible data)

- ✅ `profiles` - User profiles (KakaoTalk users + Admins)
  - `kakao_user_id` (KakaoTalk ID) ✅
  - `kakao_nickname` ✅
  - `role` (user/junior/senior/manager/admin/ceo) ✅
  - `subscription_tier` (free/basic/pro/enterprise) ✅
  - `credential_id` → links to `user_credentials` ✅
  - `first_chat_at`, `last_chat_at` ✅

- ✅ `verification_codes` - Access codes with enhanced features
  - `code` (unique code like "HXK-9F2-M7Q-3WP")
  - `role`, `tier` (assigned on verification)
  - `max_uses`, `current_uses`, `status`
  - `intended_recipient_id` → links to `user_credentials` ✅
  - `requires_credential_match` ✅
  - `used_by` (array of kakao_user_ids)

- ✅ `chat_logs` - Conversation logging
  - `kakao_user_id`, `session_id`
  - `message`, `response`, `query_type`
  - `response_time_ms`

- ✅ `query_logs` - Query tracking
  - `kakao_user_id`, `user_id`
  - `query_text`, `response_time_ms`
  - `context_used`, `tokens_used`

- ✅ `documents` - Document metadata with RBAC
  - `title`, `file_path`, `file_type`
  - `access_level`, `required_role`, `required_tier`
  - Multi-dimensional classification fields

- ✅ `contexts` - Document chunks (embeddings)
  - `chunk_text`, `chunk_index`
  - `embedding` (vector)
  - `document_id` → links to `documents`
  - RBAC fields mirrored from documents

#### **Existing Pages (Admin Panel)**

✅ **Working Pages:**
1. `/admin/credentials` - Manage employee credentials
2. `/admin/codes/generate` - Generate individual codes with credential linking
3. `/admin/codes/bulk-generate` - Bulk code generation
4. `/admin/codes` - View all codes
5. `/admin/users` - View KakaoTalk users
6. `/admin/logs` - View query logs
7. `/admin/data/upload` - Upload documents with RBAC settings

✅ **API Routes (Already Implemented):**
- `/api/admin/credentials` - CRUD for credentials
- `/api/admin/codes/generate` - Code generation with credential linking
- `/api/admin/codes/generate-bulk` - Bulk generation
- `/api/admin/codes` - Code management
- `/api/admin/users` - User management
- `/api/admin/logs` - Log retrieval
- `/api/admin/data/ingest` - Document ingestion

---

### ❌ What's Missing (Gaps to Fill)

#### **1. Bulk Employee Upload**
- ❌ No CSV/Excel import UI
- ❌ No batch credential creation endpoint
- ❌ No validation for bulk data

#### **2. Employee-Code Auto-Linking**
- ❌ No workflow to auto-generate codes for uploaded employees
- ❌ No distribution tracking (email/SMS)

#### **3. Chat Information Dashboard**
- ❌ No dedicated employee chat view
- ❌ No conversation history per employee
- ❌ No analytics per employee

#### **4. Pinecone Data Viewer**
- ❌ No page to view Pinecone index
- ❌ No vector search testing UI
- ❌ No namespace/metadata filtering

#### **5. Payment Page**
- ❌ No payment integration
- ❌ No subscription management UI

---

### 🗑️ Unnecessary Pages (Remove/Archive)

**Complex Features Not Needed for MVP:**

1. **`/admin/classification`** - AI-powered content classification
   - **Why remove:** Overkill for simple chatbot
   - **Alternative:** Manual RBAC setting on upload

2. **`/admin/data/contexts`** - Low-level chunk management
   - **Why remove:** Handled automatically by ingestion
   - **Alternative:** View via Pinecone viewer

3. **`/admin/data/jobs`** - Background job monitoring
   - **Why remove:** Too complex for small team
   - **Alternative:** Simple upload confirmation

4. **`/admin/data/documents`** - Detailed document CRUD
   - **Why remove:** Unnecessary complexity
   - **Alternative:** Simple list in Pinecone viewer

5. **`/admin/analytics`** - Comprehensive analytics dashboard
   - **Why remove:** Overkill with many charts
   - **Alternative:** Simple stats in employee chat view

6. **`/dashboard/*`** - User dashboard (for web users)
   - **Why remove:** KakaoTalk users don't use web
   - **Alternative:** Keep admin-only interface

7. **`/admin/billing`** - Complex billing analytics
   - **Why remove:** Too detailed
   - **Alternative:** Simple payment page

---

## 🏗️ Streamlined Architecture

### **Simplified Page Structure**

```
/auth/login          → Admin login (keep)
/admin/
  ├─ credentials/    → Bulk upload employees ✨ ENHANCED
  ├─ codes/          → View all codes (keep)
  │  ├─ generate/    → Generate individual codes (keep)
  │  └─ bulk-generate/ → Generate bulk codes (keep)
  ├─ employees/      → View employees + chats ✨ NEW (replaces /admin/users)
  │  └─ [id]/        → Employee detail with chat history ✨ NEW
  ├─ pinecone/       → View Pinecone data ✨ NEW
  ├─ data/upload/    → Upload documents (keep, simplify)
  └─ payments/       → Simple payment page ✨ NEW
```

**Pages to DELETE:**
- ❌ `/admin/classification/*`
- ❌ `/admin/data/contexts`
- ❌ `/admin/data/jobs`
- ❌ `/admin/data/documents`
- ❌ `/admin/analytics`
- ❌ `/dashboard/*`
- ❌ `/admin/billing`

---

## 🔧 Implementation Plan

### **Phase 1: Database Enhancement (Already 95% Complete)**

**Status:** ✅ **COMPLETE** - Schema already has all required fields

**What exists:**
- ✅ `user_credentials` table with all employee fields
- ✅ `verification_codes` with credential linking
- ✅ `profiles` with `credential_id`, `kakao_user_id`
- ✅ RLS policies for admin-only access
- ✅ Helper functions for code verification

**No changes needed!** Proceed to Phase 2.

---

### **Phase 2: Bulk Employee Upload ✨ PRIORITY**

#### **2.1: Create Bulk Upload UI**

**File:** `/app/admin/credentials/page.tsx` (enhance existing)

**Add Features:**
1. **CSV/Excel Upload Section**
   ```tsx
   <div className="bg-white p-6 rounded-lg shadow">
     <h2>Bulk Upload Employees</h2>

     {/* Template Download */}
     <button onClick={downloadTemplate}>
       📥 Download CSV Template
     </button>

     {/* File Upload */}
     <input
       type="file"
       accept=".csv,.xlsx"
       onChange={handleBulkUpload}
     />

     {/* Preview Table */}
     {previewData && (
       <table>
         {/* Show first 5 rows for validation */}
       </table>
     )}

     {/* Upload Button */}
     <button onClick={processBulkUpload}>
       ✅ Upload {previewData.length} Employees
     </button>
   </div>
   ```

2. **CSV Template Structure**
   ```csv
   full_name,email,employee_id,department,position,tier,role
   홍길동,hong@company.com,EMP001,영업팀,시니어,pro,senior
   김영희,kim@company.com,EMP002,마케팅,주니어,basic,junior
   ```

3. **Validation Rules**
   - ✅ Required: `full_name`, `employee_id`
   - ✅ Unique: `employee_id`, `email`
   - ✅ Valid: `tier` (free/basic/pro/enterprise)
   - ✅ Valid: `role` (user/junior/senior/manager/admin/ceo)

#### **2.2: Create Bulk Upload API**

**File:** `/app/api/admin/credentials/bulk-upload/route.ts` ✨ NEW

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parse } from 'csv-parse/sync'

export async function POST(req: NextRequest) {
  const supabase = createClient()

  // 1. Verify admin access
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'ceo'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // 2. Parse CSV
  const formData = await req.formData()
  const file = formData.get('file') as File
  const text = await file.text()

  const records = parse(text, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  })

  // 3. Validate records
  const errors: string[] = []
  const validRecords: any[] = []

  for (const [index, record] of records.entries()) {
    // Validate required fields
    if (!record.full_name || !record.employee_id) {
      errors.push(`Row ${index + 2}: Missing full_name or employee_id`)
      continue
    }

    // Validate tier
    if (record.tier && !['free', 'basic', 'pro', 'enterprise'].includes(record.tier)) {
      errors.push(`Row ${index + 2}: Invalid tier "${record.tier}"`)
      continue
    }

    // Validate role
    if (record.role && !['user', 'junior', 'senior', 'manager', 'admin', 'ceo'].includes(record.role)) {
      errors.push(`Row ${index + 2}: Invalid role "${record.role}"`)
      continue
    }

    validRecords.push({
      full_name: record.full_name,
      email: record.email || null,
      phone_number: record.phone_number || null,
      employee_id: record.employee_id,
      department: record.department || null,
      team: record.team || null,
      position: record.position || null,
      hire_date: record.hire_date || null,
      location: record.location || null,
      status: 'pending',
      created_by: user.id,
      metadata: {
        tier: record.tier || 'free',
        role: record.role || 'user',
        bulk_upload: true,
        uploaded_at: new Date().toISOString()
      }
    })
  }

  if (errors.length > 0 && validRecords.length === 0) {
    return NextResponse.json({
      error: 'All records have errors',
      details: errors
    }, { status: 400 })
  }

  // 4. Insert into database
  const { data: inserted, error: dbError } = await supabase
    .from('user_credentials')
    .insert(validRecords)
    .select()

  if (dbError) {
    return NextResponse.json({
      error: 'Database error',
      details: dbError.message
    }, { status: 500 })
  }

  // 5. Return results
  return NextResponse.json({
    success: true,
    inserted: inserted.length,
    errors: errors.length > 0 ? errors : undefined,
    credentials: inserted
  })
}
```

#### **2.3: Auto-Generate Codes for Uploaded Employees**

**Enhancement:** After bulk upload, offer to auto-generate codes

**UI Flow:**
```
Upload CSV → Success
↓
[Button: Generate Codes for All Employees]
↓
Creates individual codes linked to each credential
↓
Shows table with: Employee Name | Code | Status
↓
[Button: Download Codes CSV] [Button: Send via Email]
```

**API:** `/app/api/admin/credentials/generate-codes/route.ts` ✨ NEW

```typescript
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { credentialIds } = await req.json() // Array of credential IDs

  // Generate code for each credential
  const codes = []

  for (const credentialId of credentialIds) {
    // Get credential details
    const { data: credential } = await supabase
      .from('user_credentials')
      .select('*')
      .eq('id', credentialId)
      .single()

    if (!credential) continue

    // Get tier/role from metadata
    const tier = credential.metadata?.tier || 'free'
    const role = credential.metadata?.role || 'user'

    // Generate unique code
    const code = generateCode() // e.g., "ABC-123-XYZ-789"

    // Insert verification code
    const { data: inserted } = await supabase
      .from('verification_codes')
      .insert({
        code,
        role,
        tier,
        max_uses: 1,
        current_uses: 0,
        status: 'active',
        intended_recipient_id: credentialId,
        intended_recipient_name: credential.full_name,
        intended_recipient_email: credential.email,
        intended_recipient_employee_id: credential.employee_id,
        requires_credential_match: true, // ✅ Enforce credential matching
        expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
        metadata: {
          auto_generated: true,
          bulk_upload: true
        }
      })
      .select()
      .single()

    codes.push({
      credentialId,
      employeeName: credential.full_name,
      employeeId: credential.employee_id,
      code: inserted.code,
      role,
      tier
    })
  }

  return NextResponse.json({ codes })
}

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // No O, I, 0, 1
  const segments = 4
  const segmentLength = 3

  const parts = []
  for (let i = 0; i < segments; i++) {
    let segment = ''
    for (let j = 0; j < segmentLength; j++) {
      segment += chars[Math.floor(Math.random() * chars.length)]
    }
    parts.push(segment)
  }

  return parts.join('-') // e.g., "HXK-9F2-M7Q-3WP"
}
```

---

### **Phase 3: Employee Management & Chat Viewing ✨ NEW**

#### **3.1: Rename and Enhance `/admin/users` → `/admin/employees`**

**Purpose:** View all employees (from `user_credentials` + linked `profiles`)

**File:** `/app/admin/employees/page.tsx` ✨ NEW

```tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Search, MessageSquare, CheckCircle, XCircle } from 'lucide-react'

interface Employee {
  id: string
  full_name: string
  employee_id: string
  email?: string
  department?: string
  position?: string
  status: 'pending' | 'verified' | 'inactive'

  // Linked profile info
  kakao_user_id?: string
  kakao_nickname?: string
  verification_code?: string
  first_chat_at?: string
  last_chat_at?: string
  total_chats: number

  // Tier/Role
  role?: string
  tier?: string
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    loadEmployees()
  }, [statusFilter, searchTerm])

  const loadEmployees = async () => {
    setLoading(true)

    const params = new URLSearchParams()
    if (statusFilter !== 'all') params.append('status', statusFilter)
    if (searchTerm) params.append('search', searchTerm)

    const response = await fetch(`/api/admin/employees?${params}`)
    const data = await response.json()

    setEmployees(data.employees || [])
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">직원 관리</h1>
        <p className="text-gray-600">
          등록된 직원과 채팅 활동을 확인합니다
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <input
          type="search"
          placeholder="이름, 사번, 이메일 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-4 py-2 border rounded-lg"
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="all">전체</option>
          <option value="verified">인증 완료</option>
          <option value="pending">미인증</option>
          <option value="inactive">비활성</option>
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-2xl font-bold">
            {employees.length}
          </div>
          <div className="text-sm text-gray-600">전체 직원</div>
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-2xl font-bold">
            {employees.filter(e => e.kakao_user_id).length}
          </div>
          <div className="text-sm text-gray-600">인증 완료</div>
        </div>

        <div className="bg-yellow-50 p-4 rounded-lg">
          <div className="text-2xl font-bold">
            {employees.filter(e => !e.kakao_user_id).length}
          </div>
          <div className="text-sm text-gray-600">미인증</div>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="text-2xl font-bold">
            {employees.filter(e => e.last_chat_at &&
              new Date(e.last_chat_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            ).length}
          </div>
          <div className="text-sm text-gray-600">7일 활성</div>
        </div>
      </div>

      {/* Employee Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                직원 정보
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                부서/직급
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                인증 상태
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                채팅 활동
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                권한
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                작업
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {employees.map((employee) => (
              <tr key={employee.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div>
                    <div className="font-medium text-gray-900">
                      {employee.full_name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {employee.employee_id}
                      {employee.email && ` • ${employee.email}`}
                    </div>
                  </div>
                </td>

                <td className="px-6 py-4 text-sm">
                  <div>{employee.department || '-'}</div>
                  <div className="text-gray-500">{employee.position || '-'}</div>
                </td>

                <td className="px-6 py-4">
                  {employee.kakao_user_id ? (
                    <div className="flex items-center text-green-600">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      <span className="text-sm">인증 완료</span>
                    </div>
                  ) : (
                    <div className="flex items-center text-gray-400">
                      <XCircle className="w-4 h-4 mr-1" />
                      <span className="text-sm">미인증</span>
                    </div>
                  )}
                  {employee.kakao_nickname && (
                    <div className="text-xs text-gray-500 mt-1">
                      {employee.kakao_nickname}
                    </div>
                  )}
                </td>

                <td className="px-6 py-4 text-sm">
                  {employee.kakao_user_id ? (
                    <>
                      <div className="font-medium">
                        {employee.total_chats}개 대화
                      </div>
                      {employee.last_chat_at && (
                        <div className="text-gray-500 text-xs">
                          최근: {new Date(employee.last_chat_at).toLocaleDateString('ko-KR')}
                        </div>
                      )}
                    </>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>

                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                      {employee.role || 'user'}
                    </span>
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">
                      {employee.tier || 'free'}
                    </span>
                  </div>
                </td>

                <td className="px-6 py-4 text-right">
                  <Link
                    href={`/admin/employees/${employee.id}`}
                    className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                  >
                    <MessageSquare className="w-4 h-4 mr-1" />
                    상세보기
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

**API:** `/app/api/admin/employees/route.ts` ✨ NEW

```typescript
export async function GET(req: NextRequest) {
  const supabase = createClient()

  // Get query params
  const searchParams = req.nextUrl.searchParams
  const search = searchParams.get('search') || ''
  const status = searchParams.get('status') || 'all'

  // Build query
  let query = supabase
    .from('user_credentials')
    .select(`
      id,
      full_name,
      email,
      employee_id,
      department,
      team,
      position,
      hire_date,
      location,
      status,
      metadata,
      created_at,
      profiles!credential_id (
        kakao_user_id,
        kakao_nickname,
        role,
        subscription_tier,
        first_chat_at,
        last_chat_at,
        metadata
      )
    `)
    .order('created_at', { ascending: false })

  // Apply filters
  if (status !== 'all') {
    if (status === 'verified') {
      // Has linked profile
      query = query.not('profiles', 'is', null)
    } else if (status === 'pending') {
      // No linked profile
      query = query.is('profiles', null)
    } else {
      query = query.eq('status', status)
    }
  }

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,employee_id.ilike.%${search}%`)
  }

  const { data: credentials, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Enrich with chat stats
  const employees = await Promise.all(
    credentials.map(async (cred) => {
      let totalChats = 0

      if (cred.profiles?.kakao_user_id) {
        const { count } = await supabase
          .from('query_logs')
          .select('*', { count: 'exact', head: true })
          .eq('kakao_user_id', cred.profiles.kakao_user_id)

        totalChats = count || 0
      }

      return {
        id: cred.id,
        full_name: cred.full_name,
        email: cred.email,
        employee_id: cred.employee_id,
        department: cred.department,
        team: cred.team,
        position: cred.position,
        hire_date: cred.hire_date,
        location: cred.location,
        status: cred.status,

        // Profile info
        kakao_user_id: cred.profiles?.kakao_user_id,
        kakao_nickname: cred.profiles?.kakao_nickname,
        role: cred.profiles?.role || cred.metadata?.role,
        tier: cred.profiles?.subscription_tier || cred.metadata?.tier,
        first_chat_at: cred.profiles?.first_chat_at,
        last_chat_at: cred.profiles?.last_chat_at,
        verification_code: cred.profiles?.metadata?.verification_code,

        // Stats
        total_chats: totalChats
      }
    })
  )

  return NextResponse.json({ employees })
}
```

#### **3.2: Employee Detail Page with Chat History**

**File:** `/app/admin/employees/[id]/page.tsx` ✨ NEW

```tsx
'use client'

import { useState, useEffect } from 'use'
import { useParams } from 'next/navigation'
import { ArrowLeft, MessageSquare, User, Calendar } from 'lucide-react'
import Link from 'next/link'

interface EmployeeDetail {
  // Employee info
  id: string
  full_name: string
  employee_id: string
  email?: string
  phone_number?: string
  department?: string
  team?: string
  position?: string
  hire_date?: string
  location?: string
  status: string

  // Verification info
  kakao_user_id?: string
  kakao_nickname?: string
  verification_code?: string
  verified_at?: string
  role?: string
  tier?: string

  // Activity
  first_chat_at?: string
  last_chat_at?: string
  total_queries: number
}

interface ChatMessage {
  id: string
  timestamp: string
  query_text: string
  response_text?: string
  query_type: 'rag' | 'commission' | 'general'
  response_time_ms?: number
  tokens_used?: number
}

export default function EmployeeDetailPage() {
  const params = useParams()
  const employeeId = params.id as string

  const [employee, setEmployee] = useState<EmployeeDetail | null>(null)
  const [chats, setChats] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadEmployeeDetail()
    loadChatHistory()
  }, [employeeId])

  const loadEmployeeDetail = async () => {
    const response = await fetch(`/api/admin/employees/${employeeId}`)
    const data = await response.json()
    setEmployee(data.employee)
  }

  const loadChatHistory = async () => {
    setLoading(true)
    const response = await fetch(`/api/admin/employees/${employeeId}/chats`)
    const data = await response.json()
    setChats(data.chats || [])
    setLoading(false)
  }

  if (!employee) {
    return <div className="p-8">Loading...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/employees"
          className="p-2 hover:bg-gray-100 rounded"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>

        <div>
          <h1 className="text-3xl font-bold">{employee.full_name}</h1>
          <p className="text-gray-600">
            {employee.employee_id} • {employee.department || '부서 미지정'}
          </p>
        </div>
      </div>

      {/* Employee Info Cards */}
      <div className="grid grid-cols-3 gap-6">
        {/* Basic Info */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold">기본 정보</h3>
          </div>

          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-gray-500">이메일</dt>
              <dd className="font-medium">{employee.email || '-'}</dd>
            </div>
            <div>
              <dt className="text-gray-500">전화번호</dt>
              <dd className="font-medium">{employee.phone_number || '-'}</dd>
            </div>
            <div>
              <dt className="text-gray-500">부서/팀</dt>
              <dd className="font-medium">
                {employee.department || '-'} / {employee.team || '-'}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">직급</dt>
              <dd className="font-medium">{employee.position || '-'}</dd>
            </div>
            <div>
              <dt className="text-gray-500">입사일</dt>
              <dd className="font-medium">
                {employee.hire_date ? new Date(employee.hire_date).toLocaleDateString('ko-KR') : '-'}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">근무지</dt>
              <dd className="font-medium">{employee.location || '-'}</dd>
            </div>
          </dl>
        </div>

        {/* Verification Status */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold">인증 정보</h3>
          </div>

          {employee.kakao_user_id ? (
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-gray-500">상태</dt>
                <dd>
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                    ✅ 인증 완료
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">카카오톡 닉네임</dt>
                <dd className="font-medium">{employee.kakao_nickname}</dd>
              </div>
              <div>
                <dt className="text-gray-500">사용 코드</dt>
                <dd className="font-mono text-xs">{employee.verification_code}</dd>
              </div>
              <div>
                <dt className="text-gray-500">인증 일시</dt>
                <dd className="font-medium">
                  {employee.verified_at ? new Date(employee.verified_at).toLocaleString('ko-KR') : '-'}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">권한</dt>
                <dd className="flex gap-2">
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                    {employee.role}
                  </span>
                  <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">
                    {employee.tier}
                  </span>
                </dd>
              </div>
            </dl>
          ) : (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-2">
                ⚠️ 미인증
              </div>
              <p className="text-sm text-gray-500">
                아직 카카오톡 인증을 완료하지 않았습니다
              </p>
            </div>
          )}
        </div>

        {/* Activity Stats */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold">활동 통계</h3>
          </div>

          {employee.kakao_user_id ? (
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-gray-500">총 대화 수</dt>
                <dd className="text-2xl font-bold text-purple-600">
                  {employee.total_queries}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">첫 대화</dt>
                <dd className="font-medium">
                  {employee.first_chat_at ? new Date(employee.first_chat_at).toLocaleString('ko-KR') : '-'}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">최근 대화</dt>
                <dd className="font-medium">
                  {employee.last_chat_at ? new Date(employee.last_chat_at).toLocaleString('ko-KR') : '-'}
                </dd>
              </div>
            </dl>
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-gray-500">
                활동 내역 없음
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Chat History */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">대화 내역</h2>
          <p className="text-sm text-gray-600">
            {chats.length}개의 대화 기록
          </p>
        </div>

        <div className="divide-y max-h-[600px] overflow-y-auto">
          {chats.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              대화 내역이 없습니다
            </div>
          ) : (
            chats.map((chat) => (
              <div key={chat.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between mb-2">
                  <div className="text-xs text-gray-500">
                    {new Date(chat.timestamp).toLocaleString('ko-KR')}
                  </div>
                  <div className="flex gap-2">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                      {chat.query_type}
                    </span>
                    {chat.response_time_ms && (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                        {chat.response_time_ms}ms
                      </span>
                    )}
                  </div>
                </div>

                {/* User Query */}
                <div className="mb-3">
                  <div className="text-xs text-gray-500 mb-1">👤 질문</div>
                  <div className="bg-blue-50 p-3 rounded-lg text-sm">
                    {chat.query_text}
                  </div>
                </div>

                {/* Assistant Response */}
                {chat.response_text && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">🤖 답변</div>
                    <div className="bg-gray-50 p-3 rounded-lg text-sm">
                      {chat.response_text}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
```

**API:** `/app/api/admin/employees/[id]/chats/route.ts` ✨ NEW

```typescript
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const credentialId = params.id

  // Get employee + linked profile
  const { data: credential } = await supabase
    .from('user_credentials')
    .select('*, profiles!credential_id(kakao_user_id)')
    .eq('id', credentialId)
    .single()

  if (!credential?.profiles?.kakao_user_id) {
    return NextResponse.json({
      chats: [],
      message: 'No KakaoTalk verification found'
    })
  }

  // Get chat logs
  const { data: chats } = await supabase
    .from('query_logs')
    .select('*')
    .eq('kakao_user_id', credential.profiles.kakao_user_id)
    .order('timestamp', { ascending: false })
    .limit(100)

  return NextResponse.json({
    chats: chats.map(chat => ({
      id: chat.id,
      timestamp: chat.timestamp,
      query_text: chat.query_text,
      response_text: chat.response_text,
      query_type: chat.query_type,
      response_time_ms: chat.response_time_ms,
      tokens_used: chat.tokens_used
    }))
  })
}
```

---

### **Phase 4: Pinecone Data Viewer ✨ NEW**

**Purpose:** View what's in Pinecone knowledge base

**File:** `/app/admin/pinecone/page.tsx` ✨ NEW

```tsx
'use client'

import { useState, useEffect } from 'react'
import { Search, Database, FileText, Eye } from 'lucide-react'

interface PineconeStats {
  totalVectors: number
  dimension: number
  indexFullness: number
  namespaces: {
    [key: string]: {
      vectorCount: number
    }
  }
}

interface VectorMetadata {
  id: string
  chunk_text: string
  document_id: string
  document_title?: string
  chunk_index: number
  required_role?: string
  required_tier?: string
  access_level?: string
  content_category?: string[]
  score?: number
}

export default function PineconePage() {
  const [stats, setStats] = useState<PineconeStats | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<VectorMetadata[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedNamespace, setSelectedNamespace] = useState<string>('default')

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    const response = await fetch('/api/admin/pinecone/stats')
    const data = await response.json()
    setStats(data.stats)
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setLoading(true)

    const response = await fetch('/api/admin/pinecone/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: searchQuery,
        namespace: selectedNamespace,
        topK: 10
      })
    })

    const data = await response.json()
    setSearchResults(data.results || [])
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Pinecone 지식 베이스</h1>
        <p className="text-gray-600">
          벡터 데이터베이스에 저장된 문서를 검색하고 관리합니다
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center gap-2 mb-2">
              <Database className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold">전체 벡터 수</h3>
            </div>
            <div className="text-3xl font-bold text-blue-600">
              {stats.totalVectors.toLocaleString()}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold">차원</h3>
            </div>
            <div className="text-3xl font-bold text-green-600">
              {stats.dimension}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="w-5 h-5 text-purple-600" />
              <h3 className="font-semibold">인덱스 사용률</h3>
            </div>
            <div className="text-3xl font-bold text-purple-600">
              {(stats.indexFullness * 100).toFixed(1)}%
            </div>
          </div>
        </div>
      )}

      {/* Search Section */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">벡터 검색</h2>

        <div className="flex gap-4 mb-4">
          <input
            type="text"
            placeholder="검색어 입력 (의미 기반 검색)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1 px-4 py-2 border rounded-lg"
          />

          <select
            value={selectedNamespace}
            onChange={(e) => setSelectedNamespace(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="default">기본 네임스페이스</option>
            {stats && Object.keys(stats.namespaces).map(ns => (
              <option key={ns} value={ns}>
                {ns} ({stats.namespaces[ns].vectorCount} vectors)
              </option>
            ))}
          </select>

          <button
            onClick={handleSearch}
            disabled={loading || !searchQuery.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '검색 중...' : '검색'}
          </button>
        </div>

        <p className="text-sm text-gray-600">
          💡 의미 기반 검색으로 관련 문서 청크를 찾습니다
        </p>
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold">검색 결과</h2>
            <p className="text-sm text-gray-600">
              {searchResults.length}개 결과 (유사도 순)
            </p>
          </div>

          <div className="divide-y">
            {searchResults.map((result, index) => (
              <div key={result.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg font-semibold text-gray-900">
                        #{index + 1}
                      </span>
                      {result.document_title && (
                        <span className="text-sm text-gray-600">
                          {result.document_title}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      Chunk {result.chunk_index} • ID: {result.id.substring(0, 20)}...
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {result.score && (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                        {(result.score * 100).toFixed(1)}% 유사
                      </span>
                    )}
                    {result.access_level && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                        {result.access_level}
                      </span>
                    )}
                  </div>
                </div>

                {/* Chunk Text */}
                <div className="bg-gray-50 p-4 rounded-lg text-sm">
                  {result.chunk_text}
                </div>

                {/* Metadata */}
                <div className="mt-2 flex flex-wrap gap-2">
                  {result.required_role && (
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded">
                      Role: {result.required_role}
                    </span>
                  )}
                  {result.required_tier && (
                    <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded">
                      Tier: {result.required_tier}
                    </span>
                  )}
                  {result.content_category && result.content_category.length > 0 && (
                    result.content_category.map(cat => (
                      <span key={cat} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                        {cat}
                      </span>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
```

**APIs:**

**1. `/app/api/admin/pinecone/stats/route.ts` ✨ NEW**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { Pinecone } from '@pinecone-database/pinecone'

export async function GET(req: NextRequest) {
  try {
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!
    })

    const index = pinecone.index(process.env.PINECONE_INDEX_NAME!)

    // Get index stats
    const stats = await index.describeIndexStats()

    return NextResponse.json({
      stats: {
        totalVectors: stats.totalRecordCount || 0,
        dimension: stats.dimension || 3072,
        indexFullness: stats.indexFullness || 0,
        namespaces: stats.namespaces || {}
      }
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get Pinecone stats' },
      { status: 500 }
    )
  }
}
```

**2. `/app/api/admin/pinecone/search/route.ts` ✨ NEW**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { Pinecone } from '@pinecone-database/pinecone'
import { OpenAI } from 'openai'

export async function POST(req: NextRequest) {
  try {
    const { query, namespace = 'default', topK = 10 } = await req.json()

    // Generate query embedding
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-large',
      input: query,
      dimensions: 3072
    })

    const queryEmbedding = embeddingResponse.data[0].embedding

    // Search Pinecone
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!
    })

    const index = pinecone.index(process.env.PINECONE_INDEX_NAME!)

    const searchResponse = await index.namespace(namespace).query({
      vector: queryEmbedding,
      topK,
      includeMetadata: true
    })

    // Format results
    const results = searchResponse.matches?.map(match => ({
      id: match.id,
      score: match.score,
      chunk_text: match.metadata?.chunk_text || '',
      document_id: match.metadata?.document_id || '',
      document_title: match.metadata?.document_title || '',
      chunk_index: match.metadata?.chunk_index || 0,
      required_role: match.metadata?.required_role || '',
      required_tier: match.metadata?.required_tier || '',
      access_level: match.metadata?.access_level || '',
      content_category: match.metadata?.content_category || []
    })) || []

    return NextResponse.json({ results })
  } catch (error) {
    console.error('Pinecone search error:', error)
    return NextResponse.json(
      { error: 'Failed to search Pinecone' },
      { status: 500 }
    )
  }
}
```

---

### **Phase 5: Payment Page ✨ NEW (Simple Version)**

**File:** `/app/admin/payments/page.tsx` ✨ NEW

```tsx
'use client'

import { useState } from 'react'
import { CreditCard, DollarSign, Calendar } from 'lucide-react'

interface Subscription {
  tier: string
  price: number
  status: 'active' | 'cancelled' | 'expired'
  startDate: string
  endDate: string
}

export default function PaymentsPage() {
  const [currentSub, setCurrentSub] = useState<Subscription>({
    tier: 'pro',
    price: 99000,
    status: 'active',
    startDate: '2025-01-01',
    endDate: '2025-12-31'
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">구독 및 결제</h1>
        <p className="text-gray-600">
          현재 구독 플랜과 결제 정보를 관리합니다
        </p>
      </div>

      {/* Current Subscription */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">현재 플랜</h2>
          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
            {currentSub.status === 'active' ? '✅ 활성' : '⚠️ 비활성'}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-6 mb-6">
          <div>
            <div className="text-sm text-gray-500 mb-1">플랜</div>
            <div className="text-2xl font-bold text-blue-600 uppercase">
              {currentSub.tier}
            </div>
          </div>

          <div>
            <div className="text-sm text-gray-500 mb-1">월 요금</div>
            <div className="text-2xl font-bold">
              ₩{currentSub.price.toLocaleString()}
            </div>
          </div>

          <div>
            <div className="text-sm text-gray-500 mb-1">다음 결제일</div>
            <div className="text-lg font-medium">
              {new Date(currentSub.endDate).toLocaleDateString('ko-KR')}
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            플랜 업그레이드
          </button>
          <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
            구독 취소
          </button>
        </div>
      </div>

      {/* Available Plans */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-6">사용 가능한 플랜</h2>

        <div className="grid grid-cols-4 gap-4">
          {[
            { name: 'Free', price: 0, features: ['기본 RAG', '10개 문서', '100 쿼리/월'] },
            { name: 'Basic', price: 39000, features: ['기본 RAG', '50개 문서', '1000 쿼리/월'] },
            { name: 'Pro', price: 99000, features: ['고급 RAG', '무제한 문서', '무제한 쿼리'] },
            { name: 'Enterprise', price: 299000, features: ['맞춤 설정', '전담 지원', 'API 접근'] }
          ].map(plan => (
            <div
              key={plan.name}
              className={`p-4 border-2 rounded-lg ${
                currentSub.tier === plan.name.toLowerCase()
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              <div className="text-lg font-semibold mb-2">{plan.name}</div>
              <div className="text-2xl font-bold mb-4">
                ₩{plan.price.toLocaleString()}
                <span className="text-sm font-normal text-gray-500">/월</span>
              </div>

              <ul className="space-y-1 text-sm text-gray-600 mb-4">
                {plan.features.map(feature => (
                  <li key={feature}>✓ {feature}</li>
                ))}
              </ul>

              {currentSub.tier === plan.name.toLowerCase() ? (
                <button className="w-full px-4 py-2 bg-gray-300 text-gray-600 rounded cursor-not-allowed">
                  현재 플랜
                </button>
              ) : (
                <button className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                  선택
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Payment History */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">결제 내역</h2>

        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                날짜
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                설명
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                금액
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                상태
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {/* Sample data - replace with real payment history */}
            <tr>
              <td className="px-4 py-3 text-sm">2025-11-01</td>
              <td className="px-4 py-3 text-sm">Pro Plan - 월 구독</td>
              <td className="px-4 py-3 text-sm font-medium">₩99,000</td>
              <td className="px-4 py-3">
                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                  완료
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

---

## 🎯 Complete Workflow Summary

### **Admin Workflow**

1. **Bulk Upload Employees**
   - `/admin/credentials` → Upload CSV with employee data
   - System creates `user_credentials` records
   - Status: `pending` (not yet verified)

2. **Generate Codes for Employees**
   - After upload, click "Generate Codes for All"
   - System creates `verification_codes` linked to each `user_credentials`
   - Each code has: `role`, `tier`, `intended_recipient_id`, `requires_credential_match: true`
   - Download CSV with codes for distribution

3. **Distribute Codes**
   - Send codes via KakaoTalk DM, email, or SMS (manual)
   - Future: Auto-distribution via API

4. **Monitor Employees**
   - `/admin/employees` → View all employees
   - See who's verified (has `kakao_user_id`)
   - See who's active (recent `last_chat_at`)

5. **View Employee Chats**
   - `/admin/employees/[id]` → See employee detail
   - View full conversation history
   - Monitor activity stats

6. **Manage Knowledge Base**
   - `/admin/data/upload` → Upload documents with RBAC settings
   - `/admin/pinecone` → Search and verify what's in Pinecone

7. **Manage Subscription**
   - `/admin/payments` → View current plan, upgrade, payment history

### **Employee (KakaoTalk User) Workflow**

1. **Add JISA Channel**
   - Search "JISA" in KakaoTalk
   - Add channel (public, anyone can add)

2. **Verify with Code**
   - First message: `HXK-9F2-M7Q-3WP` (code received from admin)
   - Backend verifies code:
     - ✅ Code valid?
     - ✅ Not expired?
     - ✅ Not already used?
     - ✅ (Optional) Matches intended recipient's credential?
   - Creates `profile` with `kakao_user_id`, links to `user_credentials`
   - User receives: "✅ 인증 완료! 역할: Senior, 등급: Pro"

3. **Ask Questions**
   - Send message: "11월 교육 일정"
   - Backend:
     - Gets profile by `kakao_user_id`
     - Gets `role`, `tier` from profile
     - Calls RAG with RBAC filters
     - Returns filtered answer
   - User receives answer based on their access level

4. **Continuous Use**
   - All subsequent messages processed with RBAC
   - All conversations logged to `query_logs`, `chat_logs`
   - Admin can monitor via `/admin/employees/[id]`

---

## 📋 Database Schema Reference

### **Key Tables**

```sql
-- User Credentials (uploaded employees)
user_credentials
├─ id (UUID, PK)
├─ full_name (TEXT, required)
├─ email (TEXT, unique)
├─ employee_id (TEXT, unique)
├─ department, team, position, hire_date, location
├─ status ('pending' | 'verified' | 'suspended' | 'inactive')
├─ metadata (JSONB) -- stores tier, role for unverified users
└─ created_by (UUID → profiles.id)

-- Verification Codes
verification_codes
├─ id (UUID, PK)
├─ code (TEXT, unique, e.g., "HXK-9F2-M7Q-3WP")
├─ role, tier (assigned on verification)
├─ max_uses, current_uses, status
├─ intended_recipient_id (UUID → user_credentials.id) ✅
├─ requires_credential_match (BOOLEAN) ✅
├─ used_by (TEXT[], array of kakao_user_ids)
└─ expires_at (TIMESTAMPTZ)

-- Profiles (KakaoTalk users + Admins)
profiles
├─ id (UUID, PK)
├─ kakao_user_id (TEXT, unique) -- for KakaoTalk users
├─ kakao_nickname (TEXT)
├─ email (TEXT, unique) -- for admin users
├─ full_name (TEXT)
├─ role ('user' | 'junior' | 'senior' | 'manager' | 'admin' | 'ceo')
├─ subscription_tier ('free' | 'basic' | 'pro' | 'enterprise')
├─ credential_id (UUID → user_credentials.id) ✅
├─ verified_with_code (TEXT) -- which code was used
├─ first_chat_at, last_chat_at (TIMESTAMPTZ)
└─ metadata (JSONB)

-- Query Logs (all queries)
query_logs
├─ id (UUID, PK)
├─ kakao_user_id (TEXT) -- for KakaoTalk users
├─ user_id (UUID) -- for admin users
├─ query_text (TEXT)
├─ response_text (TEXT)
├─ query_type ('rag' | 'commission' | 'general')
├─ response_time_ms (INTEGER)
├─ tokens_used (INTEGER)
└─ timestamp (TIMESTAMPTZ)

-- Documents (uploaded files)
documents
├─ id (UUID, PK)
├─ title, file_path, file_type
├─ access_level ('public' | 'basic' | 'intermediate' | 'advanced' | 'confidential')
├─ required_role (TEXT)
├─ required_tier (TEXT)
├─ sensitivity_level ('public' | 'internal' | 'confidential' | 'secret')
└─ uploaded_by (UUID)

-- Contexts (document chunks → synced to Pinecone)
contexts
├─ id (UUID, PK)
├─ document_id (UUID → documents.id)
├─ chunk_text (TEXT)
├─ chunk_index (INTEGER)
├─ embedding (VECTOR) -- 3072 dimensions
├─ required_role, required_tier, access_level (mirrored from document)
└─ metadata (JSONB)
```

---

## 🚀 Next Steps

### **Immediate Actions (Priority 1)**

1. ✅ **Enhance `/admin/credentials` page**
   - Add CSV upload UI
   - Add preview table
   - Add validation

2. ✅ **Create bulk upload API**
   - `/api/admin/credentials/bulk-upload`
   - CSV parsing
   - Validation
   - Batch insert

3. ✅ **Create code generation for uploaded employees**
   - `/api/admin/credentials/generate-codes`
   - Auto-link codes to credentials
   - Download CSV export

4. ✅ **Create employee management pages**
   - Rename `/admin/users` → `/admin/employees`
   - Show employee + verification status
   - Click to see detail page

5. ✅ **Create employee detail page**
   - `/admin/employees/[id]`
   - Employee info
   - Chat history
   - Activity stats

6. ✅ **Create Pinecone viewer**
   - `/admin/pinecone`
   - Index stats
   - Vector search UI

7. ✅ **Create payment page**
   - `/admin/payments`
   - Current subscription
   - Plan selection
   - Payment history

### **Cleanup Actions (Priority 2)**

1. **Archive unnecessary pages**
   ```bash
   mkdir archived_pages
   mv app/admin/classification archived_pages/
   mv app/admin/data/contexts archived_pages/
   mv app/admin/data/jobs archived_pages/
   mv app/admin/data/documents archived_pages/
   mv app/admin/analytics archived_pages/
   mv app/dashboard archived_pages/
   mv app/admin/billing archived_pages/
   ```

2. **Update navigation**
   - Remove links to archived pages
   - Add links to new pages
   - Simplify admin sidebar

---

## 📝 Notes

**✅ What's Already Working:**
- Database schema is complete and production-ready
- Code generation with credential linking exists
- Basic employee management exists
- RAG with RBAC filtering works
- KakaoTalk webhook integration works

**✨ What Needs to be Added:**
- Bulk CSV upload UI + API
- Auto-code generation for bulk uploads
- Enhanced employee view with chat history
- Pinecone data viewer
- Simple payment page

**❌ What to Remove:**
- Over-engineered analytics
- Unnecessary content classification
- Complex job monitoring
- User dashboard (not needed for KakaoTalk-only users)

---

## 🎓 Implementation Guidance

**For Developers:**

1. **Start with Phase 2** (Bulk Upload)
   - Easiest to implement
   - High user value
   - Foundation for other features

2. **Then Phase 3** (Employee Management)
   - Leverage existing data
   - Mostly UI work
   - Clear user benefit

3. **Then Phase 4** (Pinecone Viewer)
   - Good for debugging
   - Helps validate knowledge base

4. **Finally Phase 5** (Payments)
   - Can be placeholder initially
   - Integrate real payment later

**Estimated Time:**
- Phase 2 (Bulk Upload): 4-6 hours
- Phase 3 (Employee Views): 6-8 hours
- Phase 4 (Pinecone Viewer): 3-4 hours
- Phase 5 (Payment Page): 2-3 hours
- Cleanup: 1-2 hours

**Total: ~20 hours of focused development**

---

**Document Version:** 1.0
**Created:** November 17, 2025
**Database:** kuixphvkbuuzfezoeyii
**Status:** Ready for Implementation
