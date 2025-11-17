/**
 * Logout API Route
 * POST /api/auth/logout
 * Clears the user session and signs out from Supabase
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Sign out from Supabase
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('[Logout] Supabase signOut error:', error)
      return NextResponse.json(
        { error: 'Failed to logout', details: error.message },
        { status: 500 }
      )
    }

    console.log('[Logout] User successfully logged out')

    // Return success response
    return NextResponse.json(
      {
        success: true,
        message: 'Successfully logged out'
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[Logout] Unexpected error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
