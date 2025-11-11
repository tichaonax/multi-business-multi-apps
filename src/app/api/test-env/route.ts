/**
 * Test Environment Variables
 * Simple endpoint to check if env vars are accessible
 */

import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    hasRegistrationKey: !!process.env.SYNC_REGISTRATION_KEY,
    keyLength: process.env.SYNC_REGISTRATION_KEY?.length || 0,
    keyPreview: process.env.SYNC_REGISTRATION_KEY?.substring(0, 10) + '...',
    nodeEnv: process.env.NODE_ENV,
    allEnvKeys: Object.keys(process.env).filter(k => k.startsWith('SYNC_'))
  })
}
