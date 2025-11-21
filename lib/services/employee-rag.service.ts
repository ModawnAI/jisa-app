/**
 * Employee RAG Service
 *
 * Provides employee-specific RAG functionality with Pinecone namespace isolation.
 * Each employee can only query their own compensation data through their
 * dedicated namespace.
 *
 * Security Architecture:
 * - Layer 1: Namespace Isolation (Infrastructure-level at Pinecone)
 * - Layer 2: Metadata Filtering (Query-level validation)
 * - Layer 3: JWT Authentication (Application-level)
 */

import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';
import { createClient } from '@supabase/supabase-js';

// Initialize clients
const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Constants
const INDEX_NAME = process.env.PINECONE_INDEX || 'hof-branch-chatbot';
const EMBEDDING_MODEL = 'text-embedding-3-large';
const EMBEDDING_DIMENSIONS = 3072;
const RELEVANCE_THRESHOLD = 0.3;

// Types
export interface EmployeeRAGQuery {
  userId: string; // Profile ID (UUID)
  query: string;
  topK?: number;
}

export interface EmployeeRAGResult {
  answer: string;
  sources: Array<{
    id: string;
    score: number;
    doc_type: string;
    metadata: Record<string, any>;
  }>;
  namespace: string;
  employee_id: string;
  query_stats: {
    vectors_searched: number;
    max_score: number;
    results_count: number;
    query_duration_ms: number;
  };
}

export interface EmployeeInfo {
  profileId: string;
  employeeId: string; // sabon
  fullName: string;
  pineconeNamespace: string;
  ragEnabled: boolean;
  vectorCount: number;
}

/**
 * Get employee info from profile ID
 */
export async function getEmployeeInfo(profileId: string): Promise<EmployeeInfo | null> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select(`
      id,
      pinecone_namespace,
      rag_enabled,
      credential_id,
      user_credentials!profiles_credential_id_fkey (
        employee_id,
        full_name,
        rag_vector_count
      )
    `)
    .eq('id', profileId)
    .single();

  if (error || !profile) {
    console.error('❌ Failed to fetch employee info:', error);
    return null;
  }

  const credential = profile.user_credentials as any;

  if (!credential || !credential.employee_id) {
    console.error('❌ No employee credential found for profile:', profileId);
    return null;
  }

  if (!profile.pinecone_namespace) {
    console.error('❌ No Pinecone namespace configured for employee:', credential.employee_id);
    return null;
  }

  return {
    profileId: profile.id,
    employeeId: credential.employee_id,
    fullName: credential.full_name,
    pineconeNamespace: profile.pinecone_namespace,
    ragEnabled: profile.rag_enabled || false,
    vectorCount: credential.rag_vector_count || 0,
  };
}

/**
 * Generate embedding using OpenAI
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openaiClient.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
    dimensions: EMBEDDING_DIMENSIONS,
  });

  return response.data[0].embedding;
}

/**
 * Search Pinecone with employee namespace isolation
 */
export async function searchEmployeeNamespace(
  namespace: string,
  employeeId: string,
  embedding: number[],
  topK: number = 10
): Promise<any> {
  const index = pinecone.index(INDEX_NAME);

  // Layer 1: Namespace isolation (infrastructure-level)
  // Layer 2: Metadata filter (query-level backup security)
  const queryParams: any = {
    vector: embedding,
    topK,
    includeMetadata: true,
    filter: {
      사번: { $eq: employeeId }, // Backup security layer
    },
  };

  const results = await index.namespace(namespace).query(queryParams);

  // Layer 3: Validate results (application-level paranoid check)
  for (const match of results.matches || []) {
    if (match.metadata?.사번 !== employeeId) {
      console.error('🚨 SECURITY VIOLATION: Data leak detected!');
      console.error(`   Expected employee: ${employeeId}`);
      console.error(`   Got employee: ${match.metadata?.사번}`);
      throw new Error('Security validation failed: employee ID mismatch');
    }
  }

  return results;
}

/**
 * Format context for LLM from Pinecone results
 */
