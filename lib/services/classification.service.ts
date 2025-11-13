/**
 * Content Classification Service
 *
 * Handles automatic and manual classification of documents and contexts.
 * Supports rule-based and AI-based classification methods.
 *
 * Database: kuixphvkbuuzfezoeyii
 * Phase 3: Multi-Dimensional Content Classification
 */

import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/types/database'

type Document = Database['public']['Tables']['documents']['Row']
type Context = Database['public']['Tables']['contexts']['Row']

/**
 * Classification input for documents/contexts
 */
export interface ClassificationInput {
  // Content identification
  content_id: string
  content_type: 'document' | 'context'

  // Classification dimensions
  sensitivity_level?: 'public' | 'internal' | 'confidential' | 'secret'
  content_category?: string[]
  target_departments?: string[]
  target_roles?: string[]
  target_tiers?: string[]
  target_positions?: string[]

  // Time-based access
  available_from?: string  // ISO timestamp
  available_until?: string  // ISO timestamp

  // Geographic and compliance
  geo_restrictions?: string[]  // ISO country codes
  compliance_tags?: string[]

  // Classification metadata
  classification_method?: 'manual' | 'ai' | 'rule-based'
  classification_confidence?: number  // 0.0-1.0
  classifier_user_id?: string
}

/**
 * Auto-classification result
 */
export interface AutoClassificationResult {
  success: boolean
  classifications: {
    content_id: string
    content_type: 'document' | 'context'
    suggested_sensitivity: string
    suggested_categories: string[]
    suggested_departments: string[]
    confidence: number
    reasoning: string
  }[]
  errors?: string[]
}

/**
 * Rule-based classification patterns
 */
const CLASSIFICATION_RULES = {
  sensitivity: [
    {
      pattern: /비밀|기밀|confidential|secret/gi,
      level: 'confidential',
      confidence: 0.9,
    },
    {
      pattern: /내부|internal|제한/gi,
      level: 'internal',
      confidence: 0.8,
    },
    {
      pattern: /공개|public|일반/gi,
      level: 'public',
      confidence: 0.7,
    },
  ],
  categories: [
    {
      pattern: /교육|training|학습|연수/gi,
      category: 'training',
      confidence: 0.85,
    },
    {
      pattern: /규정|compliance|법률|규칙/gi,
      category: 'compliance',
      confidence: 0.85,
    },
    {
      pattern: /영업|sales|판매|계약/gi,
      category: 'sales',
      confidence: 0.8,
    },
    {
      pattern: /상품|product|제품|보험/gi,
      category: 'product_info',
      confidence: 0.8,
    },
    {
      pattern: /마케팅|marketing|홍보|광고/gi,
      category: 'marketing',
      confidence: 0.8,
    },
    {
      pattern: /운영|operations|업무|프로세스/gi,
      category: 'operations',
      confidence: 0.75,
    },
    {
      pattern: /재무|finance|회계|예산/gi,
      category: 'finance',
      confidence: 0.8,
    },
    {
      pattern: /인사|HR|채용|급여/gi,
      category: 'hr',
      confidence: 0.8,
    },
  ],
  departments: [
    {
      pattern: /영업부|sales department|영업팀/gi,
      department: 'Sales',
      confidence: 0.85,
    },
    {
      pattern: /마케팅부|marketing department|마케팅팀/gi,
      department: 'Marketing',
      confidence: 0.85,
    },
    {
      pattern: /운영부|operations department|운영팀/gi,
      department: 'Operations',
      confidence: 0.85,
    },
    {
      pattern: /재무부|finance department|재무팀/gi,
      department: 'Finance',
      confidence: 0.85,
    },
    {
      pattern: /인사부|HR department|인사팀/gi,
      department: 'HR',
      confidence: 0.85,
    },
    {
      pattern: /고객서비스|customer service|CS팀/gi,
      department: 'Customer Service',
      confidence: 0.85,
    },
  ],
  compliance: [
    {
      pattern: /GDPR|개인정보|personal data|privacy/gi,
      tag: 'GDPR',
      confidence: 0.9,
    },
    {
      pattern: /HIPAA|의료정보|health information/gi,
      tag: 'HIPAA',
      confidence: 0.9,
    },
    {
      pattern: /PII|개인식별정보/gi,
      tag: 'PII',
      confidence: 0.9,
    },
    {
      pattern: /금융|financial|재무정보/gi,
      tag: 'Financial',
      confidence: 0.85,
    },
    {
      pattern: /수출|export control/gi,
      tag: 'Export Control',
      confidence: 0.85,
    },
  ],
}

