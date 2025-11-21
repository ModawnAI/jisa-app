/**
 * Use Access Code API
 * Marks an access code as used after successful registration
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { code, userId } = await request.json();

    if (!code || !userId) {
      return NextResponse.json(
        { error: '필수 정보가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // Normalize code format
    const normalizedCode = code.trim().toUpperCase().replace(/\s+/g, '-');

    const supabase = await createClient();

    // First, get the code data to extract namespace info
    const { data: codeData, error: fetchError } = await supabase
      .from('verification_codes')
      .select('*')
      .eq('code', normalizedCode)
      .single();

    if (fetchError || !codeData) {
      console.error('[Use Code] Fetch error:', fetchError);
      return NextResponse.json(
        { error: '코드를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // Update verification_codes table
    const { data, error } = await supabase
      .from('verification_codes')
      .update({
        is_used: true,
        used_at: new Date().toISOString(),
        user_id: userId,
        current_uses: (codeData.current_uses || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('code', normalizedCode)
      .select()
      .single();

    if (error) {
      console.error('[Use Code] Update error:', error);
      return NextResponse.json(
        { error: '코드 업데이트에 실패했습니다.' },
        { status: 500 }
      );
    }

    // If this is an employee code with namespace, update the profile
    if (codeData.pinecone_namespace && codeData.employee_sabon) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          pinecone_namespace: codeData.pinecone_namespace,
          rag_enabled: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (profileError) {
        console.error('[Use Code] Profile update error:', profileError);
        // Non-critical error, continue
      } else {
        console.log(`[Use Code] Updated profile with namespace: ${codeData.pinecone_namespace}`);
      }

      // Also update or create user_credentials if linked
      if (codeData.intended_recipient_id) {
        const { error: credentialError } = await supabase
          .from('user_credentials')
          .update({
            pinecone_namespace: codeData.pinecone_namespace,
            rag_enabled: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', codeData.intended_recipient_id);

        if (credentialError) {
          console.error('[Use Code] Credential update error:', credentialError);
          // Non-critical error, continue
        } else {
          console.log(`[Use Code] Updated credential with namespace`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: '인증 코드가 성공적으로 사용되었습니다.',
    });
  } catch (error) {
    console.error('[Use Code] Error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
