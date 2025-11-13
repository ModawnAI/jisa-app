/**
 * Chat Service - Main Orchestrator
 * Routes queries to either Commission System or RAG System
 */

import { detectCommissionQuery } from './commission-detector';
import { queryCommission, formatCommissionForGPT } from './commission.service';
import { ragAnswer } from './rag.service';
import { ragAnswerWithRBAC } from './rag.service.enhanced';
import { GoogleGenAI } from '@google/genai';

const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

/**
 * Main chat handler - routes to appropriate system
 * Now supports RBAC filtering when userId is provided
 */
export async function getTextFromGPT(prompt: string, userId?: string | null): Promise<string> {
  try {
    console.log('='.repeat(80));
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

**CRITICAL 수수료 데이터 처리 규칙:**

❌ 절대 금지:
- 컬럼 이름 언급 금지: col_8, col_19 같은 기술 용어 사용 금지
- 계산/공식 언급 금지: "배율", "계산식", "×" 사용 금지
- 소수점 형식 금지: 0.08148, 2.50842 같은 소수 그대로 표시 금지
- 기술 설명 금지: 데이터 구조 설명 금지

✅ 필수 처리:
- 모든 소수값은 × 100하여 백분율(%)로 변환
- 예시: 0.405 → 40.5%, 1.76346 → 176.35%, 8.0 → 800%
- 간결하게: 상품명, 회사, 주요 수수료율만 표시
- 있는 정보만: 없는 정보는 "해당 정보 없음"이라고만 표시

모든 숫자는 백분율(%)로 변환하세요.`;

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
