/**
 * KakaoTalk Chat API Route
 * POST /api/kakao/chat
 * Handles incoming messages from KakaoTalk chatbot
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTextFromGPT } from '@/lib/services/chat.service';
import { logQuery } from '@/lib/services/analytics.service';

export const runtime = 'nodejs';
export const maxDuration = 30; // 30초 제한

interface KakaoRequest {
  user_message: string;
  user_id?: string;
  session_id?: string;
}

interface KakaoResponse {
  version: string;
  template: {
    outputs: Array<{ simpleText: { text: string } }>;
    quickReplies: any[];
  };
}

export async function POST(request: NextRequest) {
  try {
    const startTime = Date.now();
    const data: KakaoRequest = await request.json();

    const userMessage = data.user_message || '';
    const userId = data.user_id;
    const sessionId = data.session_id || `session_${Date.now()}`;

    console.log(`[KakaoTalk] User: ${userId}, Message: ${userMessage}`);

    // 타임아웃 처리 (KakaoTalk 5초 제한)
    const timeoutPromise = new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), 4500)
    );

    let response: string;

    try {
      response = await Promise.race([
        getTextFromGPT(userMessage),
        timeoutPromise
      ]);
    } catch (error) {
      // 타임아웃 시 빠른 응답 반환
      console.log('[KakaoTalk] Timeout - 빠른 응답 반환');

      return NextResponse.json<KakaoResponse>({
        version: '2.0',
        template: {
          outputs: [{
            simpleText: {
              text: '아직 생각이 끝나지 않았어요.🙍‍♂️\n잠시 후 아래 버튼을 눌러주세요👆'
            }
          }],
          quickReplies: [{
            action: 'message',
            label: '생각 다 끝났나요?🙋‍♂️',
            messageText: '생각 다 끝났나요?'
          }]
        }
      });
    }

    const responseTime = Date.now() - startTime;

    // 로그 기록 (Supabase) - non-blocking
    logQuery({
      userId,
      kakaoUserId: userId,
      sessionId,
      queryText: userMessage,
      responseText: response,
      responseTime,
    }).catch(err => console.error('Logging error:', err));

    console.log(`[KakaoTalk] 응답 시간: ${responseTime}ms`);

    return NextResponse.json<KakaoResponse>({
      version: '2.0',
      template: {
        outputs: [{ simpleText: { text: response } }],
        quickReplies: []
      }
    });
  } catch (error) {
    console.error('[KakaoTalk] 오류:', error);

    return NextResponse.json<KakaoResponse>({
      version: '2.0',
      template: {
        outputs: [{
          simpleText: {
            text: '죄송합니다. 일시적인 오류가 발생했습니다. 다시 시도해주세요.'
          }
        }],
        quickReplies: []
      }
    });
  }
}

// 헬스 체크
export async function GET() {
  return NextResponse.json({ status: 'ok', service: 'kakao-chat', timestamp: new Date().toISOString() });
}
