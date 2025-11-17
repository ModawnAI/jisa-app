/**
 * Individual Ingestion Job API
 * GET /api/admin/data/jobs/[id] - Get job details and progress
 * Phase 5.1: Data Ingestion Pipeline
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: jobId } = await props.params;

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get job with documents
    const { data: job, error } = await supabase
      .from('ingestion_jobs')
      .select('*, ingestion_documents(*)')
      .eq('id', jobId)
      .single();

    if (error || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Check access (admins can see all, users only their own)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = profile && ['admin', 'ceo'].includes(profile.role);

    if (!isAdmin && job.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Calculate progress percentage
    const progress =
      job.total_documents > 0
        ? Math.round(
            ((job.processed_documents + job.failed_documents) /
              job.total_documents) *
              100
          )
        : 0;

    // Calculate estimated time remaining
    let estimatedTimeRemaining: number | null = null;
    if (job.started_at && job.status === 'processing') {
      const startTime = new Date(job.started_at).getTime();
      const now = Date.now();
      const elapsed = now - startTime;

      const documentsProcessed = job.processed_documents + job.failed_documents;
      if (documentsProcessed > 0) {
        const avgTimePerDoc = elapsed / documentsProcessed;
        const remaining = job.total_documents - documentsProcessed;
        estimatedTimeRemaining = Math.round((avgTimePerDoc * remaining) / 1000); // seconds
      }
    }

    return NextResponse.json({
      ...job,
      progress,
      estimatedTimeRemaining,
      documentsRemaining: job.total_documents - job.processed_documents - job.failed_documents,
    });
  } catch (error) {
    console.error('[Job] Get error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch job' },
      { status: 500 }
    );
  }
}
