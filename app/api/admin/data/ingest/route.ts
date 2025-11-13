/**
 * Data Ingestion API
 * POST /api/admin/data/ingest - Start document ingestion job
 * Phase 5.1: Data Ingestion Pipeline
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { IngestionService } from '@/lib/services/ingestion.service';

export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds for file upload

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

    if (!profile || !['admin', 'ceo'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Parse multipart form data
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    // Validate file types
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];

    for (const file of files) {
      if (!allowedTypes.includes(file.type) && !file.name.match(/\.(pdf|docx|txt)$/i)) {
        return NextResponse.json(
          { error: `Invalid file type: ${file.name}. Only PDF, DOCX, TXT allowed.` },
          { status: 400 }
        );
      }
    }

    // Get configuration from form data
    const chunkingStrategy = (formData.get('chunkingStrategy') as string) || 'sliding_window';
    const chunkSize = parseInt(formData.get('chunkSize') as string) || 512;
    const chunkOverlap = parseInt(formData.get('chunkOverlap') as string) || 50;
    const embeddingModel = (formData.get('embeddingModel') as string) || 'text-embedding-3-large';
    const accessLevel = (formData.get('accessLevel') as string) || 'standard';
    const requiredRole = formData.get('requiredRole') as string | undefined;
    const requiredTier = formData.get('requiredTier') as string | undefined;

    // Parse access metadata if provided
    let accessMetadata: any = {};
    const accessMetadataStr = formData.get('accessMetadata') as string;
    if (accessMetadataStr) {
      try {
        accessMetadata = JSON.parse(accessMetadataStr);
      } catch (error) {
        console.warn('[Ingest] Invalid accessMetadata JSON, using empty object');
      }
    }

    console.log(`[Ingest] Starting job for ${files.length} files`);

    // Create ingestion job
    const ingestionService = new IngestionService();
    const jobId = await ingestionService.createJob({
      userId: user.id,
      files,
      chunkingStrategy: chunkingStrategy as any,
      chunkSize,
      chunkOverlap,
      embeddingModel,
      accessLevel,
      requiredRole,
      requiredTier,
      accessMetadata,
    });

    console.log(`[Ingest] Job created: ${jobId}`);

    return NextResponse.json({
      success: true,
      jobId,
      message: `Ingestion job started for ${files.length} file(s)`,
      filesCount: files.length,
    });
  } catch (error) {
    console.error('[Ingest] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to start ingestion',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
