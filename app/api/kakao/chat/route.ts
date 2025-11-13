/**
 * KakaoTalk Chat API Route - GATED CHATBOT
 * POST /api/kakao/chat
 *
 * Architecture:
 * 1. Public KakaoTalk channel (anyone can add)
 * 2. First message MUST be verification code
 * 3. Code determines access level (role + tier)
 * 4. All subsequent queries filtered by RBAC
 * 5. All interactions logged to Supabase
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTextFromGPT } from '@/lib/services/chat.service';

export const runtime = 'nodejs';
export const maxDuration = 30;

// KakaoTalk webhook payload interface (Official v2.0 format)
interface KakaoWebhookRequest {
  userRequest: {
    utterance: string;  // User's message
    user: {
      id: string;  // kakao_user_id - unique identifier
      properties?: Record<string, any>;
    };
    callbackUrl?: string | null;  // For async responses
  };
  bot?: {
    id: string;
    name: string;
  };
  action?: {
    id: string;
    name?: string;
    params?: Record<string, any>;
    detailParams?: Record<string, any>;
    clientExtra?: Record<string, any>;
  };
  contexts?: any[];
}

interface KakaoResponse {
  version: string;
  template: {
    outputs: Array<{ simpleText: { text: string } }>;
    quickReplies?: Array<{
      action: string;
      label: string;
      messageText: string;
    }>;
  };
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const supabase = await createClient();
    const data: KakaoWebhookRequest = await request.json();

    // Extract KakaoTalk user information (Official v2.0 format)
    const kakaoUserId = data.userRequest.user.id;
    const kakaoNickname = data.userRequest.user.properties?.nickname || '사용자';
    const userMessage = data.userRequest.utterance?.trim() || '';
    const callbackUrl = data.userRequest.callbackUrl;

    console.log(`[KakaoTalk] User: ${kakaoUserId} (${kakaoNickname}), Message: "${userMessage}"`);

    // =====================================================
    // STEP 1: Check if user has profile (gated access)
    // =====================================================

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('kakao_user_id', kakaoUserId)
      .single();

    // =====================================================
    // STEP 2: No profile = First-time user → Verify code
    // =====================================================

    if (!profile || profileError) {
      console.log(`[KakaoTalk] First-time user: ${kakaoUserId}`);

      // Check if message contains verification code pattern
      const codePattern = /([A-Z0-9]{3}-[A-Z0-9]{3}-[A-Z0-9]{3}-[A-Z0-9]{3})/;
      const codeMatch = userMessage.match(codePattern);

      // No code in message - request code
      if (!codeMatch) {
        console.log('[KakaoTalk] No code found - requesting verification');
        return NextResponse.json<KakaoResponse>({
          version: '2.0',
          template: {
            outputs: [{
              simpleText: {
                text: `안녕하세요! JISA 챗봇입니다. 👋

처음 사용하시는 분은 관리자로부터 받은 **인증 코드**를 입력해주세요.

📝 코드 형식: HXK-9F2-M7Q-3WP

인증 코드가 없으신가요?
관리자에게 문의하여 코드를 받으세요.`
              }
            }],
            quickReplies: []
          }
        });
      }

      // Found code - verify it
      const code = codeMatch[1].toUpperCase();
      console.log(`[KakaoTalk] Verification code detected: ${code}`);

      const { data: verificationCode, error: codeError } = await supabase
        .from('verification_codes')
        .select('*')
        .eq('code', code)
        .single();

      // Invalid code
      if (codeError || !verificationCode) {
        console.log(`[KakaoTalk] Invalid code: ${code}`);
        return NextResponse.json<KakaoResponse>({
          version: '2.0',
          template: {
            outputs: [{
              simpleText: {
                text: `❌ 유효하지 않은 인증 코드입니다.

코드: ${code}

관리자에게 정확한 코드를 확인해주세요.`
              }
            }],
            quickReplies: []
          }
        });
      }

      // Check code status
      if (verificationCode.status !== 'active') {
        console.log(`[KakaoTalk] Code not active: ${code}, status: ${verificationCode.status}`);
        return NextResponse.json<KakaoResponse>({
          version: '2.0',
          template: {
            outputs: [{
              simpleText: {
                text: `❌ 이 코드는 더 이상 사용할 수 없습니다.

상태: ${verificationCode.status === 'used' ? '이미 사용됨' : verificationCode.status === 'expired' ? '만료됨' : '비활성화'}

관리자에게 새로운 코드를 요청해주세요.`
              }
            }],
            quickReplies: []
          }
        });
      }

      // Check max uses
      if (verificationCode.current_uses >= verificationCode.max_uses) {
        console.log(`[KakaoTalk] Code max uses reached: ${code}`);
        return NextResponse.json<KakaoResponse>({
          version: '2.0',
          template: {
            outputs: [{
              simpleText: {
                text: `❌ 이 코드는 이미 ${verificationCode.max_uses}회 사용되었습니다.

관리자에게 새로운 코드를 요청해주세요.`
              }
            }],
            quickReplies: []
          }
        });
      }

      // Check expiration
      if (verificationCode.expires_at && new Date(verificationCode.expires_at) < new Date()) {
        console.log(`[KakaoTalk] Code expired: ${code}`);
        return NextResponse.json<KakaoResponse>({
          version: '2.0',
          template: {
            outputs: [{
              simpleText: {
                text: `❌ 이 코드는 만료되었습니다.

만료일: ${new Date(verificationCode.expires_at).toLocaleDateString('ko-KR')}

관리자에게 새로운 코드를 요청해주세요.`
              }
            }],
            quickReplies: []
          }
        });
      }

      // =====================================================
      // STEP 3: Valid code → Create profile
      // =====================================================

      console.log(`[KakaoTalk] Creating profile with role=${verificationCode.role}, tier=${verificationCode.tier}`);

      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          kakao_user_id: kakaoUserId,
          kakao_nickname: kakaoNickname,
          full_name: kakaoNickname,
          role: verificationCode.role,
          subscription_tier: verificationCode.tier,
          metadata: {
            verification_code: code,
            verified_at: new Date().toISOString(),
            code_purpose: verificationCode.purpose,
            code_metadata: verificationCode.metadata
          },
          first_chat_at: new Date().toISOString(),
          last_chat_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError || !newProfile) {
        console.error('[KakaoTalk] Profile creation failed:', createError);
        return NextResponse.json<KakaoResponse>({
          version: '2.0',
          template: {
            outputs: [{
              simpleText: {
                text: `❌ 인증 처리 중 오류가 발생했습니다.

잠시 후 다시 시도해주세요.
문제가 지속되면 관리자에게 문의하세요.`
              }
            }],
            quickReplies: []
          }
        });
      }

      // Update verification code usage
      const usedBy = verificationCode.used_by || [];
      const newUsedBy = [...usedBy, kakaoUserId];
      const newUseCount = verificationCode.current_uses + 1;

      await supabase
        .from('verification_codes')
        .update({
          current_uses: newUseCount,
          status: newUseCount >= verificationCode.max_uses ? 'used' : 'active',
          used_at: new Date().toISOString(),
          used_by: newUsedBy,
        })
        .eq('code', code);

      // Log verification event
      await supabase.from('analytics_events').insert({
        event_type: 'user.verified',
        kakao_user_id: kakaoUserId,
        user_id: newProfile.id,
        metadata: {
          verification_code: code,
          role: verificationCode.role,
          tier: verificationCode.tier,
          nickname: kakaoNickname
        }
      });

      // Success response with access level info
      const tierNames: Record<string, string> = {
        free: 'Free',
        basic: 'Basic',
        pro: 'Pro',
        enterprise: 'Enterprise'
      };

      const roleNames: Record<string, string> = {
        user: '사용자',
        junior: '주니어',
        senior: '시니어',
        manager: '매니저',
        admin: '관리자',
        ceo: 'CEO'
      };

      console.log(`[KakaoTalk] ✅ User verified: ${kakaoUserId} as ${verificationCode.role}/${verificationCode.tier}`);

      return NextResponse.json<KakaoResponse>({
        version: '2.0',
        template: {
          outputs: [{
            simpleText: {
              text: `✅ 인증 완료!

👤 역할: ${roleNames[verificationCode.role] || verificationCode.role}
🎫 등급: ${tierNames[verificationCode.tier] || verificationCode.tier}

이제 JISA에게 질문하실 수 있습니다.

💡 예시 질문:
• "11월 교육 일정 알려줘"
• "한화생명 종신보험 수수료"
• "이번 주 KRS 시험 일정"`
            }
          }],
          quickReplies: [
            {
              action: 'message',
              label: '11월 일정 📅',
              messageText: '11월 교육 일정 알려줘'
            },
            {
              action: 'message',
              label: '수수료 조회 💰',
              messageText: '한화생명 종신보험 수수료'
            },
            {
              action: 'message',
              label: 'KRS 일정 📚',
              messageText: 'KRS 시험 일정'
            }
          ]
        }
      });
    }

    // =====================================================
    // STEP 4: User has profile → Process with RBAC
    // =====================================================

    console.log(`[KakaoTalk] Verified user: ${kakaoUserId}, role=${profile.role}, tier=${profile.subscription_tier}`);

    // Update last chat timestamp
    await supabase
      .from('profiles')
      .update({ last_chat_at: new Date().toISOString() })
      .eq('id', profile.id);

    // Timeout handling (KakaoTalk 5s limit)
    const timeoutPromise = new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), 4500)
    );

    let response: string;

    try {
      // Process query with RBAC (uses profile.id to get role/tier)
      response = await Promise.race([
        getTextFromGPT(userMessage, profile.id),  // CRITICAL: Pass profile.id for RBAC
        timeoutPromise
      ]);
    } catch (error) {
      // Timeout - return quick response
      console.log('[KakaoTalk] Query timeout - returning fallback');

      // Log timeout event
      await supabase.from('analytics_events').insert({
        event_type: 'query.timeout',
        user_id: profile.id,
        kakao_user_id: kakaoUserId,
        metadata: { query: userMessage }
      });

      return NextResponse.json<KakaoResponse>({
        version: '2.0',
        template: {
          outputs: [{
            simpleText: {
              text: '아직 생각이 끝나지 않았어요. 🙍‍♂️\n\n잠시 후 아래 버튼을 눌러주세요 👆'
            }
          }],
          quickReplies: [{
            action: 'message',
            label: '생각 다 끝났나요? 🙋‍♂️',
            messageText: '생각 다 끝났나요?'
          }]
        }
      });
    }

    const responseTime = Date.now() - startTime;

    // =====================================================
    // STEP 5: Log query to Supabase (non-blocking)
    // =====================================================

    supabase.from('query_logs').insert({
      user_id: profile.id,
      kakao_user_id: kakaoUserId,
      query_text: userMessage,
      response_text: response,
      query_type: response.includes('수수료') || response.includes('%') ? 'commission' : 'rag',
      response_time_ms: responseTime,
      timestamp: new Date().toISOString(),
      metadata: {
        kakao_nickname: kakaoNickname,
        role: profile.role,
        tier: profile.subscription_tier
      }
    }).then((result) => {
      if (result.error) {
        console.error('[KakaoTalk] Logging error:', result.error);
      } else {
        console.log(`[KakaoTalk] Query logged for ${kakaoUserId}`);
      }
    });

    // Log analytics event (non-blocking)
    supabase.from('analytics_events').insert({
      event_type: 'query.completed',
      user_id: profile.id,
      kakao_user_id: kakaoUserId,
      metadata: {
        query_type: response.includes('수수료') ? 'commission' : 'rag',
        response_time: responseTime,
        success: true
      }
    }).then((result) => {
      if (result.error) {
        console.error('[KakaoTalk] Analytics error:', result.error);
      }
    });

    console.log(`[KakaoTalk] ✅ Response sent (${responseTime}ms)`);

    // =====================================================
    // STEP 6: Return response to KakaoTalk
    // =====================================================

    return NextResponse.json<KakaoResponse>({
      version: '2.0',
      template: {
        outputs: [{ simpleText: { text: response } }],
        quickReplies: []
      }
    });

  } catch (error) {
    console.error('[KakaoTalk] Unexpected error:', error);

    // Return error response
    return NextResponse.json<KakaoResponse>({
      version: '2.0',
      template: {
        outputs: [{
          simpleText: {
            text: `❌ 오류가 발생했습니다.

잠시 후 다시 시도해주세요.
문제가 지속되면 관리자에게 문의하세요.

E: info@modawn.ai`
          }
        }],
        quickReplies: []
      }
    }, { status: 200 });  // Always return 200 to KakaoTalk
  }
}
