/**
 * Pinecone Vector Database Integration
 *
 * Provides vector search and similarity matching functionality
 * for the knowledge base system.
 *
 * Index: hof-branch-chatbot
 * Phase 4: Enhanced Knowledge Base Viewer
 */

import { Pinecone } from '@pinecone-database/pinecone'
import OpenAI from 'openai'

// Initialize Pinecone client
let pinecone: Pinecone | null = null

function getPineconeClient(): Pinecone {
  if (!pinecone) {
    const apiKey = process.env.PINECONE_API_KEY
    if (!apiKey) {
      throw new Error('PINECONE_API_KEY is not set')
    }
    pinecone = new Pinecone({ apiKey })
  }
  return pinecone
}

// Initialize OpenAI for embeddings
let openai: OpenAI | null = null

function getOpenAIClient(): OpenAI {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not set')
    }
    openai = new OpenAI({ apiKey })
  }
  return openai
}

/**
 * Get Pinecone index
 */
export function getPineconeIndex(indexName?: string) {
  const client = getPineconeClient()
  const name = indexName || process.env.PINECONE_INDEX || 'hof-branch-chatbot'
  return client.index(name)
}

/**
 * Generate embedding for text using OpenAI
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const client = getOpenAIClient()

  const response = await client.embeddings.create({
    model: 'text-embedding-ada-002',
    input: text,
  })

  return response.data[0].embedding
}

/**
 * Vector search in Pinecone
 */
export interface VectorSearchOptions {
  query: string
  topK?: number
  namespace?: string
  filter?: Record<string, any>
  includeMetadata?: boolean
  includeValues?: boolean
}

export interface VectorSearchResult {
  id: string
  score: number
  metadata?: Record<string, any>
  values?: number[]
}

export async function vectorSearch(
  options: VectorSearchOptions
): Promise<VectorSearchResult[]> {
  const {
    query,
    topK = 10,
    namespace = '',
    filter,
    includeMetadata = true,
    includeValues = false,
  } = options

  // Generate embedding for query
  const queryEmbedding = await generateEmbedding(query)

  // Get index
  const index = getPineconeIndex()

  // Perform search
  const searchResults = await index.namespace(namespace).query({
    vector: queryEmbedding,
    topK,
    filter,
    includeMetadata,
    includeValues,
  })

  return searchResults.matches.map((match) => ({
    id: match.id,
    score: match.score || 0,
    metadata: match.metadata as Record<string, any> | undefined,
    values: match.values,
  }))
}

/**
 * Search with tier/role filtering
 */
export interface TierRoleSearchOptions extends VectorSearchOptions {
  tier?: string
  role?: string
}

export async function searchWithAccessControl(
  options: TierRoleSearchOptions
): Promise<VectorSearchResult[]> {
  const { tier, role, filter, ...searchOptions } = options

  // Build access filter based on tier/role
  const accessFilter: Record<string, any> = { ...filter }

  if (tier || role) {
    // Access level hierarchy mapping
    const tierLevels: Record<string, string[]> = {
      free: ['public'],
      basic: ['public', 'basic'],
      pro: ['public', 'basic', 'intermediate', 'advanced'],
      enterprise: ['public', 'basic', 'intermediate', 'advanced', 'confidential', 'executive'],
    }

    const roleLevels: Record<string, string[]> = {
      user: ['public'],
      junior: ['public', 'basic'],
      senior: ['public', 'basic', 'intermediate'],
      manager: ['public', 'basic', 'intermediate', 'advanced'],
      admin: ['public', 'basic', 'intermediate', 'advanced', 'confidential'],
      ceo: ['public', 'basic', 'intermediate', 'advanced', 'confidential', 'executive'],
    }

    // Determine accessible levels based on tier and role (use the higher access)
    const tierAccess = tier ? tierLevels[tier] || [] : []
    const roleAccess = role ? roleLevels[role] || [] : []

    // Combine both access lists (union)
    const accessibleLevels = [...new Set([...tierAccess, ...roleAccess])]

    if (accessibleLevels.length > 0) {
      accessFilter.access_level = { $in: accessibleLevels }
    }
  }

  return vectorSearch({
    ...searchOptions,
    filter: Object.keys(accessFilter).length > 0 ? accessFilter : undefined,
  })
}

/**
 * Get index stats
 */
export async function getIndexStats(indexName?: string) {
  const index = getPineconeIndex(indexName)
  const stats = await index.describeIndexStats()

  return {
    totalVectorCount: stats.totalRecordCount || 0,
    namespaces: stats.namespaces || {},
    dimension: stats.dimension || 0,
  }
}

/**
 * Fetch vectors by IDs
 */
export async function fetchVectors(
  ids: string[],
  namespace: string = ''
): Promise<Record<string, VectorSearchResult>> {
  const index = getPineconeIndex()

  const response = await index.namespace(namespace).fetch(ids)

  const results: Record<string, VectorSearchResult> = {}

  for (const [id, record] of Object.entries(response.records || {})) {
    results[id] = {
      id,
      score: 1.0, // fetch doesn't have scores
      metadata: record.metadata as Record<string, any> | undefined,
      values: record.values,
    }
  }

  return results
}

/**
 * Delete vectors by IDs
 */
export async function deleteVectors(
  ids: string[],
  namespace: string = ''
): Promise<void> {
  const index = getPineconeIndex()
  await index.namespace(namespace).deleteMany(ids)
}

/**
 * Upsert vectors
 */
export interface VectorRecord {
  id: string
  values: number[]
  metadata?: Record<string, any>
}

export async function upsertVectors(
  vectors: VectorRecord[],
  namespace: string = ''
): Promise<void> {
  const index = getPineconeIndex()
  await index.namespace(namespace).upsert(vectors)
}
