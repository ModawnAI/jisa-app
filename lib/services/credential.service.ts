/**
 * Credential Service
 *
 * Manages user credentials for the JISA gated chatbot system.
 * Handles CRUD operations for employee credentials that are linked to verification codes.
 *
 * Database: kuixphvkbuuzfezoeyii
 */

import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/types/database'
import bcrypt from 'bcryptjs'

type UserCredential = Database['public']['Tables']['user_credentials']['Row']
type UserCredentialInsert = Database['public']['Tables']['user_credentials']['Insert']
type UserCredentialUpdate = Database['public']['Tables']['user_credentials']['Update']

export interface CreateCredentialInput {
  full_name: string
  email?: string
  phone_number?: string
  employee_id?: string
  national_id?: string // Will be hashed
  department?: string
  team?: string
  position?: string
  hire_date?: string
  location?: string
  metadata?: Record<string, any>
  created_by?: string
}

export interface UpdateCredentialInput {
  full_name?: string
  email?: string
  phone_number?: string
  employee_id?: string
  department?: string
  team?: string
  position?: string
  hire_date?: string
  location?: string
  status?: 'pending' | 'verified' | 'suspended' | 'inactive'
  metadata?: Record<string, any>
}

export interface CredentialSearchParams {
  search?: string // Search across name, email, employee_id
  department?: string
  status?: 'pending' | 'verified' | 'suspended' | 'inactive'
  limit?: number
  offset?: number
}

export interface BulkCredentialInput {
  credentials: CreateCredentialInput[]
  created_by?: string
}

export class CredentialService {
  /**
   * Create a single user credential
   */
  static async createCredential(
    input: CreateCredentialInput
  ): Promise<{ data: UserCredential | null; error: Error | null }> {
    try {
      const supabase = await createClient()

      // Hash national ID if provided
      let national_id_hash: string | undefined
      if (input.national_id) {
        const salt = await bcrypt.genSalt(10)
        national_id_hash = await bcrypt.hash(input.national_id, salt)
      }

      const insertData: UserCredentialInsert = {
        full_name: input.full_name,
        email: input.email,
        phone_number: input.phone_number,
        employee_id: input.employee_id,
        national_id_hash,
        department: input.department,
        team: input.team,
        position: input.position,
        hire_date: input.hire_date,
        location: input.location,
        metadata: input.metadata || {},
        created_by: input.created_by,
        status: 'pending',
      }

      const { data, error } = await supabase
        .from('user_credentials')
        .insert(insertData)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create credential: ${error.message}`)
      }

      return { data, error: null }
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Unknown error'),
      }
    }
  }

  /**
   * Bulk create user credentials
   */
  static async createCredentialsBulk(
    input: BulkCredentialInput
  ): Promise<{
    data: UserCredential[] | null
    error: Error | null
    errors: Array<{ index: number; error: string }> | null
  }> {
    try {
      const supabase = await createClient()
      const errors: Array<{ index: number; error: string }> = []
      const insertData: UserCredentialInsert[] = []

      // Process each credential
      for (let i = 0; i < input.credentials.length; i++) {
        const cred = input.credentials[i]

        try {
          // Hash national ID if provided
          let national_id_hash: string | undefined
          if (cred.national_id) {
            const salt = await bcrypt.genSalt(10)
            national_id_hash = await bcrypt.hash(cred.national_id, salt)
          }

          insertData.push({
            full_name: cred.full_name,
            email: cred.email,
            phone_number: cred.phone_number,
            employee_id: cred.employee_id,
            national_id_hash,
            department: cred.department,
            team: cred.team,
            position: cred.position,
            hire_date: cred.hire_date,
            location: cred.location,
            metadata: cred.metadata || {},
            created_by: input.created_by,
            status: 'pending',
          })
        } catch (error) {
          errors.push({
            index: i,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        }
      }

      if (insertData.length === 0) {
        throw new Error('No valid credentials to insert')
      }

      const { data, error } = await supabase
        .from('user_credentials')
        .insert(insertData)
        .select()

      if (error) {
        throw new Error(`Failed to bulk create credentials: ${error.message}`)
      }

      return {
        data,
        error: null,
        errors: errors.length > 0 ? errors : null,
      }
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Unknown error'),
        errors: null,
      }
    }
  }

  /**
   * Get credential by ID
   */
  static async getCredentialById(
    id: string
  ): Promise<{ data: UserCredential | null; error: Error | null }> {
    try {
      const supabase = await createClient()

      const { data, error } = await supabase
        .from('user_credentials')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        throw new Error(`Failed to get credential: ${error.message}`)
      }

      return { data, error: null }
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Unknown error'),
      }
    }
  }

  /**
   * Search credentials by email or employee_id
   */
  static async findCredential(params: {
    email?: string
    employee_id?: string
  }): Promise<{ data: UserCredential | null; error: Error | null }> {
    try {
      const supabase = await createClient()

      let query = supabase.from('user_credentials').select('*')

      if (params.email) {
        query = query.eq('email', params.email)
      } else if (params.employee_id) {
        query = query.eq('employee_id', params.employee_id)
      } else {
        throw new Error('Either email or employee_id must be provided')
      }

      const { data, error } = await query.single()

      if (error) {
        // Not found is not an error in this context
        if (error.code === 'PGRST116') {
          return { data: null, error: null }
        }
        throw new Error(`Failed to find credential: ${error.message}`)
      }

      return { data, error: null }
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Unknown error'),
      }
    }
  }

  /**
   * Search credentials with filters
   */
  static async searchCredentials(
    params: CredentialSearchParams
  ): Promise<{
    data: UserCredential[] | null
    error: Error | null
    count: number
  }> {
    try {
      const supabase = await createClient()
      const limit = params.limit || 50
      const offset = params.offset || 0

      let query = supabase
        .from('user_credentials')
        .select('*', { count: 'exact' })

      // Search filter
      if (params.search) {
        query = query.or(
          `full_name.ilike.%${params.search}%,email.ilike.%${params.search}%,employee_id.ilike.%${params.search}%`
        )
      }

      // Department filter
      if (params.department) {
        query = query.eq('department', params.department)
      }

      // Status filter
      if (params.status) {
        query = query.eq('status', params.status)
      }

      // Pagination
      query = query.range(offset, offset + limit - 1).order('created_at', { ascending: false })

      const { data, error, count } = await query

      if (error) {
        throw new Error(`Failed to search credentials: ${error.message}`)
      }

      return { data, error: null, count: count || 0 }
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Unknown error'),
        count: 0,
      }
    }
  }

  /**
   * Update credential
   */
  static async updateCredential(
    id: string,
    input: UpdateCredentialInput
  ): Promise<{ data: UserCredential | null; error: Error | null }> {
    try {
      const supabase = await createClient()

      const updateData: UserCredentialUpdate = {
        ...input,
        updated_at: new Date().toISOString(),
      }

      const { data, error } = await supabase
        .from('user_credentials')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to update credential: ${error.message}`)
      }

