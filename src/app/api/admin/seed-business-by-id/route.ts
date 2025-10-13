import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import { pathToFileURL } from 'url'
import { prisma } from '@/lib/prisma'

import { randomBytes } from 'crypto';
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

  // Ensure the target business exists. If it doesn't, create a minimal placeholder so
  // downstream seed scripts that rely on the businessId won't create dangling children.
  let createdPlaceholder = false
  let createdMembership = false
  try {
    const existingBusiness = await prisma.businesses.findUnique({ where: { id: businessId } })
    if (!existingBusiness) {
      const now = new Date()
      const name = `Demo - ${businessId}`
      await prisma.businesses.create({ data: { id: businessId, name, type: type || 'demo', description: `Auto-created for seed: ${businessId}`, isActive: true, createdAt: now, updatedAt: now } })
      createdPlaceholder = true

      // Also create a membership for the requesting admin so they can switch to the new business
      try {
        const existingMembership = await prisma.businessMemberships.findFirst({ where: { userId: currentUser.id, businessId } })
        if (!existingMembership) {
          const membershipId = `${currentUser.id}-${businessId}`
          await prisma.businessMemberships.create({ data: { id: membershipId, userId: currentUser.id, businessId, role: 'business-owner', isActive: true, permissions: {}, joinedAt: now } as any })
          createdMembership = true
        }
      } catch (err2) {
        console.warn('Failed to create membership for seeded business:', String(err2))
      }
    } else if (!existingBusiness.isActive) {
      // If the business exists but is inactive, activate it so seed scripts can attach children
      try {
        await prisma.businesses.update({ where: { id: businessId }, data: { isActive: true, updatedAt: new Date() } })
      } catch (err3) {
        console.warn('Failed to activate existing business prior to seeding:', String(err3))
      }
    }
  } catch (err) {
    // Non-fatal: if we cannot create the placeholder business, continue and let the seed script handle the error.
    console.warn('Failed to ensure business exists prior to seeding:', String(err))
  }

  // Try running the script in-process by importing and calling exported `seed` if available.
    try {
      function devScriptsAllowed() {
        return process.env.NODE_ENV !== 'production' || process.env.ALLOW_DEV_SCRIPTS === 'true'
      }

      // Avoid dynamic `import(fileUrl)` because bundlers emit a "request of a
      // dependency is an expression" warning for non-literal imports. Instead
      // use a runtime-only CommonJS require via eval('require') which the
      // bundler won't statically analyze. Only attempt to load when dev scripts
      // are allowed.
      let imported: any = null
      if (devScriptsAllowed()) {
        try {
          // eslint-disable-next-line no-eval
          const req = eval('require') as NodeRequire
          imported = req(absPath)
        } catch (err) {
          imported = null
        }
      }

      // Resolve seed function if exported as named or default
      const seedFn = imported?.seed ?? imported?.default?.seed ?? imported?.default ?? null

        if (typeof seedFn === 'function') {
        // Call exported seed in-process. Some seed functions accept a businessId param.
        try {
          const maybePromise = seedFn(businessId)
          if (maybePromise && typeof maybePromise.then === 'function') await maybePromise
          return NextResponse.json({ success: true, ranInProcess: true, createdBusiness: createdPlaceholder ? businessId : undefined, createdMembership: createdMembership || undefined })
        } catch (err: any) {
          return NextResponse.json({ error: 'In-process seed failed', message: err?.message || String(err) }, { status: 500 })
        }
      }

    // If we couldn't import a callable seed function, spawn a node process as a safe fallback.
    const result = await runScript(absPath, [businessId])
    if (result.code !== 0) {
      return NextResponse.json({ error: 'Seed script failed', stdout: result.stdout, stderr: result.stderr }, { status: 500 })
    }
    return NextResponse.json({ success: true, stdout: result.stdout, ranInProcess: false, createdBusiness: createdPlaceholder ? businessId : undefined, createdMembership: createdMembership || undefined })
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to run seed script', message: err?.message || String(err) }, { status: 500 })
  }
}
