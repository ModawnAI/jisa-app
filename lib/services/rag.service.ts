/**
 * RAG Service - Complete TypeScript Port from Python
 *
 * Pipeline:
 * 1. User Query → Gemini Flash (query enhancement with metadata_key.json)
 * 2. Enhanced Query → OpenAI Embeddings → Pinecone (retrieve top K results)
 * 3. Retrieved Context → Gemini Flash (generate final answer)
 */

import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';
import fs from 'fs';
import path from 'path';

// Initialize clients
const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });

// Constants
const INDEX_NAME = process.env.PINECONE_INDEX || 'hof-branch-chatbot';
const NAMESPACE = 'hof-knowledge-base-max';
const EMBEDDING_MODEL = 'text-embedding-3-large';
const EMBEDDING_DIMENSIONS = 3072;
const RELEVANCE_THRESHOLD = 0.3;

// Types
export interface MetadataKey {
  chunk_types: string[];
  content_types: string[];
  primary_categories: string[];
  companies: string[];
  product_names_examples: string[];
  presenters_examples: string[];
  locations: string[];
  payment_terms: string[];
  commission_categories: string[];
  commission_periods: string[];
  boolean_filters: string[];
}

export interface PdfAttachment {
  description: string;
  url: string;
}

export interface EnhancedQuery {
  enhanced_query: string;
  filters: Record<string, any> | null;
  reasoning: string;
}

export interface PineconeMatch {
  id: string;
  score: number;
  metadata: Record<string, any>;
}

export interface PineconeQueryResult {
  matches: PineconeMatch[];
}

/**
 * Load metadata key configuration
 */
