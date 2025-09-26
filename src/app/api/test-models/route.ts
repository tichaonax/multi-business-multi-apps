import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Test what models are available
    const models = Object.keys(prisma).filter(key => !key.startsWith('$'))
    
    return NextResponse.json({ 
      availableModels: models,
      prismaClient: !!prisma
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to test models', details: error }, { status: 500 })
  }
}