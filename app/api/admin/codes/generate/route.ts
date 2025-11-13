/**
 * Generate Access Codes API
 * Creates new access codes with specified properties
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Generate random code in format: XXX-XXX-XXX-XXX
function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude similar chars
  let code = '';

  for (let i = 0; i < 4; i++) {
    if (i > 0) code += '-';
    for (let j = 0; j < 3; j++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  }

  return code;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || (profile.role !== 'admin' && profile.role !== 'ceo')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse request body with optional credential fields
    const {
      count,
      codeType,
      role,
      tier,
      expiresInDays,
      maxUses,
      intendedRecipientName,
      intendedRecipientEmail,
      requiresCredentialMatch,
      credentialId,
    } = await request.json();

    // Validate input
    if (!count || count < 1 || count > 100) {
      return NextResponse.json(
        { error: '코드 수는 1-100 사이여야 합니다.' },
        { status: 400 }
      );
    }

    if (!codeType || !role || !tier) {
      return NextResponse.json(
        { error: '필수 필드가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // Calculate expiry date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (expiresInDays || 30));

    // Generate codes
    const codes: string[] = [];
    const codeRecords = [];

    for (let i = 0; i < count; i++) {
      let code = generateCode();

      // Ensure uniqueness
      while (codes.includes(code)) {
        code = generateCode();
      }

      codes.push(code);

      const codeRecord: any = {
        code,
        code_type: codeType,
        expires_at: expiresAt.toISOString(),
        max_uses: maxUses || 1,
        current_uses: 0,
        is_used: false,
        status: 'available',
        metadata: {
          role,
          subscription_tier: tier,
          source: 'admin_dashboard', // Store source in metadata instead
        },
      };

      // Add recipient information if provided
      if (intendedRecipientName) {
        codeRecord.intended_recipient_name = intendedRecipientName;
      }
      if (intendedRecipientEmail) {
        codeRecord.intended_recipient_email = intendedRecipientEmail;
      }

      // Add credential matching requirements
      if (requiresCredentialMatch) {
        codeRecord.requires_credential_match = true;
        if (credentialId) {
          codeRecord.intended_recipient_id = credentialId;
        }
      }

      codeRecords.push(codeRecord);
    }

    // Insert codes into database
    const { data: insertedCodes, error: insertError } = await supabase
      .from('verification_codes')
      .insert(codeRecords)
      .select('code');

    if (insertError) {
      console.error('[Generate Codes] Insert error:', insertError);
      return NextResponse.json(
        { error: '코드 생성에 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      codes: insertedCodes?.map((c) => c.code) || codes,
      count: insertedCodes?.length || 0,
    });
  } catch (error) {
    console.error('[Generate Codes] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