function loadMetadataKey(): MetadataKey {
  const metadataPath = path.join(process.cwd(), 'metadata_key.json');
  const content = fs.readFileSync(metadataPath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Load PDF URLs configuration
 */
function loadPdfUrls(): { schedule_pdfs: PdfAttachment[]; policy_pdfs: PdfAttachment[] } {
  const pdfUrlsPath = path.join(process.cwd(), 'pdf_urls.json');
  const content = fs.readFileSync(pdfUrlsPath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Determine which PDFs to attach based on query and results
 */
export function getRelevantPdfs(userQuery: string, results: PineconeQueryResult): PdfAttachment[] {
  const pdfConfig = loadPdfUrls();
  const relevantPdfs: PdfAttachment[] = [];

  // Check if query is about schedules/training/education
  const scheduleKeywords = ['일정', '스케줄', '교육', '강의', '시험', '행사', 'KRS', '입문과정', '시간표'];
  const isScheduleQuery = scheduleKeywords.some(keyword => userQuery.includes(keyword));

  // Check if query is about Hanwha commissions/policies
  const hanwhaKeywords = ['한화생명', '한화', '시책', '수수료', '커미션', '익월', '13차월'];
  const isHanwhaQuery = hanwhaKeywords.some(keyword => userQuery.includes(keyword));

  // Check results for schedule or Hanwha data
  let hasScheduleResults = false;
  let hasHanwhaResults = false;

  if (results.matches) {
    for (const match of results.matches.slice(0, 5)) {
      const chunkType = match.metadata?.chunk_type || '';
      if (['event_individual', 'day_summary', 'event_range'].includes(chunkType)) {
        hasScheduleResults = true;
      }
      if (['table_cell_commission', 'table_row_summary', 'table_column_summary'].includes(chunkType)) {
        hasHanwhaResults = true;
      }
    }
  }

  // Add schedule PDFs if relevant
  if (isScheduleQuery || hasScheduleResults) {
    relevantPdfs.push(pdfConfig.schedule_pdfs[0]); // Main schedule PDF

    // Add KRS PDF if KRS-related
    if (userQuery.toLowerCase().includes('krs') || userQuery.includes('입문')) {
      relevantPdfs.push(pdfConfig.schedule_pdfs[1]); // KRS 시간표
    }
  }

  // Add policy PDFs if relevant
  if (isHanwhaQuery || hasHanwhaResults) {
    relevantPdfs.push(pdfConfig.policy_pdfs[0]); // 한화생명 시책공지
  }

  return relevantPdfs;
}

/**
 * Format PDF attachments for inclusion in response
 */
export function formatPdfAttachments(pdfs: PdfAttachment[]): string {
  if (!pdfs || pdfs.length === 0) {
    return '';
  }

  let attachmentText = '\n\n' + '─'.repeat(60) + '\n';
  attachmentText += '📎 **참고 자료**\n\n';

  for (const pdf of pdfs) {
    attachmentText += `**${pdf.description}**\n`;
    attachmentText += `🔗 [PDF 보기](${pdf.url})\n\n`;
  }

  return attachmentText;
}

/**
 * Step 1: Use Gemini Flash to enhance query and generate Pinecone filters
 */
export async function enhanceQueryWithGeminiFlash(
  userQuery: string,
  metadataKey: MetadataKey
): Promise<EnhancedQuery> {
  const hanwhaInstructions = `
## HANWHA COMMISSION QUERIES (한화생명 11월 시책 - 초세밀 데이터)

**이 네임스페이스는 264개의 초세밀 벡터로 구성되어 있습니다:**

### CRITICAL FILTERING RULES for Hanwha:
1. **NEVER use product_name or product_name_clean in filters** - semantic search will find products!
2. **ONLY use these fields**:
   - chunk_type (REQUIRED: "table_cell_commission" or "table_row_summary" or "table_column_summary")
   - Boolean flags: is_comprehensive, is_current_month, is_13th_month, is_fc_policy, is_hq_policy
   - payment_term (ONLY if user explicitly says "20년납", "10년납", etc.)
3. **Semantic search handles product matching** automatically via searchable_text field

## SCHEDULE QUERIES (일정, 교육, 시험 - 초세밀 데이터)

**For schedule queries, use MINIMAL filters to avoid missing data!**
`;

  const prompt = `You are an expert query optimizer for a Korean insurance branch office RAG system.

${hanwhaInstructions}

## AVAILABLE METADATA IN PINECONE:
**Chunk Types:** ${metadataKey.chunk_types.join(', ')}
**Companies:** ${metadataKey.companies.join(', ')}
**Boolean Filters:** ${metadataKey.boolean_filters.join(', ')}

## USER QUERY:
"${userQuery}"

## OUTPUT FORMAT (VALID JSON ONLY):
\`\`\`json
{
  "enhanced_query": "optimized Korean search text with core terms",
  "filters": {
    // Pinecone filter object, or null if no filters needed
  },
  "reasoning": "Brief explanation"
}
\`\`\`

Return ONLY valid JSON, no markdown.`;

  try {
    const response = await genai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: prompt
    });

    let responseText = (response.text || '').trim();

    // Clean markdown
    if (responseText.startsWith('```json')) {
      responseText = responseText.slice(7);
    }
    if (responseText.startsWith('```')) {
      responseText = responseText.slice(3);
    }
    if (responseText.endsWith('```')) {
      responseText = responseText.slice(0, -3);
    }

    const parsed = JSON.parse(responseText.trim());
    return parsed as EnhancedQuery;
  } catch (error) {
    console.error('⚠️  Query enhancement error:', error);
    return {
      enhanced_query: userQuery,
      filters: null,
      reasoning: 'Failed to enhance query'
    };
  }
}

/**
 * Step 2: Generate embedding using OpenAI
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openaiClient.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
    dimensions: EMBEDDING_DIMENSIONS
  });

  return response.data[0].embedding;
}

/**
 * Step 3: Query Pinecone with enhanced query and filters
 */
export async function searchPinecone(
  embedding: number[],
  filters: Record<string, any> | null = null,
  topK: number = 10
): Promise<PineconeQueryResult> {
  const index = pinecone.index(INDEX_NAME);

  const queryParams: any = {
    vector: embedding,
    topK,
    includeMetadata: true
  };

  if (filters) {
    queryParams.filter = filters;
  }

  const results = await index.namespace(NAMESPACE).query(queryParams);

  return results as PineconeQueryResult;
}

/**
 * Step 4: Format context for Gemini
 */
export function formatContext(results: PineconeQueryResult): string {
  if (!results.matches || results.matches.length === 0) {
    return '검색 결과가 없습니다.';
  }

  const contextParts: string[] = [];

  for (let idx = 0; idx < results.matches.length; idx++) {
    const match = results.matches[idx];
    const meta = match.metadata;
    const chunkType = meta?.chunk_type || 'N/A';

    const isHanwha = ['table_cell_commission', 'table_row_summary', 'table_column_summary'].includes(chunkType);
    const isSchedule = ['event_individual', 'day_summary', 'event_range'].includes(chunkType);

    let context = `\n## 문서 ${idx + 1} (관련도: ${match.score.toFixed(3)})\n`;
    context += `\n**출처:** ${meta?.source_file || 'N/A'}\n`;
    context += `**유형:** ${chunkType}\n`;

    if (isSchedule) {
      if (meta?.title) context += `**제목:** ${meta.title}\n`;
      if (meta?.date) context += `**날짜:** ${meta.date}\n`;
      if (meta?.time) context += `**시간:** ${meta.time}\n`;
      if (meta?.location) context += `**장소:** ${meta.location}\n`;
      if (meta?.presenter) context += `**강사:** ${meta.presenter}\n`;
    } else if (isHanwha) {
      if (meta?.product_name) context += `**상품명:** ${meta.product_name}\n`;
      if (meta?.payment_term) context += `**납기:** ${meta.payment_term}\n`;
      if (meta?.commission_label) context += `**시책 유형:** ${meta.commission_label}\n`;
      if (meta?.commission_value) context += `**수수료율:** ${meta.commission_value}\n`;
    }

    const searchableText = meta?.searchable_text || meta?.natural_description || meta?.full_text || '';
    if (searchableText) {
      context += `\n**상세 내용:**\n${searchableText}\n`;
    }

    contextParts.push(context);
  }

  return contextParts.join('\n');
}

/**
 * Detect question type for prompt selection
 */
function detectQuestionType(userQuery: string): 'list_all' | 'single' | 'explanation' {
  const queryLower = userQuery.toLowerCase();

  const listAllKeywords = ['모두', '전부', '다', '전체', '모든', '몇', '뭐', '무엇', '어떤', '어떻게'];
  const singleKeywords = ['하나만', '첫번째', '첫 번째', '가장', '제일', '최고'];
  const listContextWords = ['행사', '교육', '일정', '프로모션', '시책', '워크샵', '세미나', '강의'];

  if (singleKeywords.some(kw => queryLower.includes(kw))) {
    return 'single';
  }

  const hasListKeyword = listAllKeywords.some(kw => queryLower.includes(kw));
  const hasListContext = listContextWords.some(kw => queryLower.includes(kw));

  if (hasListContext && hasListKeyword) {
    return 'list_all';
  }

  if (hasListContext) {
    return 'list_all';
  }

  return 'explanation';
}

/**
 * Step 5: Generate answer with Gemini Flash
 */
export async function generateAnswerWithGemini(
  userQuery: string,
  context: string
): Promise<string> {
  const questionType = detectQuestionType(userQuery);
  console.log(`   🎯 질문 유형: ${questionType}`);

  const formattingInstructions = `
특별 지침 (출력 형식):
- 순수 텍스트만 사용하세요
- 마크다운 기호를 절대 사용하지 마세요 (**, ##, *, -, [], (), | 등 모두 금지)
- 표 형식 금지: 표를 만들지 마세요
- 목록은 간단한 번호나 기호로만 표시: "1. ", "2. ", "• " 등
- 강조가 필요한 경우 대문자나 줄바꿈으로 표현하세요
- 들여쓰기와 줄바꿈만으로 구조를 표현하세요
`;

  let prompt = `당신은 HO&F 지사 AI입니다. 아래 검색된 정보를 바탕으로 사용자 질문에 정확하고 친절하게 답변하세요.

사용자 질문:
${userQuery}

검색된 관련 정보 (최대 10개 문서):
${context}

핵심 지침:
1. 정확성: 검색된 정보만을 사용하여 답변하세요.
2. 관련성: 질문과 직접 관련된 정보를 선택하세요.
3. 구조화: 이해하기 쉽게 정리하세요.
4. 친절함: 존댓말을 사용하세요.

${formattingInstructions}

답변을 시작하세요:`;

  try {
    const response = await genai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: prompt
    });

    return response.text || '';
  } catch (error) {
    console.error('❌ Answer generation error:', error);
    return '죄송합니다. 답변을 생성하는 중 오류가 발생했습니다.';
  }
}

