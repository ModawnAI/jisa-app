/**
 * Verify Access Code API
 * Validates access code and returns role/tier information
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    if (!code) {
      return NextResponse.json(
        { error: '인증 코드를 입력해주세요.' },
        { status: 400 }
      );
    }

    // Normalize code format (remove spaces, uppercase)
    const normalizedCode = code.trim().toUpperCase().replace(/\s+/g, '-');

    const supabase = await createClient();

    // Query verification_codes table
    const { data: codeData, error: queryError } = await supabase
      .from('verification_codes')
      .select('*')
      .eq('code', normalizedCode)
      .single();

    if (queryError || !codeData) {
      return NextResponse.json(
        { error: '유효하지 않은 인증 코드입니다.' },
        { status: 404 }
      );
    }

    // Check if code is already used
    if (codeData.is_used && codeData.current_uses >= codeData.max_uses) {
      return NextResponse.json(
        { error: '이미 사용된 인증 코드입니다.' },
        { status: 400 }
      );
    }

    // Check if code is expired
    const now = new Date();
    const expiresAt = new Date(codeData.expires_at);

    if (now > expiresAt) {
      return NextResponse.json(
        { error: '만료된 인증 코드입니다.' },
        { status: 400 }
      );
    }

    // Extract role and tier from metadata
    const metadata = codeData.metadata || {};
    const role = metadata.role || codeData.role || 'user';
    const tier = metadata.subscription_tier || codeData.tier || 'free';

    // Include employee namespace information if available
    const employeeSabon = codeData.employee_sabon || null;
    const pineconeNamespace = codeData.pinecone_namespace || null;
    const ragEnabled = !!pineconeNamespace;

    return NextResponse.json({
      valid: true,
      role,
      tier,
      metadata: {
        ...metadata,
        employee_sabon: employeeSabon,
        pinecone_namespace: pineconeNamespace,
        rag_enabled: ragEnabled,
      },
      codeType: codeData.code_type,
      employeeSabon,
      pineconeNamespace,
      ragEnabled,
      credentialId: codeData.intended_recipient_id,
    });
  } catch (error) {
    console.error('[Verify Code] Error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
