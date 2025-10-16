import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'public', 'sync-test-data.json')
    
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'Test file not found' }, { status: 404 })
    }
    
    const fileContent = fs.readFileSync(filePath, 'utf8')
    const testData = JSON.parse(fileContent)
    
    return NextResponse.json(testData, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  } catch (error) {
    console.error('Error reading test file:', error)
    return NextResponse.json({ error: 'Failed to read test file' }, { status: 500 })
  }
}