export class ContentClassificationService {
  /**
   * Apply classification to document
   */
  static async classifyDocument(
    input: ClassificationInput
  ): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient()

    try {
      // Validate content exists
      const { data: existing, error: fetchError } = await supabase
        .from('documents')
        .select('id, title, description')
        .eq('id', input.content_id)
        .single()

      if (fetchError || !existing) {
        return { success: false, error: 'Document not found' }
      }

      // Build update object
      const updateData: Partial<Document> = {
        sensitivity_level: input.sensitivity_level,
        content_category: input.content_category,
        target_departments: input.target_departments,
        target_roles: input.target_roles,
        target_tiers: input.target_tiers,
        target_positions: input.target_positions,
        available_from: input.available_from,
        available_until: input.available_until,
        geo_restrictions: input.geo_restrictions,
        compliance_tags: input.compliance_tags,
        auto_classified: input.classification_method !== 'manual',
        classification_confidence: input.classification_confidence || 1.0,
        classification_method: input.classification_method || 'manual',
        updated_at: new Date().toISOString(),
      }

      // Apply classification
      const { error: updateError } = await supabase
        .from('documents')
        .update(updateData)
        .eq('id', input.content_id)

      if (updateError) {
        return { success: false, error: updateError.message }
      }

      // Log classification event
      await this.logClassificationEvent({
        content_id: input.content_id,
        content_type: 'document',
        classifier_user_id: input.classifier_user_id,
        classification_method: input.classification_method || 'manual',
        confidence: input.classification_confidence || 1.0,
      })

      return { success: true }
    } catch (error) {
      console.error('[Classification] Error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Apply classification to context
   */
  static async classifyContext(
    input: ClassificationInput
  ): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient()

    try {
      // Validate content exists
      const { data: existing, error: fetchError } = await supabase
        .from('contexts')
        .select('id, text')
        .eq('id', input.content_id)
        .single()

      if (fetchError || !existing) {
        return { success: false, error: 'Context not found' }
      }

      // Build update object
      const updateData: Partial<Context> = {
        sensitivity_level: input.sensitivity_level,
        content_category: input.content_category,
        target_departments: input.target_departments,
        target_roles: input.target_roles,
        target_tiers: input.target_tiers,
        target_positions: input.target_positions,
        available_from: input.available_from,
        available_until: input.available_until,
        geo_restrictions: input.geo_restrictions,
        compliance_tags: input.compliance_tags,
        updated_at: new Date().toISOString(),
      }

      // Apply classification
      const { error: updateError } = await supabase
        .from('contexts')
        .update(updateData)
        .eq('id', input.content_id)

      if (updateError) {
        return { success: false, error: updateError.message }
      }

      // Log classification event
      await this.logClassificationEvent({
        content_id: input.content_id,
        content_type: 'context',
        classifier_user_id: input.classifier_user_id,
        classification_method: input.classification_method || 'manual',
        confidence: input.classification_confidence || 1.0,
      })

      return { success: true }
    } catch (error) {
      console.error('[Classification] Error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Auto-classify content using rule-based system
   */
  static async autoClassifyContent(params: {
    content_id: string
    content_type: 'document' | 'context'
    content_text: string
  }): Promise<{
    success: boolean
    suggestions: {
      sensitivity_level?: string
      content_category?: string[]
      target_departments?: string[]
      compliance_tags?: string[]
      confidence: number
    }
    error?: string
  }> {
    try {
      const { content_text } = params

      // Apply sensitivity rules
      let suggestedSensitivity: string | undefined
      let sensitivityConfidence = 0

      for (const rule of CLASSIFICATION_RULES.sensitivity) {
        if (rule.pattern.test(content_text)) {
          if (rule.confidence > sensitivityConfidence) {
            suggestedSensitivity = rule.level
            sensitivityConfidence = rule.confidence
          }
        }
      }

      // Apply category rules
      const suggestedCategories: Array<{ category: string; confidence: number }> = []

      for (const rule of CLASSIFICATION_RULES.categories) {
        if (rule.pattern.test(content_text)) {
          suggestedCategories.push({
            category: rule.category,
            confidence: rule.confidence,
          })
        }
      }

      // Apply department rules
      const suggestedDepartments: Array<{ department: string; confidence: number }> = []

      for (const rule of CLASSIFICATION_RULES.departments) {
        if (rule.pattern.test(content_text)) {
          suggestedDepartments.push({
            department: rule.department,
            confidence: rule.confidence,
          })
        }
      }

      // Apply compliance rules
      const suggestedComplianceTags: Array<{ tag: string; confidence: number }> = []

      for (const rule of CLASSIFICATION_RULES.compliance) {
        if (rule.pattern.test(content_text)) {
          suggestedComplianceTags.push({
            tag: rule.tag,
            confidence: rule.confidence,
          })
        }
      }

      // Calculate overall confidence
      const allConfidences = [
        sensitivityConfidence,
        ...suggestedCategories.map((c) => c.confidence),
        ...suggestedDepartments.map((d) => d.confidence),
        ...suggestedComplianceTags.map((t) => t.confidence),
      ].filter((c) => c > 0)

      const overallConfidence =
        allConfidences.length > 0
          ? allConfidences.reduce((a, b) => a + b, 0) / allConfidences.length
          : 0.5

      return {
        success: true,
        suggestions: {
          sensitivity_level: suggestedSensitivity,
          content_category: suggestedCategories
            .sort((a, b) => b.confidence - a.confidence)
            .map((c) => c.category),
          target_departments: suggestedDepartments
            .sort((a, b) => b.confidence - a.confidence)
            .map((d) => d.department),
          compliance_tags: suggestedComplianceTags
            .sort((a, b) => b.confidence - a.confidence)
            .map((t) => t.tag),
          confidence: overallConfidence,
        },
      }
    } catch (error) {
      console.error('[Auto-Classification] Error:', error)
      return {
        success: false,
        suggestions: { confidence: 0 },
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Batch classify multiple documents
   */
  static async batchClassifyDocuments(params: {
    document_ids: string[]
    classifier_user_id: string
    auto_classify?: boolean
  }): Promise<AutoClassificationResult> {
    const supabase = await createClient()
    const classifications = []
    const errors: string[] = []

    try {
      // Get documents
      const { data: documents, error: fetchError } = await supabase
        .from('documents')
        .select('id, title, description, file_path')
        .in('id', params.document_ids)

      if (fetchError) {
        throw new Error(`Failed to fetch documents: ${fetchError.message}`)
      }

      if (!documents || documents.length === 0) {
        throw new Error('No documents found')
      }

      // Process each document
      for (const doc of documents) {
        try {
          // Combine title and description for classification
          const contentText = `${doc.title || ''} ${doc.description || ''}`.trim()

          if (!contentText) {
            errors.push(`Document ${doc.id}: No content to classify`)
            continue
          }

          // Auto-classify
          const result = await this.autoClassifyContent({
            content_id: doc.id,
            content_type: 'document',
            content_text: contentText,
          })

          if (!result.success || !result.suggestions) {
            errors.push(`Document ${doc.id}: Classification failed`)
            continue
          }

          classifications.push({
            content_id: doc.id,
            content_type: 'document' as const,
            suggested_sensitivity: result.suggestions.sensitivity_level || 'internal',
            suggested_categories: result.suggestions.content_category || [],
            suggested_departments: result.suggestions.target_departments || [],
            confidence: result.suggestions.confidence,
            reasoning: `Rule-based classification with ${(result.suggestions.confidence * 100).toFixed(1)}% confidence`,
          })

          // If auto_classify is true, apply the classification immediately
          if (params.auto_classify) {
            await this.classifyDocument({
              content_id: doc.id,
              content_type: 'document',
              sensitivity_level: result.suggestions.sensitivity_level as any,
              content_category: result.suggestions.content_category,
              target_departments: result.suggestions.target_departments,
              compliance_tags: result.suggestions.compliance_tags,
              classification_method: 'rule-based',
              classification_confidence: result.suggestions.confidence,
              classifier_user_id: params.classifier_user_id,
            })
          }
        } catch (error) {
          errors.push(
            `Document ${doc.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
          )
        }
      }

      return {
        success: true,
        classifications,
        errors: errors.length > 0 ? errors : undefined,
      }
    } catch (error) {
      console.error('[Batch Classification] Error:', error)
      return {
        success: false,
        classifications: [],
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      }
    }
  }

  /**
   * Get classification statistics
   */
  static async getClassificationStats(): Promise<{
    data: {
      total_documents: number
      classified_documents: number
      auto_classified: number
      manually_classified: number
      by_sensitivity: Record<string, number>
      by_category: Record<string, number>
      by_method: Record<string, number>
      average_confidence: number
    } | null
    error: Error | null
  }> {
    const supabase = await createClient()

    try {
      // Get all documents
      const { data: documents, error } = await supabase
        .from('documents')
        .select('sensitivity_level, content_category, auto_classified, classification_method, classification_confidence')

      if (error) {
        throw new Error(`Failed to get documents: ${error.message}`)
      }

      if (!documents) {
        return {
          data: {
            total_documents: 0,
            classified_documents: 0,
            auto_classified: 0,
            manually_classified: 0,
            by_sensitivity: {},
            by_category: {},
            by_method: {},
            average_confidence: 0,
          },
          error: null,
        }
      }

      const stats = {
        total_documents: documents.length,
        classified_documents: documents.filter(
          (d) => d.sensitivity_level || (d.content_category && d.content_category.length > 0)
        ).length,
        auto_classified: documents.filter((d) => d.auto_classified).length,
        manually_classified: documents.filter((d) => !d.auto_classified && d.classification_method === 'manual').length,
        by_sensitivity: {} as Record<string, number>,
        by_category: {} as Record<string, number>,
        by_method: {} as Record<string, number>,
        average_confidence: 0,
      }

      // Count by sensitivity
      for (const doc of documents) {
        if (doc.sensitivity_level) {
          stats.by_sensitivity[doc.sensitivity_level] = (stats.by_sensitivity[doc.sensitivity_level] || 0) + 1
        }
      }

      // Count by category
      for (const doc of documents) {
        if (doc.content_category && Array.isArray(doc.content_category)) {
          for (const category of doc.content_category) {
            stats.by_category[category] = (stats.by_category[category] || 0) + 1
          }
        }
      }

      // Count by method
      for (const doc of documents) {
        if (doc.classification_method) {
          stats.by_method[doc.classification_method] = (stats.by_method[doc.classification_method] || 0) + 1
        }
      }

      // Calculate average confidence
      const confidences = documents
        .filter((d) => d.classification_confidence !== null && d.classification_confidence !== undefined)
        .map((d) => d.classification_confidence!)

      stats.average_confidence =
        confidences.length > 0 ? confidences.reduce((a, b) => a + b, 0) / confidences.length : 0

      return { data: stats, error: null }
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Unknown error'),
      }
    }
  }

  /**
   * Log classification event for audit trail
   */
  private static async logClassificationEvent(params: {
    content_id: string
    content_type: 'document' | 'context'
    classifier_user_id?: string
    classification_method: string
    confidence: number
  }): Promise<void> {
    const supabase = await createClient()

    await supabase.from('analytics_events').insert({
      user_id: params.classifier_user_id || null,
      event_type: 'content_classification',
      event_data: {
        content_id: params.content_id,
        content_type: params.content_type,
        classification_method: params.classification_method,
        confidence: params.confidence,
        timestamp: new Date().toISOString(),
      },
    })
  }
}
