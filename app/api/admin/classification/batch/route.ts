/**
 * Batch Content Classification API
 *
 * Auto-classifies multiple documents at once using rule-based system.
 *
 * Database: kuixphvkbuuzfezoeyii
 * Phase 3: Multi-Dimensional Content Classification
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ContentClassificationService } from '@/lib/services/classification.service'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || (profile.role !== 'admin' && profile.role !== 'ceo')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Parse request body
    const body = await request.json()

    // Validate required fields
    if (!body.document_ids || !Array.isArray(body.document_ids) || body.document_ids.length === 0) {
      return NextResponse.json(
        { error: 'document_ids array is required and must not be empty' },
        { status: 400 }
      )
    }

    if (body.document_ids.length > 100) {
      return NextResponse.json(
        { error: 'Maximum 100 documents per batch' },
        { status: 400 }
      )
    }

    // Batch classify
    const result = await ContentClassificationService.batchClassifyDocuments({
      document_ids: body.document_ids,
      classifier_user_id: user.id,
      auto_classify: body.auto_apply || false,
    })

    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Batch classification failed',
          errors: result.errors,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      total_processed: body.document_ids.length,
      successful: result.classifications.length,
      failed: result.errors?.length || 0,
      classifications: result.classifications,
      errors: result.errors,
      summary: {
        auto_applied: body.auto_apply || false,
        average_confidence:
          result.classifications.length > 0
            ? result.classifications.reduce((sum, c) => sum + c.confidence, 0) / result.classifications.length
            : 0,
      },
    })
  } catch (error) {
    console.error('[Batch Classify API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
