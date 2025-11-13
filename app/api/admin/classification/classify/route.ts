/**
 * Single Content Classification API
 *
 * Applies classification to a single document or context.
 *
 * Database: kuixphvkbuuzfezoeyii
 * Phase 3: Multi-Dimensional Content Classification
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ContentClassificationService, ClassificationInput } from '@/lib/services/classification.service'

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
    if (!body.content_id || !body.content_type) {
      return NextResponse.json(
        { error: 'content_id and content_type are required' },
        { status: 400 }
      )
    }

    if (!['document', 'context'].includes(body.content_type)) {
      return NextResponse.json(
        { error: 'content_type must be "document" or "context"' },
        { status: 400 }
      )
    }

    // Build classification input
    const input: ClassificationInput = {
      content_id: body.content_id,
      content_type: body.content_type,
      sensitivity_level: body.sensitivity_level,
      content_category: body.content_category,
      target_departments: body.target_departments,
      target_roles: body.target_roles,
      target_tiers: body.target_tiers,
      target_positions: body.target_positions,
      available_from: body.available_from,
      available_until: body.available_until,
      geo_restrictions: body.geo_restrictions,
      compliance_tags: body.compliance_tags,
      classification_method: body.classification_method || 'manual',
      classification_confidence: body.classification_confidence,
      classifier_user_id: user.id,
    }

    // Apply classification
    const result =
      input.content_type === 'document'
        ? await ContentClassificationService.classifyDocument(input)
        : await ContentClassificationService.classifyContext(input)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Classification failed' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Classification applied successfully',
      content_id: input.content_id,
      content_type: input.content_type,
    })
  } catch (error) {
    console.error('[Classify API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
