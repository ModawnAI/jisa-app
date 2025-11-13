/**
 * Data Ingestion Service
 * Handles automated document processing, embedding generation, and Pinecone sync
 * Phase 5.1: Critical Infrastructure
 */

import { createServiceClient } from '@/lib/supabase/server';
import { OpenAI } from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';
// @ts-ignore - pdf-parse has ESM export issues
import pdf from 'pdf-parse';
import mammoth from 'mammoth';

export interface IngestionJobParams {
  userId: string;
  files: File[];
  chunkingStrategy?: 'sliding_window' | 'semantic' | 'table_aware';
  chunkSize?: number;
  chunkOverlap?: number;
  embeddingModel?: string;
  accessLevel?: string;
  requiredRole?: string;
  requiredTier?: string;
  accessMetadata?: Record<string, any>;
}

export interface IngestionJob {
  id: string;
  user_id: string;
  status: string;
  total_documents: number;
  processed_documents: number;
  failed_documents: number;
  chunking_strategy: string;
  chunk_size: number;
  chunk_overlap: number;
  embedding_model: string;
  created_at: string;
}

export interface ProcessingResult {
  success: boolean;
  chunksCreated: number;
  vectorsCreated: number;
  error?: string;
}

export class IngestionService {
  private openai: OpenAI;
  private pinecone: Pinecone;

  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
    this.pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
  }

  /**
   * Create ingestion job and start processing
   */
  async createJob(params: IngestionJobParams): Promise<string> {
    const supabase = createServiceClient();

    try {
      // Create job record
      const { data: job, error: jobError } = await supabase
        .from('ingestion_jobs')
        .insert({
          user_id: params.userId,
          total_documents: params.files.length,
          chunking_strategy: params.chunkingStrategy || 'sliding_window',
          chunk_size: params.chunkSize || 512,
          chunk_overlap: params.chunkOverlap || 50,
          embedding_model: params.embeddingModel || 'text-embedding-3-large',
          default_access_level: params.accessLevel || 'standard',
          default_required_role: params.requiredRole,
          default_required_tier: params.requiredTier,
          access_metadata: params.accessMetadata || {},
        })
        .select()
        .single();

      if (jobError || !job) {
        throw new Error(`Failed to create job: ${jobError?.message}`);
      }

      console.log(`[Ingestion] Job created: ${job.id}`);

      // Upload files to Supabase Storage and create document records
      for (const file of params.files) {
        const storageUrl = await this.uploadToStorage(file, job.id);

        await supabase.from('ingestion_documents').insert({
          job_id: job.id,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          storage_url: storageUrl,
        });
      }

      // Start processing in background (don't await)
      this.processJobAsync(job.id).catch((error) => {
        console.error(`[Ingestion] Job ${job.id} background processing error:`, error);
      });

      return job.id;
    } catch (error) {
      console.error('[Ingestion] Create job error:', error);
      throw error;
    }
  }

  /**
   * Upload file to Supabase Storage
   */
  private async uploadToStorage(file: File, jobId: string): Promise<string> {
    const supabase = createServiceClient();

    // Generate unique file path
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `ingestion/${jobId}/${timestamp}_${sanitizedName}`;

    // Convert File to ArrayBuffer for upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('documents')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      throw new Error(`Storage upload failed: ${error.message}`);
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from('documents').getPublicUrl(filePath);

    return publicUrl;
  }

  /**
   * Process job asynchronously
   */
  private async processJobAsync(jobId: string): Promise<void> {
    const supabase = createServiceClient();

    try {
      console.log(`[Ingestion] Starting job ${jobId}`);

      // Update job status
      await supabase
        .from('ingestion_jobs')
        .update({ status: 'processing', started_at: new Date().toISOString() })
        .eq('id', jobId);

      // Get job and documents
      const { data: job, error: jobError } = await supabase
        .from('ingestion_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (jobError || !job) {
        throw new Error('Job not found');
      }

      const { data: documents } = await supabase
        .from('ingestion_documents')
        .select('*')
        .eq('job_id', jobId);

      if (!documents || documents.length === 0) {
        throw new Error('No documents found for job');
      }

      console.log(`[Ingestion] Processing ${documents.length} documents`);

      // Process each document
      for (const doc of documents) {
        try {
          await this.processDocument(doc.id, job);

          // Update job progress
          await supabase
            .from('ingestion_jobs')
            .update({ processed_documents: job.processed_documents + 1 })
            .eq('id', jobId);
        } catch (error) {
          console.error(`[Ingestion] Document ${doc.id} failed:`, error);

          await supabase
            .from('ingestion_jobs')
            .update({ failed_documents: job.failed_documents + 1 })
            .eq('id', jobId);
        }
      }

      // Mark job completed
      await supabase
        .from('ingestion_jobs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', jobId);

      console.log(`[Ingestion] Job ${jobId} completed successfully`);
    } catch (error) {
      console.error(`[Ingestion] Job ${jobId} failed:`, error);

      await supabase
        .from('ingestion_jobs')
        .update({
          status: 'failed',
          error_log: {
            message: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString(),
          },
        })
        .eq('id', jobId);
    }
  }

  /**
   * Process single document
   */
  private async processDocument(documentId: string, job: any): Promise<void> {
    const supabase = createServiceClient();
    let doc: any = null;

    try {
      console.log(`[Ingestion] Processing document ${documentId}`);

      // Get document
      const result = await supabase
        .from('ingestion_documents')
        .select('*')
        .eq('id', documentId)
        .single();

      doc = result.data;
      if (!doc) throw new Error('Document not found');

      // Update status
      await supabase
        .from('ingestion_documents')
        .update({ status: 'processing' })
        .eq('id', documentId);

      // 1. Extract text from storage URL
      const text = await this.extractText(doc.storage_url, doc.file_type);

      // 2. Chunk text
      const chunks = await this.chunkText(text, {
        strategy: job.chunking_strategy,
        chunkSize: job.chunk_size,
        chunkOverlap: job.chunk_overlap,
      });

      console.log(`[Ingestion] Created ${chunks.length} chunks`);

      // 3. Generate embeddings (batch processing)
      const embeddings = await this.generateEmbeddings(chunks, job.embedding_model);

      console.log(`[Ingestion] Generated ${embeddings.length} embeddings`);

      // 4. Create Document record in documents table
      const { data: document, error: docError } = await supabase
        .from('documents')
        .insert({
          title: doc.file_name,
          content: text.substring(0, 5000), // Store first 5000 chars as preview
          access_level: job.default_access_level,
          required_role: job.default_required_role,
          required_tier: job.default_required_tier,
          access_metadata: job.access_metadata,
          pdf_url: doc.storage_url,
          created_by: job.user_id,
        })
        .select()
        .single();

      if (docError || !document) {
        throw new Error(`Failed to create document: ${docError?.message}`);
      }

      // 5. Store contexts (chunks) in database with embeddings
      const contextIds: string[] = [];
      for (let i = 0; i < chunks.length; i++) {
        const { data: context } = await supabase
          .from('contexts')
          .insert({
            document_id: document.id,
            title: `${doc.file_name} - Chunk ${i + 1}/${chunks.length}`,
            content: chunks[i],
            embedding_model: job.embedding_model,
            access_level: job.default_access_level,
            required_role: job.default_required_role,
            required_tier: job.default_required_tier,
            access_metadata: job.access_metadata,
          })
          .select()
          .single();

        if (context) {
          contextIds.push(context.id);
        }
      }

      console.log(`[Ingestion] Created ${contextIds.length} contexts in DB`);

      // 6. Sync to Pinecone with RBAC metadata
      await this.syncToPinecone(contextIds, embeddings, job);

      console.log(`[Ingestion] Synced ${embeddings.length} vectors to Pinecone`);

      // 7. Update document record
      await supabase
        .from('ingestion_documents')
        .update({
          status: 'completed',
          document_id: document.id,
          chunks_created: chunks.length,
          contexts_created: contextIds.length,
          pinecone_vectors: embeddings.length,
        })
        .eq('id', documentId);

      console.log(`[Ingestion] Document ${documentId} processing complete`);
    } catch (error) {
      console.error(`[Ingestion] Document ${documentId} processing error:`, error);

      await supabase
        .from('ingestion_documents')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          retry_count: (doc?.retry_count || 0) + 1,
        })
        .eq('id', documentId);

      throw error;
    }
  }

  /**
   * Extract text from file URL
   */
  private async extractText(url: string, fileType: string): Promise<string> {
    try {
      // Fetch file from storage
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.statusText}`);
      }

      const buffer = await response.arrayBuffer();

      // Extract based on file type
      if (fileType === 'application/pdf' || url.endsWith('.pdf')) {
        return await this.extractFromPDF(buffer);
      } else if (
        fileType ===
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        url.endsWith('.docx')
      ) {
        return await this.extractFromDOCX(buffer);
      } else if (fileType === 'text/plain' || url.endsWith('.txt')) {
        return await this.extractFromTXT(buffer);
      } else {
        throw new Error(`Unsupported file type: ${fileType}`);
      }
    } catch (error) {
      console.error('[Ingestion] Text extraction error:', error);
      throw new Error(`Text extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract text from PDF
   */
  private async extractFromPDF(buffer: ArrayBuffer): Promise<string> {
    try {
      const dataBuffer = Buffer.from(buffer);
      const data = await pdf(dataBuffer);

      if (!data.text || data.text.trim().length === 0) {
        throw new Error('PDF contains no extractable text');
      }

      console.log(`[Ingestion] Extracted ${data.text.length} characters from PDF`);
      return data.text;
    } catch (error) {
      console.error('[Ingestion] PDF extraction error:', error);
      throw new Error(`PDF extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract text from DOCX
   */
  private async extractFromDOCX(buffer: ArrayBuffer): Promise<string> {
    try {
      const dataBuffer = Buffer.from(buffer);
      const result = await mammoth.extractRawText({ buffer: dataBuffer });

      if (!result.value || result.value.trim().length === 0) {
        throw new Error('DOCX contains no extractable text');
      }

      if (result.messages && result.messages.length > 0) {
        console.warn('[Ingestion] DOCX extraction warnings:', result.messages);
      }

      console.log(`[Ingestion] Extracted ${result.value.length} characters from DOCX`);
      return result.value;
    } catch (error) {
      console.error('[Ingestion] DOCX extraction error:', error);
      throw new Error(`DOCX extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract text from TXT
   */
  private async extractFromTXT(buffer: ArrayBuffer): Promise<string> {
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(buffer);
  }

  /**
   * Chunk text using specified strategy
   */
  private async chunkText(
    text: string,
    config: {
      strategy: string;
      chunkSize: number;
      chunkOverlap: number;
    }
  ): Promise<string[]> {
    switch (config.strategy) {
      case 'sliding_window':
        return this.slidingWindowChunk(text, config.chunkSize, config.chunkOverlap);

      case 'semantic':
        return this.semanticChunk(text, config.chunkSize);

      case 'table_aware':
        return this.tableAwareChunk(text, config.chunkSize);

      default:
        return this.slidingWindowChunk(text, config.chunkSize, config.chunkOverlap);
    }
  }

  /**
   * Sliding window chunking strategy
   */
  private slidingWindowChunk(
    text: string,
    chunkSize: number,
    chunkOverlap: number
  ): string[] {
    const chunks: string[] = [];
    const words = text.split(/\s+/);

    for (let i = 0; i < words.length; i += chunkSize - chunkOverlap) {
      const chunk = words.slice(i, i + chunkSize).join(' ');
      if (chunk.trim().length > 0) {
        chunks.push(chunk.trim());
      }
    }

    return chunks;
  }

  /**
   * Semantic chunking (sentence-boundary aware)
   */
  private semanticChunk(text: string, targetSize: number): string[] {
    const chunks: string[] = [];

    // Split by sentences (Korean and English)
    const sentences = text.split(/([.!?。！？]+[\s\n]+)/);

    let currentChunk = '';
    let currentSize = 0;

    for (const sentence of sentences) {
      const words = sentence.split(/\s+/).length;

      if (currentSize + words > targetSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
        currentSize = 0;
      }

      currentChunk += sentence;
      currentSize += words;
    }

    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  /**
   * Table-aware chunking (preserves table structures)
   */
  private tableAwareChunk(text: string, chunkSize: number): string[] {
    // Detect tables (simple heuristic: lines with multiple | or tabs)
    const lines = text.split('\n');
    const chunks: string[] = [];
    let currentChunk = '';
    let currentSize = 0;
    let inTable = false;

    for (const line of lines) {
      const words = line.split(/\s+/).length;
      const isTableLine = line.includes('|') || line.includes('\t');

      // Start new chunk if:
      // 1. Exceeds chunk size
      // 2. Transitioning in/out of table
      if (
        (currentSize + words > chunkSize && !inTable) ||
        (isTableLine && !inTable && currentChunk.length > 0) ||
        (!isTableLine && inTable)
      ) {
        if (currentChunk.trim().length > 0) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = '';
        currentSize = 0;
      }

      currentChunk += line + '\n';
      currentSize += words;
      inTable = isTableLine;
    }

    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  /**
   * Generate embeddings for chunks (batch processing)
   */
  private async generateEmbeddings(
    chunks: string[],
    model: string
  ): Promise<number[][]> {
    try {
      console.log(`[Ingestion] Generating embeddings for ${chunks.length} chunks`);

      // OpenAI allows up to 2048 inputs per request
      const batchSize = 100;
      const embeddings: number[][] = [];

      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);

        const response = await this.openai.embeddings.create({
          model,
          input: batch,
          dimensions: 3072,
        });

        embeddings.push(...response.data.map((item) => item.embedding));

        console.log(
          `[Ingestion] Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(chunks.length / batchSize)} complete`
        );
      }

      return embeddings;
    } catch (error) {
      console.error('[Ingestion] Embedding generation error:', error);
      throw new Error(`Embedding generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Sync contexts to Pinecone with RBAC metadata
   */
  private async syncToPinecone(
    contextIds: string[],
    embeddings: number[][],
    job: any
  ): Promise<void> {
    try {
      const supabase = createServiceClient();

      // Get context records from DB
      const { data: contexts } = await supabase
        .from('contexts')
        .select('*')
        .in('id', contextIds);

      if (!contexts || contexts.length === 0) {
        throw new Error('No contexts found');
      }

      // Prepare vectors for Pinecone
      const vectors = contexts.map((ctx, index) => ({
        id: ctx.id,
        values: embeddings[index],
        metadata: {
          // Content (limited to 40KB per Pinecone)
          content: ctx.content.substring(0, 10000),
          title: ctx.title,

          // Document reference
          document_id: ctx.document_id,

          // RBAC metadata for filtering
          access_level: ctx.access_level,
          required_role: ctx.required_role,
          required_tier: ctx.required_tier,

          // Access roles hierarchy (for $in queries)
          access_roles: this.getRoleHierarchy(ctx.required_role || 'user'),
          access_tiers: this.getTierHierarchy(ctx.required_tier || 'free'),

          // Additional access metadata
          ...(ctx.access_metadata || {}),

          // Indexing metadata
          embedding_model: ctx.embedding_model,
          created_at: ctx.created_at,
        },
      }));

      // Batch upsert to Pinecone
      const index = this.pinecone.index(process.env.PINECONE_INDEX!);
      const namespace = index.namespace('hof-knowledge-base-max');

      // Pinecone allows up to 100 vectors per batch
      const batchSize = 100;
      for (let i = 0; i < vectors.length; i += batchSize) {
        const batch = vectors.slice(i, i + batchSize);
        await namespace.upsert(batch);

        console.log(
          `[Ingestion] Pinecone batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(vectors.length / batchSize)} synced`
        );
      }

      // Update contexts with Pinecone IDs
      for (const ctx of contexts) {
        await supabase
          .from('contexts')
          .update({ pinecone_id: ctx.id })
          .eq('id', ctx.id);
      }

      console.log(`[Ingestion] Synced ${vectors.length} vectors to Pinecone`);
    } catch (error) {
      console.error('[Ingestion] Pinecone sync error:', error);
      throw new Error(`Pinecone sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get role hierarchy for RBAC filtering
   */
  private getRoleHierarchy(role: string): string[] {
    const hierarchy: Record<string, string[]> = {
      ceo: ['ceo', 'admin', 'manager', 'senior', 'junior', 'user'],
      admin: ['admin', 'manager', 'senior', 'junior', 'user'],
      manager: ['manager', 'senior', 'junior', 'user'],
      senior: ['senior', 'junior', 'user'],
      junior: ['junior', 'user'],
      user: ['user'],
    };
    return hierarchy[role] || [role];
  }

  /**
   * Get subscription tier hierarchy
   */
  private getTierHierarchy(tier: string): string[] {
    const hierarchy: Record<string, string[]> = {
      enterprise: ['enterprise', 'pro', 'basic', 'free'],
      pro: ['pro', 'basic', 'free'],
      basic: ['basic', 'free'],
      free: ['free'],
    };
    return hierarchy[tier] || [tier];
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<IngestionJob | null> {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from('ingestion_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error || !data) {
      return null;
    }

    return data as IngestionJob;
  }

  /**
   * List jobs for user
   */
  async listJobs(userId: string, isAdmin: boolean = false): Promise<IngestionJob[]> {
    const supabase = createServiceClient();

    let query = supabase.from('ingestion_jobs').select('*');

    if (!isAdmin) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to list jobs: ${error.message}`);
    }

    return (data || []) as IngestionJob[];
  }
}

// Export singleton instance
export const ingestionService = new IngestionService();