function formatEmployeeContext(results: any): string {
  if (!results.matches || results.matches.length === 0) {
    return '검색 결과가 없습니다.';
  }

  const contextParts: string[] = [];

  for (let idx = 0; idx < results.matches.length; idx++) {
    const match = results.matches[idx];
    const meta = match.metadata;
    const docType = meta?.doc_type || 'N/A';

    let context = `\n## 문서 ${idx + 1} (관련도: ${match.score.toFixed(3)})\n`;
    context += `\n**문서 유형:** ${docType}\n`;

    // Personal financial summary
    if (docType === 'personal_financial_summary') {
      if (meta?.최종지급액) context += `**최종지급액:** ${meta.최종지급액.toLocaleString()}원\n`;
      if (meta?.총수입) context += `**총수입:** ${meta.총수입.toLocaleString()}원\n`;
      if (meta?.총환수) context += `**총환수:** ${meta.총환수.toLocaleString()}원\n`;
      if (meta?.환수비율) context += `**환수비율:** ${meta.환수비율}%\n`;
    }

    // Contract information
    if (docType === 'my_contract') {
      if (meta?.보험사) context += `**보험사:** ${meta.보험사}\n`;
      if (meta?.상품명) context += `**상품명:** ${meta.상품명}\n`;
      if (meta?.계약상태) context += `**계약상태:** ${meta.계약상태}\n`;
      if (meta?.월납입보험료) context += `**월납입보험료:** ${meta.월납입보험료.toLocaleString()}원\n`;
      if (meta?.수수료) context += `**수수료:** ${meta.수수료.toLocaleString()}원\n`;
    }

    // Override summary
    if (docType === 'my_override') {
      if (meta?.오버라이드수입) context += `**오버라이드수입:** ${meta.오버라이드수입.toLocaleString()}원\n`;
    }

    // Clawback information
    if (docType === 'my_clawback') {
      if (meta?.환수금액) context += `**환수금액:** ${meta.환수금액.toLocaleString()}원\n`;
      if (meta?.환수사유) context += `**환수사유:** ${meta.환수사유}\n`;
    }

    // Add searchable text
    const searchableText = meta?.searchable_text || meta?.natural_description || meta?.text || '';
    if (searchableText) {
      context += `\n**상세 내용:**\n${searchableText}\n`;
    }

    contextParts.push(context);
  }

  return contextParts.join('\n');
}

/**
 * Generate answer using Gemini Flash
 */
export async function generateEmployeeAnswer(
  query: string,
  context: string,
  employeeName: string
): Promise<string> {
  const prompt = `당신은 보험 설계사 급여 도우미 AI입니다. ${employeeName}님의 급여 정보 질문에 답변하세요.

사용자 질문:
${query}

검색된 급여 정보:
${context}

답변 지침:
1. 정확성: 검색된 정보만을 사용하여 답변하세요
2. 친절함: 존댓말을 사용하고 이해하기 쉽게 설명하세요
3. 구체성: 구체적인 숫자와 근거를 제시하세요
4. 실용성: 필요시 실행 가능한 조언을 포함하세요
5. 형식: 순수 텍스트만 사용하고 마크다운 기호는 사용하지 마세요

답변을 시작하세요:`;

  try {
    const response = await genai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: prompt,
    });

    return response.text || '';
  } catch (error) {
    console.error('❌ Answer generation error:', error);
    return '죄송합니다. 답변을 생성하는 중 오류가 발생했습니다.';
  }
}

/**
 * Log employee RAG query
 */
