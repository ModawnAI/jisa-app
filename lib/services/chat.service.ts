/**
 * Chat Service - Main Orchestrator
 * Routes queries to either Commission System or RAG System
 */

import { detectCommissionQuery } from './commission-detector';
import { queryCommission, formatCommissionForGPT } from './commission.service';
import { ragAnswer } from './rag.service';
import { ragAnswerWithRBAC } from './rag.service.enhanced';
import { isEmployeeRAGQuery, cleanEmployeeRAGQuery, queryEmployeeRAG } from './employee-rag.service';
import { GoogleGenAI } from '@google/genai';

const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

/**
 * Main chat handler - routes to appropriate system
 * Now supports RBAC filtering when userId is provided
 */
export async function getTextFromGPT(prompt: string, userId?: string | null): Promise<string> {
  try {
    console.log('='.repeat(80));

    // Step 0: Check for Employee RAG query (starts with "/")
    if (isEmployeeRAGQuery(prompt)) {
      console.log('👤 Routing to EMPLOYEE RAG SYSTEM (/ command detected)');

      if (!userId) {
        return '죄송합니다. "/" 명령어는 등록된 직원만 사용할 수 있습니다. 먼저 등록 코드로 인증해주세요.';
      }

      try {
        const cleanQuery = cleanEmployeeRAGQuery(prompt);
        console.log(`   Cleaned query: ${cleanQuery}`);

        const result = await queryEmployeeRAG({
          userId,
          query: cleanQuery,
          topK: 10,
        });

        return result.answer;
      } catch (error) {
        console.error('❌ Employee RAG error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        if (errorMessage.includes('not found')) {
          return '직원 정보를 찾을 수 없습니다. 관리자에게 문의해주세요.';
        }

        if (errorMessage.includes('not enabled')) {
          return 'RAG 시스템이 활성화되지 않았습니다. 관리자에게 문의해주세요.';
        }

        return `급여 정보 조회 중 오류가 발생했습니다: ${errorMessage}`;
      }
    }

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

        const systemPrompt = `너는 한국 보험 수수료 전문가 AI입니다.
참조 정보: ${context}

ULTRA CRITICAL 수수료 데이터 처리 규칙:

절대 금지:
- 컬럼 이름 언급 금지: col_8, col_19 같은 기술 용어 사용 금지
- 계산/공식 언급 금지: "배율", "계산식", "×" 사용 금지
- 소수점 형식 금지: 절대로 소수점 형태로 표시하지 마세요
- 기술 설명 금지: 데이터 구조 설명 금지
- "퍼센트"라는 단어 사용 금지: 반드시 "%" 기호만 사용

CRITICAL 백분율 표시 규칙:
참조 정보에 있는 모든 숫자는 이미 백분율로 변환되어 "%" 기호가 붙어 있습니다.
- 이미 변환된 값: 78%, 377.14%, 628.56% 등
- 절대 해야 할 것: 그대로 복사해서 표시 (78% → 78%, 377.14% → 377.14%)
- 절대 하지 말아야 할 것:
  × "78퍼센트"라고 쓰지 마세요
  × "0.78%"로 바꾸지 마세요
  × 숫자를 다시 계산하지 마세요
  × "퍼센트"라는 단어를 사용하지 마세요

올바른 예시:
- 참조 정보: "초년도: 377.14%" → 답변: "초년도 377.14%"
- 참조 정보: "환산율: 78%" → 답변: "환산율 78%"
- 참조 정보: "합산: 628.56%" → 답변: "합산 628.56%"

잘못된 예시 (절대 금지):
- "377.14퍼센트" ← 틀림!
- "78퍼센트" ← 틀림!
- "0.78%" ← 틀림!

필수 처리:
- 간결하게: 상품명, 회사, 주요 수수료율만 표시
- 있는 정보만: 없는 정보는 "해당 정보 없음"이라고만 표시
- 퍼센트 표시: 반드시 "%" 기호 사용, "퍼센트" 단어 절대 사용 금지

출력 형식:
- 순수 텍스트만 사용하세요
- 마크다운 기호를 절대 사용하지 마세요 (**, ##, *, -, [], (), | 등 모두 금지)
- 표 형식 금지: 표를 만들지 마세요
- 목록은 간단한 번호나 기호로만 표시: "1. ", "2. ", "• " 등
- 강조가 필요한 경우 대문자나 줄바꿈으로 표현하세요
- 들여쓰기와 줄바꿈만으로 구조를 표현하세요

다시 한번 강조: 참조 정보의 모든 숫자 뒤에 이미 "%"가 붙어 있습니다. 그대로 복사하세요. "퍼센트"라는 단어를 절대 사용하지 마세요.`;

        const contents = [
          {
            role: 'user',
            parts: [{ text: `${systemPrompt}\n\n질문: ${prompt}` }]
          }
        ];

        const config = {
          thinkingConfig: {
            thinkingBudget: 10000
          }
        };

        const response = await genai.models.generateContent({
          model: 'gemini-flash-latest',
          config,
          contents
        });

        return response.text || '';
      } catch (error) {
        console.error('Commission 시스템 오류:', error);
        console.log('⚠️ Fallback to RAG...');
        // Fallthrough to RAG
      }
    }

    // Route to RAG System with RBAC
    console.log('📚 Routing to RAG SYSTEM (RBAC-enabled)');

    // Use RBAC-enabled RAG if userId is provided
    if (userId) {
      console.log(`[Chat] Using RBAC-filtered RAG for user: ${userId}`);
      return await ragAnswerWithRBAC(prompt, userId, 10);
    } else {
      console.log('[Chat] Using standard RAG (public content only)');
      // For backward compatibility, use standard RAG for unauthenticated
      return await ragAnswer(prompt, 10);
    }
  } catch (error) {
    console.error('getTextFromGPT Error:', error);
    return '죄송합니다. 응답 생성 중 오류가 발생했습니다.';
  }
}
