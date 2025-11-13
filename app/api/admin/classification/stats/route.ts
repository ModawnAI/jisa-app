/**
 * Classification Statistics API
 *
 * Returns statistics about content classification across the system.
 *
 * Database: kuixphvkbuuzfezoeyii
 * Phase 3: Multi-Dimensional Content Classification
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ContentClassificationService } from '@/lib/services/classification.service'

export async function GET(request: NextRequest) {
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

    // Get classification stats
    const { data: stats, error: statsError } = await ContentClassificationService.getClassificationStats()

    if (statsError || !stats) {
      return NextResponse.json(
        { error: 'Failed to get statistics' },
        { status: 500 }
      )
    }

    // Calculate percentages
    const classificationRate =
      stats.total_documents > 0
        ? (stats.classified_documents / stats.total_documents) * 100
        : 0

    const autoClassificationRate =
      stats.classified_documents > 0
        ? (stats.auto_classified / stats.classified_documents) * 100
        : 0

    return NextResponse.json({
      success: true,
      stats: {
        ...stats,
        classification_rate: classificationRate,
        auto_classification_rate: autoClassificationRate,
      },
      summary: {
        total_documents: stats.total_documents,
        classified: stats.classified_documents,
        unclassified: stats.total_documents - stats.classified_documents,
        classification_completion: `${classificationRate.toFixed(1)}%`,
        average_confidence: `${(stats.average_confidence * 100).toFixed(1)}%`,
      },
    })
  } catch (error) {
    console.error('[Stats API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
