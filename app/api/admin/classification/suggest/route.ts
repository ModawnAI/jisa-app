/**
 * Classification Suggestion API
 *
 * Returns auto-classification suggestions without applying them.
 * Useful for preview/review before applying classification.
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

    // Get content
    let contentText = ''

    if (body.content_type === 'document') {
      const { data: doc, error } = await supabase
        .from('documents')
        .select('title, description')
        .eq('id', body.content_id)
        .single()

      if (error || !doc) {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 })
      }

      contentText = `${doc.title || ''} ${doc.description || ''}`.trim()
    } else {
      const { data: ctx, error } = await supabase
        .from('contexts')
        .select('text')
        .eq('id', body.content_id)
        .single()

      if (error || !ctx) {
        return NextResponse.json({ error: 'Context not found' }, { status: 404 })
      }

      contentText = ctx.text || ''
    }

    if (!contentText) {
      return NextResponse.json(
        { error: 'No content available for classification' },
        { status: 400 }
      )
    }

    // Get auto-classification suggestions
    const result = await ContentClassificationService.autoClassifyContent({
      content_id: body.content_id,
      content_type: body.content_type,
      content_text: contentText,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Suggestion generation failed' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      content_id: body.content_id,
      content_type: body.content_type,
      suggestions: result.suggestions,
      note: 'These are suggestions only. Use the /classify endpoint to apply them.',
    })
  } catch (error) {
    console.error('[Suggest API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
