/**
 * Enhanced RAG Service with RBAC
 * Wraps existing RAG service with role-based access control
 * Phase 5.2: RBAC in RAG Pipeline
 */

import {
  enhanceQueryWithGeminiFlash,
  generateEmbedding,
  searchPinecone,
  formatContext,
  getRelevantPdfs,
  formatPdfAttachments,
  type PineconeQueryResult,
} from './rag.service';
import { RBACService } from './rbac.service';
import { createServiceClient } from '@/lib/supabase/server';
import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

/**
 * RAG Answer with RBAC filtering
 */
export async function ragAnswerWithRBAC(
  userQuery: string,
  userId: string | null,
  topK: number = 10
): Promise<string> {
  try {
    console.log('[RAG-RBAC] Starting RAG with RBAC for user:', userId);

    // Step 1: Load metadata
    const metadataPath = path.join(process.cwd(), 'metadata_key.json');
    const metadataKey = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));

    // Step 2: Enhance query
    console.log('[RAG-RBAC] Step 1: Query Enhancement');
    const enhanced = await enhanceQueryWithGeminiFlash(userQuery, metadataKey);

    // Step 3: Generate embedding
    console.log('[RAG-RBAC] Step 2: Embedding Generation');
    const embedding = await generateEmbedding(enhanced.enhanced_query);

    // Step 4: Search with RBAC
    console.log('[RAG-RBAC] Step 3: Pinecone Search with RBAC');
    const results = await searchPineconeWithRBAC(
      embedding,
      enhanced.filters,
      userId,
      topK
    );

    console.log(`[RAG-RBAC] Found ${results.matches.length} accessible results`);

    // Step 5: Format context
    const context = formatContext(results);

    // Step 6: Get PDFs
    const pdfs = getRelevantPdfs(userQuery, results);

    // Step 7: Generate answer
    console.log('[RAG-RBAC] Step 4: Answer Generation');
    const answer = await generateAnswerWithGemini(userQuery, context);

    // Step 8: Attach PDFs
    let finalAnswer = answer;
    if (pdfs.length > 0) {
      finalAnswer += formatPdfAttachments(pdfs);
    }

    // Log query
    if (userId) {
      await logRAGQuery(userId, userQuery, finalAnswer, results.matches.length);
    }

    return finalAnswer;
  } catch (error) {
    console.error('[RAG-RBAC] Error:', error);
    return '죄송합니다. 답변 생성 중 오류가 발생했습니다.';
  }
}

/**
 * Search Pinecone with RBAC filtering
 */
export async function searchPineconeWithRBAC(
  embedding: number[],
  queryFilters: Record<string, any> | null,
  userId: string | null,
  topK: number = 10
): Promise<PineconeQueryResult> {
  const rbacService = new RBACService();
  let combinedFilter: any = null;

  // Apply RBAC filtering for authenticated users
  if (userId) {
    const rbacFilter = await rbacService.buildPineconeFilter(userId);

    if (queryFilters) {
      combinedFilter = { $and: [queryFilters, rbacFilter] };
    } else {
      combinedFilter = rbacFilter;
    }

    console.log('[RAG-RBAC] RBAC filter applied');
  } else {
    // Unauthenticated: public content only
    if (queryFilters) {
      combinedFilter = {
        $and: [queryFilters, { access_level: { $in: ['public'] } }],
      };
    } else {
      combinedFilter = { access_level: { $in: ['public'] } };
    }

    console.log('[RAG-RBAC] Public content only (unauthenticated)');
  }

  // Search Pinecone
  const results = await searchPinecone(embedding, combinedFilter, topK);

  // Post-filter by metadata
  if (userId) {
    return await filterResultsByMetadata(userId, results);
  }

  return results;
}

/**
 * Post-filter results by metadata-based access control
 */
async function filterResultsByMetadata(
  userId: string,
  results: PineconeQueryResult
): Promise<PineconeQueryResult> {
  const rbacService = new RBACService();
  const accessibleMatches = [];

  for (const match of results.matches) {
    const { allowed, reason } = await rbacService.canAccessContent(
      userId,
      match.metadata
    );

    if (allowed) {
      accessibleMatches.push(match);
    } else {
      console.log(`[RAG-RBAC] Filtered result ${match.id}: ${reason}`);

      // Log access denial for audit
      await rbacService.logAccessAttempt({
        userId,
        resourceType: 'context',
        resourceId: match.id,
        accessGranted: false,
        denialReason: reason,
      });
    }
  }

  return { matches: accessibleMatches };
}

/**
 * Generate answer with Gemini
 */
async function generateAnswerWithGemini(
  userQuery: string,
  context: string
): Promise<string> {
  const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

  const systemPrompt = `당신은 한국 보험 지사의 전문 AI 어시스턴트입니다.

## 역할:
- 제공된 컨텍스트만 사용하여 정확하게 답변
- 한국어로 명확하고 전문적인 답변 제공
- 수치는 정확하게 표현 (%, 금액 등)

## 컨텍스트:
${context}

## 답변 지침:
1. 컨텍스트에 정보가 있으면 자세히 설명
2. 컨텍스트에 정보가 없으면 "제공된 자료에서 해당 정보를 찾을 수 없습니다" 라고 명확히 전달
3. 추측하지 말고 확인된 정보만 제공
4. 한국어 자연스럽게 작성
5. 필요시 표 형식으로 정리`;

  const response = await genai.models.generateContent({
    model: 'gemini-flash-latest',
    contents: `${systemPrompt}\n\n## 사용자 질문:\n${userQuery}`,
  });

  return response.text || '';
}

/**
 * Log RAG query
 */
async function logRAGQuery(
  userId: string,
  query: string,
  response: string,
  resultsCount: number
): Promise<void> {
  try {
    const supabase = createServiceClient();

    await supabase.from('query_logs').insert({
      user_id: userId,
      session_id: `session_${Date.now()}`,
      query_text: query,
      response_text: response,
      query_type: 'rag',
      metadata: {
        results_count: resultsCount,
        has_rbac: true,
      },
    });
  } catch (error) {
    console.error('[RAG-RBAC] Failed to log query:', error);
  }
}