async function logEmployeeQuery(
  profileId: string,
  employeeId: string,
  namespace: string,
  query: string,
  results: any,
  stats: any
): Promise<void> {
  try {
    await supabase.from('employee_rag_queries').insert({
      profile_id: profileId,
      employee_id: employeeId,
      pinecone_namespace: namespace,
      query_text: query,
      query_type: 'employee_rag',
      vectors_searched: results.matches?.length || 0,
      top_k: stats.topK,
      max_score: results.matches?.[0]?.score || 0,
      results_count: results.matches?.length || 0,
      response_generated: true,
      query_duration_ms: stats.query_duration_ms,
      metadata: {
        query_timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('⚠️  Failed to log query:', error);
    // Non-critical error, don't throw
  }
}

/**
 * Main employee RAG query function
 */
export async function queryEmployeeRAG(
  input: EmployeeRAGQuery
): Promise<EmployeeRAGResult> {
  const startTime = Date.now();
  const { userId, query, topK = 10 } = input;

  console.log(`\n🔍 Employee RAG Query`);
  console.log(`   User ID: ${userId}`);
  console.log(`   Query: ${query}`);

  // Step 1: Get employee info
  const employeeInfo = await getEmployeeInfo(userId);

  if (!employeeInfo) {
    throw new Error('Employee information not found. Please contact administrator.');
  }

  if (!employeeInfo.ragEnabled) {
    throw new Error('RAG system is not enabled for your account. Please contact administrator.');
  }

  console.log(`   Employee: ${employeeInfo.fullName} (${employeeInfo.employeeId})`);
  console.log(`   Namespace: ${employeeInfo.pineconeNamespace}`);
  console.log(`   Vectors: ${employeeInfo.vectorCount}`);

  // Step 2: Generate embedding
  console.log('🔄 Generating embedding...');
  const embeddingStart = Date.now();
  const embedding = await generateEmbedding(query);
  const embeddingDuration = Date.now() - embeddingStart;
  console.log(`   ✅ Embedding generated (${embedding.length} dims, ${embeddingDuration}ms)`);

  // Step 3: Search employee namespace
  console.log(`🔍 Searching namespace: ${employeeInfo.pineconeNamespace}...`);
  const searchStart = Date.now();
  const results = await searchEmployeeNamespace(
    employeeInfo.pineconeNamespace,
    employeeInfo.employeeId,
    embedding,
    topK
  );
  const searchDuration = Date.now() - searchStart;
  console.log(`   ✅ Found ${results.matches?.length || 0} results (${searchDuration}ms)`);

  // Check relevance
  if (results.matches.length === 0) {
    const noResultsAnswer = `안녕하세요 ${employeeInfo.fullName}님,

질문하신 내용과 관련된 급여 정보를 찾을 수 없습니다.

다음과 같은 질문을 해보세요:
- 내 최종지급액은?
- 이번 달 수수료는?
- 환수가 얼마야?
- 내 계약 몇 개야?
- 메리츠화재 계약 정보

무엇을 도와드릴까요?`;

    return {
      answer: noResultsAnswer,
      sources: [],
      namespace: employeeInfo.pineconeNamespace,
      employee_id: employeeInfo.employeeId,
      query_stats: {
        vectors_searched: 0,
        max_score: 0,
        results_count: 0,
        query_duration_ms: Date.now() - startTime,
      },
    };
  }

  const maxScore = Math.max(...results.matches.map((m: any) => m.score));
  console.log(`   📊 Max relevance score: ${maxScore.toFixed(3)}`);

  if (maxScore < RELEVANCE_THRESHOLD) {
    const lowRelevanceAnswer = `안녕하세요 ${employeeInfo.fullName}님,

질문하신 내용과 관련도가 낮은 결과만 찾았습니다.

더 구체적인 질문을 해주시면 정확한 답변을 드릴 수 있습니다.

예시:
- 202509 최종지급액
- 메리츠화재 계약 현황
- 환수 발생 이유

무엇을 도와드릴까요?`;

    return {
      answer: lowRelevanceAnswer,
      sources: results.matches.slice(0, 3).map((m: any) => ({
        id: m.id,
        score: m.score,
        doc_type: m.metadata?.doc_type || 'unknown',
        metadata: m.metadata,
      })),
      namespace: employeeInfo.pineconeNamespace,
      employee_id: employeeInfo.employeeId,
      query_stats: {
        vectors_searched: results.matches.length,
        max_score: maxScore,
        results_count: results.matches.length,
        query_duration_ms: Date.now() - startTime,
      },
    };
  }

  // Step 4: Format context
  const context = formatEmployeeContext(results);

  // Step 5: Generate answer
  console.log('💬 Generating answer...');
  const generationStart = Date.now();
  const answer = await generateEmployeeAnswer(query, context, employeeInfo.fullName);
  const generationDuration = Date.now() - generationStart;
  console.log(`   ✅ Answer generated (${answer.length} chars, ${generationDuration}ms)`);

  const totalDuration = Date.now() - startTime;

  // Step 6: Log query
  await logEmployeeQuery(
    userId,
    employeeInfo.employeeId,
    employeeInfo.pineconeNamespace,
    query,
    results,
    {
      topK,
      query_duration_ms: totalDuration,
    }
  );

  console.log(`✅ Total duration: ${totalDuration}ms\n`);

  return {
    answer,
    sources: results.matches.slice(0, 3).map((m: any) => ({
      id: m.id,
      score: m.score,
      doc_type: m.metadata?.doc_type || 'unknown',
      metadata: m.metadata,
    })),
    namespace: employeeInfo.pineconeNamespace,
    employee_id: employeeInfo.employeeId,
    query_stats: {
      vectors_searched: results.matches.length,
      max_score: maxScore,
      results_count: results.matches.length,
      query_duration_ms: totalDuration,
    },
  };
}

/**
 * Detect if query should use employee RAG (starts with "/")
 */
export function isEmployeeRAGQuery(query: string): boolean {
  return query.trim().startsWith('/');
}

/**
 * Strip "/" prefix from employee RAG query
 */
export function cleanEmployeeRAGQuery(query: string): string {
  return query.trim().replace(/^\/+/, '').trim();
}
