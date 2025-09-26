import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import { pathToFileURL } from 'url'

async function runScript(scriptPath: string, args: string[] = []) {
  return new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve, reject) => {
    const proc = spawn('node', [scriptPath, ...args], { cwd: process.cwd(), env: process.env })
    let stdout = ''
    let stderr = ''
    proc.stdout.on('data', (d) => { stdout += d.toString() })
    proc.stderr.on('data', (d) => { stderr += d.toString() })
    proc.on('close', (code) => resolve({ code, stdout, stderr }))
    proc.on('error', (err) => reject(err))
  })
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  const currentUser = session?.user as any
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const isAdmin = currentUser?.role === 'admin' || currentUser?.isAdmin
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const businessId = typeof body.businessId === 'string' ? body.businessId : undefined
  const confirmed = !!body.confirm

  if (!businessId) return NextResponse.json({ error: 'businessId required' }, { status: 400 })
  if (!confirmed) return NextResponse.json({ error: 'Confirmation required' }, { status: 400 })

  // Allow client to specify a script 'type' (hardware|grocery|contractors|maintenance|dev)
  const type = typeof body.type === 'string' ? body.type : undefined

  const candidates: Record<string, string> = {
    hardware: 'scripts/seed-hardware-demo.js',
    grocery: 'scripts/seed-grocery-demo.js',
    contractors: 'scripts/seed-contractors-demo.js',
    maintenance: 'scripts/seed-test-maintenance.js',
    dev: 'scripts/seed-dev-data.js'
  }

  // Helper: choose candidate based on explicit type, or businessId heuristics
  let chosen = type && candidates[type] ? candidates[type] : undefined
  if (!chosen) {
    if (businessId.includes('hardware')) chosen = candidates.hardware
    else if (businessId.includes('grocery')) chosen = candidates.grocery
    else if (businessId.includes('contractors')) chosen = candidates.contractors
    else if (businessId.includes('maintenance') || businessId.includes('fleet')) chosen = candidates.maintenance
    else chosen = candidates.dev
  }

  const absPath = path.join(process.cwd(), chosen)

  if (!fs.existsSync(absPath)) {
    // Fallback: no targeted script file available
    return NextResponse.json({ error: 'Not implemented', message: `No targeted seed script available for ${chosen}` }, { status: 501 })
  }

  // Try running the script in-process by importing and calling exported `seed` if available.
  try {
    const fileUrl = pathToFileURL(absPath).href
    let imported: any = null
    try {
      imported = await import(fileUrl)
    } catch (e) {
      // dynamic import of CJS may fail; fall back to spawning a node process
      imported = null
    }

    // Resolve seed function if exported as named or default
    const seedFn = imported?.seed ?? imported?.default?.seed ?? imported?.default ?? null

    if (typeof seedFn === 'function') {
      // Call exported seed in-process. Some seed functions accept a businessId param.
      try {
        const maybePromise = seedFn(businessId)
        if (maybePromise && typeof maybePromise.then === 'function') await maybePromise
        return NextResponse.json({ success: true, ranInProcess: true })
      } catch (err: any) {
        return NextResponse.json({ error: 'In-process seed failed', message: err?.message || String(err) }, { status: 500 })
      }
    }

    // If we couldn't import a callable seed function, spawn a node process as a safe fallback.
    const result = await runScript(absPath, [businessId])
    if (result.code !== 0) {
      return NextResponse.json({ error: 'Seed script failed', stdout: result.stdout, stderr: result.stderr }, { status: 500 })
    }
    return NextResponse.json({ success: true, stdout: result.stdout, ranInProcess: false })
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to run seed script', message: err?.message || String(err) }, { status: 500 })
  }
}