      return { data, error: null }
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Unknown error'),
      }
    }
  }

  /**
   * Verify credential status (mark as verified)
   */
  static async verifyCredential(
    id: string
  ): Promise<{ data: UserCredential | null; error: Error | null }> {
    try {
      const supabase = await createClient()

      const { data, error } = await supabase
        .from('user_credentials')
        .update({
          status: 'verified',
          verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to verify credential: ${error.message}`)
      }

      return { data, error: null }
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Unknown error'),
      }
    }
  }

  /**
   * Verify national ID hash
   */
  static async verifyNationalId(
    credentialId: string,
    nationalId: string
  ): Promise<{ matches: boolean; error: Error | null }> {
    try {
      const { data: credential, error } = await this.getCredentialById(credentialId)

      if (error || !credential) {
        throw new Error('Credential not found')
      }

      if (!credential.national_id_hash) {
        throw new Error('No national ID hash stored for this credential')
      }

      const matches = await bcrypt.compare(nationalId, credential.national_id_hash)

      return { matches, error: null }
    } catch (error) {
      return {
        matches: false,
        error: error instanceof Error ? error : new Error('Unknown error'),
      }
    }
  }

  /**
   * Delete credential (soft delete by setting status to inactive)
   */
  static async deleteCredential(
    id: string
  ): Promise<{ success: boolean; error: Error | null }> {
    try {
      const supabase = await createClient()

      const { error } = await supabase
        .from('user_credentials')
        .update({
          status: 'inactive',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (error) {
        throw new Error(`Failed to delete credential: ${error.message}`)
      }

      return { success: true, error: null }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Unknown error'),
      }
    }
  }

  /**
   * Get credentials by department
   */
  static async getCredentialsByDepartment(
    department: string
  ): Promise<{ data: UserCredential[] | null; error: Error | null }> {
    try {
      const supabase = await createClient()

      const { data, error } = await supabase
        .from('user_credentials')
        .select('*')
        .eq('department', department)
        .order('full_name', { ascending: true })

      if (error) {
        throw new Error(`Failed to get credentials by department: ${error.message}`)
      }

      return { data, error: null }
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Unknown error'),
      }
    }
  }

  /**
   * Get credential statistics
   */
  static async getCredentialStats(): Promise<{
    data: {
      total: number
      verified: number
      pending: number
      suspended: number
      inactive: number
      by_department: Record<string, number>
    } | null
    error: Error | null
  }> {
    try {
      const supabase = await createClient()

      // Get total counts by status
      const { data: credentials, error } = await supabase
        .from('user_credentials')
        .select('status, department')

      if (error) {
        throw new Error(`Failed to get credential stats: ${error.message}`)
      }

      if (!credentials) {
        return {
          data: {
            total: 0,
            verified: 0,
            pending: 0,
            suspended: 0,
            inactive: 0,
            by_department: {},
          },
          error: null,
        }
      }

      const stats = {
        total: credentials.length,
        verified: credentials.filter((c) => c.status === 'verified').length,
        pending: credentials.filter((c) => c.status === 'pending').length,
        suspended: credentials.filter((c) => c.status === 'suspended').length,
        inactive: credentials.filter((c) => c.status === 'inactive').length,
        by_department: credentials.reduce((acc, c) => {
          const dept = c.department || 'Unknown'
          acc[dept] = (acc[dept] || 0) + 1
          return acc
        }, {} as Record<string, number>),
      }

      return { data: stats, error: null }
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Unknown error'),
      }
    }
  }
}
