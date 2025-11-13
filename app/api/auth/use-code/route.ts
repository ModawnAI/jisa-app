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

    // Update verification_codes table
    const { data, error } = await supabase
      .from('verification_codes')
      .update({
        is_used: true,
        used_at: new Date().toISOString(),
        user_id: userId,
        current_uses: supabase.rpc('increment_uses', { code: normalizedCode }),
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
