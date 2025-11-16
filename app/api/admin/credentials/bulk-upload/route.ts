/**
 * Bulk Employee Upload API
 *
 * Accepts CSV/Excel file with employee data and creates user_credentials records.
 *
 * CSV Format:
 * full_name,email,employee_id,department,position,tier,role,phone_number,team,hire_date,location
 *
 * Database: kuixphvkbuuzfezoeyii
 * Phase: Streamlined Implementation
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parse } from 'csv-parse/sync'

interface CSVRecord {
  full_name: string
  email?: string
  employee_id: string
  department?: string
  team?: string
  position?: string
  hire_date?: string
  location?: string
  phone_number?: string
  tier?: 'free' | 'basic' | 'pro' | 'enterprise'
  role?: 'user' | 'junior' | 'senior' | 'manager' | 'admin' | 'ceo'
}

interface ValidationError {
  row: number
  field: string
  message: string
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()

    // 1. Verify admin access
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'ceo'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    // 2. Parse form data
    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Check file type
    const fileName = file.name.toLowerCase()
    if (!fileName.endsWith('.csv')) {
      return NextResponse.json({
        error: 'Invalid file type. Only CSV files are supported.'
      }, { status: 400 })
    }

    // 3. Read and parse CSV
    const text = await file.text()

    let records: CSVRecord[]
    try {
      records = parse(text, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relaxColumnCount: true
      })
    } catch (parseError: any) {
      return NextResponse.json({
        error: 'Failed to parse CSV file',
        details: parseError.message
      }, { status: 400 })
    }

    if (records.length === 0) {
      return NextResponse.json({
        error: 'CSV file is empty or has no valid records'
      }, { status: 400 })
    }

    // 4. Validate records
    const errors: ValidationError[] = []
    const validRecords: any[] = []
    const VALID_TIERS = ['free', 'basic', 'pro', 'enterprise']
    const VALID_ROLES = ['user', 'junior', 'senior', 'manager', 'admin', 'ceo']

    for (const [index, record] of records.entries()) {
      const rowNumber = index + 2 // +2 for header row and 0-indexed

      // Required field validation
      if (!record.full_name || record.full_name.trim() === '') {
        errors.push({
          row: rowNumber,
          field: 'full_name',
          message: 'Full name is required'
        })
        continue
      }

      if (!record.employee_id || record.employee_id.trim() === '') {
        errors.push({
          row: rowNumber,
          field: 'employee_id',
          message: 'Employee ID is required'
        })
        continue
      }

      // Tier validation
      if (record.tier && !VALID_TIERS.includes(record.tier.toLowerCase())) {
        errors.push({
          row: rowNumber,
          field: 'tier',
          message: `Invalid tier "${record.tier}". Must be one of: ${VALID_TIERS.join(', ')}`
        })
        continue
      }

      // Role validation
      if (record.role && !VALID_ROLES.includes(record.role.toLowerCase())) {
        errors.push({
          row: rowNumber,
          field: 'role',
          message: `Invalid role "${record.role}". Must be one of: ${VALID_ROLES.join(', ')}`
        })
        continue
      }

      // Email validation (basic)
      if (record.email && record.email.trim() !== '' && !record.email.includes('@')) {
        errors.push({
          row: rowNumber,
          field: 'email',
          message: 'Invalid email format'
        })
        continue
      }

      // Add to valid records
      validRecords.push({
        full_name: record.full_name.trim(),
        email: record.email?.trim() || null,
        phone_number: record.phone_number?.trim() || null,
        employee_id: record.employee_id.trim(),
        department: record.department?.trim() || null,
        team: record.team?.trim() || null,
        position: record.position?.trim() || null,
        hire_date: record.hire_date?.trim() || null,
        location: record.location?.trim() || null,
        status: 'pending',
        created_by: user.id,
        metadata: {
          tier: record.tier?.toLowerCase() || 'free',
          role: record.role?.toLowerCase() || 'user',
          bulk_upload: true,
          upload_date: new Date().toISOString(),
          uploaded_by: profile.role
        }
      })
    }

    // If there are errors but some valid records, warn user
    if (errors.length > 0 && validRecords.length === 0) {
      return NextResponse.json({
        error: 'All records have validation errors',
        validationErrors: errors,
        totalRows: records.length,
        invalidRows: errors.length
      }, { status: 400 })
    }

    // 5. Insert valid records into database
    const { data: inserted, error: dbError } = await supabase
      .from('user_credentials')
      .insert(validRecords)
      .select()

    if (dbError) {
      console.error('[Bulk Upload] Database error:', dbError)

      // Check for unique constraint violations
      if (dbError.code === '23505') {
        return NextResponse.json({
          error: 'Duplicate employee detected',
          details: 'One or more employee IDs or emails already exist in the database',
          hint: 'Check for duplicate employee_id or email values'
        }, { status: 409 })
      }

      return NextResponse.json({
        error: 'Database error',
        details: dbError.message
      }, { status: 500 })
    }

    // 6. Return success with summary
    return NextResponse.json({
      success: true,
      message: `Successfully uploaded ${inserted.length} employees`,
      summary: {
        totalRows: records.length,
        validRows: validRecords.length,
        invalidRows: errors.length,
        inserted: inserted.length
      },
      credentials: inserted.map(c => ({
        id: c.id,
        full_name: c.full_name,
        employee_id: c.employee_id,
        tier: c.metadata?.tier,
        role: c.metadata?.role
      })),
      validationErrors: errors.length > 0 ? errors : undefined
    })

  } catch (error: any) {
    console.error('[Bulk Upload] Unexpected error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 })
  }
}
