/**
 * Vector Search API
 *
 * Provides semantic search capabilities using Pinecone vector database
 * with tier/role access control filtering.
 *
 * Database: kuixphvkbuuzfezoeyii (Supabase - contexts table)
 * Vector DB: hof-branch-chatbot (Pinecone)
 * Phase 4: Enhanced Knowledge Base Viewer
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { searchWithAccessControl, getIndexStats } from '@/lib/pinecone'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 1. Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Check admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'ceo'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    // 3. Parse request body
    const body = await request.json()
    const {
      query,
      topK = 10,
      namespace = '',
      tier,
      role,
      includeMetadata = true,
    } = body

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query text is required' },
        { status: 400 }
      )
    }

    // 4. Perform vector search with access control
    const vectorResults = await searchWithAccessControl({
      query,
      topK,
      namespace,
      tier,
      role,
      includeMetadata,
    })

    // 5. Get Pinecone IDs from results
    const pineconeIds = vectorResults.map(r => r.id)

    if (pineconeIds.length === 0) {
      return NextResponse.json({
        results: [],
        total: 0,
      })
    }

    // 6. Fetch corresponding contexts from Supabase
    const { data: contexts, error: contextError } = await supabase
      .from('contexts')
      .select(`
        id,
        document_id,
        title,
        content,
        pinecone_id,
        pinecone_namespace,
        access_level,
        embedding_model,
        created_at,
        metadata,
        documents (
          id,
          title
        )
      `)
      .in('pinecone_id', pineconeIds)

    if (contextError) {
      console.error('[Vector Search] Context fetch error:', contextError)
      return NextResponse.json(
        { error: 'Failed to fetch context data' },
        { status: 500 }
      )
    }

    // 7. Merge vector results with context data
    const contextMap = new Map(
      contexts?.map(c => [c.pinecone_id, c]) || []
    )

    const enrichedResults = vectorResults
      .map(vectorResult => {
        const context = contextMap.get(vectorResult.id)
        if (!context) return null

        // Extract and flatten all metadata
        const supabaseMetadata = context.metadata || {}
        const pineconeMetadata = vectorResult.metadata || {}

        return {
          // IDs and scores
          id: context.id,
          pinecone_id: vectorResult.id,
          similarity_score: vectorResult.score,

          // Document info
          document_id: context.document_id,
          document_title: Array.isArray(context.documents) ? context.documents[0]?.title : context.title,

          // Content
          title: context.title,
          content: context.content,

          // Access control
          access_level: context.access_level,

          // Technical details
          pinecone_namespace: context.pinecone_namespace,
          embedding_model: context.embedding_model,
          created_at: context.created_at,

          // ALL Supabase metadata (flattened)
          supabase_metadata: {
            ...supabaseMetadata,
            // Common fields from metadata JSONB
            chunk_index: supabaseMetadata.chunk_index,
            total_chunks: supabaseMetadata.total_chunks,
            page_number: supabaseMetadata.page_number,
            source_file: supabaseMetadata.source_file,
            file_type: supabaseMetadata.file_type,
            uploaded_by: supabaseMetadata.uploaded_by,
            required_role: supabaseMetadata.required_role,
            required_tier: supabaseMetadata.required_tier,
            company: supabaseMetadata.company,
            category: supabaseMetadata.category,
            tags: supabaseMetadata.tags,
          },

          // ALL Pinecone metadata (flattened)
          pinecone_metadata: {
            ...pineconeMetadata,
            // Common fields that might be in Pinecone
            text: pineconeMetadata.text,
            document_id: pineconeMetadata.document_id,
            source: pineconeMetadata.source,
            content_type: pineconeMetadata.content_type,
            access_level: pineconeMetadata.access_level,
            required_role: pineconeMetadata.required_role,
            required_tier: pineconeMetadata.required_tier,
            chunk_index: pineconeMetadata.chunk_index,
            total_chunks: pineconeMetadata.total_chunks,
            company: pineconeMetadata.company,
            category: pineconeMetadata.category,
            created_at: pineconeMetadata.created_at,
          },
        }
      })
      .filter(Boolean) // Remove null entries

    // 8. Return results
    return NextResponse.json({
      results: enrichedResults,
      total: enrichedResults.length,
      query,
      filters: {
        tier: tier || null,
        role: role || null,
        namespace: namespace || null,
      },
    })

  } catch (error: any) {
    console.error('[Vector Search API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * GET: Get Pinecone index statistics and info
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 1. Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Check admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'ceo'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    // 3. Get Pinecone index statistics
    const stats = await getIndexStats()

    // 4. Get context count from Supabase for comparison
    const { count: contextCount, error: countError } = await supabase
      .from('contexts')
      .select('*', { count: 'exact', head: true })

    // 5. Return comprehensive stats
    return NextResponse.json({
      success: true,
      indexName: process.env.PINECONE_INDEX || 'hof-branch-chatbot',
      pinecone: {
        totalVectors: stats.totalVectorCount,
        dimension: stats.dimension,
        namespaces: Object.entries(stats.namespaces).map(([name, data]) => ({
          name,
          vectorCount: (data as any).recordCount || 0,
        })),
      },
      supabase: {
        totalContexts: contextCount || 0,
        syncStatus: countError ? 'error' : 'ok',
      },
      sync: {
        inSync: !countError && contextCount === stats.totalVectorCount,
        difference: !countError ? (contextCount || 0) - stats.totalVectorCount : null,
      },
    })

  } catch (error: any) {
    console.error('[Vector Search Stats API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