/**
 * Complete RAG Pipeline - Main Entry Point
 */
export async function ragAnswer(userQuery: string, topK: number = 10): Promise<string> {
  try {
    console.log(`\n🔍 RAG Query: ${userQuery}`);

    // Step 1: Load metadata and enhance query
    console.log('🔄 Step 1: Gemini Flash로 쿼리 최적화 중...');
    const metadataKey = loadMetadataKey();
    const geminiFlashOutput = await enhanceQueryWithGeminiFlash(userQuery, metadataKey);

    console.log(`   ✅ 최적화된 쿼리: ${geminiFlashOutput.enhanced_query}`);
    if (geminiFlashOutput.filters) {
      console.log(`   🎯 필터: ${JSON.stringify(geminiFlashOutput.filters, null, 2)}`);
    }

    // Step 2: Generate embedding
    console.log('🔄 Step 2: OpenAI 임베딩 생성 중...');
    const embedding = await generateEmbedding(geminiFlashOutput.enhanced_query);
    console.log(`   ✅ 임베딩 생성 완료 (${embedding.length}차원)`);

    // Step 3: Retrieve from Pinecone
    console.log(`🔍 Step 3: Pinecone 검색 중 (namespace: ${NAMESPACE}, top ${topK})...`);
    let results = await searchPinecone(embedding, geminiFlashOutput.filters, topK);

    console.log(`   ✅ ${results.matches.length}개 문서 검색 완료`);

    // Fallback: If no results with filters, retry without filters
    if (results.matches.length === 0 && geminiFlashOutput.filters !== null) {
      console.log('   ⚠️ 필터 적용 결과 0개 - 필터 없이 재검색 중...');
      results = await searchPinecone(embedding, null, topK);
      console.log(`   ✅ 재검색 완료: ${results.matches.length}개 문서 (순수 시맨틱 검색)`);
    }

    // Check relevance scores
    if (results.matches.length > 0) {
      const maxScore = Math.max(...results.matches.map(m => m.score));
      console.log(`   📊 최고 관련도 점수: ${maxScore.toFixed(3)}`);

      if (maxScore < RELEVANCE_THRESHOLD) {
        console.log('   ⚠️ 낮은 관련도 감지');
        return `안녕하세요. HO&F 지사 AI입니다.

질문하신 내용과 관련된 정보를 찾기 어렵습니다.

구체적인 질문을 해주시면 더 정확한 답변을 드릴 수 있습니다.

예시:
- 11월 워크샵 일정 알려줘
- 삼성화재 프로모션 정보
- 신입 FC 교육 일정

무엇을 도와드릴까요?`;
      }
    }

    // Step 4: Format context
    const formattedContext = formatContext(results);

    // Step 5: Generate answer with Gemini
    console.log('💬 Step 4: Gemini Flash로 답변 생성 중...');
    const answer = await generateAnswerWithGemini(userQuery, formattedContext);

    console.log(`   ✅ 답변 생성 완료 (길이: ${answer.length}자)`);

    // Step 6: Attach relevant PDFs
    console.log('📎 Step 5: 관련 PDF 첨부 중...');
    const relevantPdfs = getRelevantPdfs(userQuery, results);
    if (relevantPdfs.length > 0) {
      const pdfAttachments = formatPdfAttachments(relevantPdfs);
      console.log(`   ✅ ${relevantPdfs.length}개 PDF 첨부 완료\n`);
      return answer + pdfAttachments;
    } else {
      console.log('   ℹ️  첨부할 PDF 없음\n');
    }

    return answer;
  } catch (error) {
    console.error('❌ RAG 오류:', error);
    return `죄송합니다. 답변을 생성하는 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`;
  }
}
