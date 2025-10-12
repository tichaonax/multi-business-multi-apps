#!/usr/bin/env node
// Load environment from .env.local if dotenv is available; otherwise parse the file manually
try {
  require('dotenv').config()
} catch (e) {
  const fs = require('fs')
  const path = require('path')
  const envPath = path.resolve(__dirname, '..', '.env.local')
  if (fs.existsSync(envPath)) {
    const contents = fs.readFileSync(envPath, 'utf8')
    contents.split(/\r?\n/).forEach((line) => {
      const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m) {
        let val = m[2]
        // remove surrounding quotes if present
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1)
        }
        process.env[m[1]] = val
      }
    })
  }
}

const { PrismaClient } = require('@prisma/client')
const fetch = globalThis.fetch || require('node-fetch')
const prisma = new PrismaClient()

async function buildPdfData(employee, jobTitle, compensationType, business, contractBaseSalary) {
  const basicSalary = contractBaseSalary != null ? contractBaseSalary : 0
  return {
    date: new Date().toLocaleDateString('en-GB'),
    employeeName: employee.fullName,
    employeeNumber: employee.employeeNumber,
    // Fix field mappings to match PDF generator expectations
    employeeAddress: employee.address || null,
    employeePhone: employee.phone || null,
    employeeEmail: employee.email || null,
    nationalId: employee.nationalId || null,
    jobTitle: jobTitle ? jobTitle.title : null,
    contractStartDate: employee.hireDate ? employee.hireDate.toISOString().split('T')[0] : null,
    contractEndDate: null,
    basicSalary,
    compensationType: compensationType ? (compensationType.name || compensationType.type) : null,
    benefits: [],
    businessName: business ? business.name : null,
    businessType: business ? business.type : null,
    contractNumber: null,
    version: 1,
    umbrellaBusinessName: business ? (business.umbrellaBusinessName || 'Demo Umbrella Company') : null,
    notes: 'Regenerated pdfGenerationData (batch)'
  }
}

async function regenerateAll() {
  try {
    console.log('🔁 Starting regeneration of pdfGenerationData for all employees...')

    // Fetch benefit types to randomly assign benefits per contract
    const benefitTypes = await prisma.benefitType.findMany()

    const employees = await prisma.employees.findMany({ select: { id: true, employeeNumber: true, fullName: true, address: true, phone: true, email: true, nationalId: true, hireDate: true, jobTitleId: true, compensationTypeId: true, primaryBusinessId: true } })

    console.log(`ℹ️  Found ${employees.length} employees`) 

    let totalUpdated = 0

    // Determine whether the app is in read-only/maintenance mode by probing the API.
    const seedApiBase = process.env.SEED_API_BASE_URL || 'http://localhost:8080'
    let appIsReadOnly = false
    const checkPaths = ['/api/health', '/api/admin/status', '/api/status']
    for (const p of checkPaths) {
      try {
        const r = await fetch(seedApiBase + p, { method: 'GET', headers: { 'Content-Type': 'application/json' }, timeout: 2000 })
        if (r.status === 503) {
          appIsReadOnly = true
          break
        }
        const j = await r.json().catch(() => null)
        if (j && (j.readOnly === true || j.maintenance === true)) {
          appIsReadOnly = true
          break
        }
      } catch (e) {
        // ignore - endpoint may not exist or be unreachable
      }
    }

    console.log(`ℹ️  App read-only detected: ${appIsReadOnly}`)

    for (const employee of employees) {
      try {
        const [jobTitle, compensationType, business] = await Promise.all([
          employee.jobTitleId ? prisma.jobTitle.findUnique({ where: { id: employee.jobTitleId } }).catch(() => null) : null,
          employee.compensationTypeId ? prisma.compensationType.findUnique({ where: { id: employee.compensationTypeId } }).catch(() => null) : null,
          employee.primaryBusinessId ? prisma.businesses.findUnique({ where: { id: employee.primaryBusinessId } }).catch(() => null) : null
        ])

        const contracts = await prisma.employeeContracts.findMany({ where: { employeeId: employee.id } })
        if (!contracts || contracts.length === 0) continue

  for (const contract of contracts) {
          // contract.baseSalary may be a Prisma.Decimal; convert to number when present
          const baseSalary = contract.baseSalary != null ? Number(contract.baseSalary.toString()) : null

          // sample 1-3 random benefits for this contract
          const shuffled = benefitTypes.sort(() => 0.5 - Math.random())
          const take = Math.floor(Math.random() * 3) + 1 // 1..3
          const sampled = shuffled.slice(0, take).map((bt) => {
            // if benefit type appears percentage-based in its name, mark as percentage
            const isPercentage = /percent|%|commission|bonus/i.test(bt.name || '')
            return {
              benefitTypeId: bt.id,
              name: bt.name,
              amount: isPercentage ? 5.0 : 100 + Math.floor(Math.random() * 400),
              isPercentage
            }
          })

          const pdfData = await buildPdfData(employee, jobTitle, compensationType, business, baseSalary)
          pdfData.benefits = sampled
          pdfData.contractNumber = contract.contractNumber || pdfData.contractNumber || `CT-${employee.employeeNumber}`

          // Try to POST to the contracts API so server-side PDF routines run.
          const seedApiKey = process.env.SEED_API_KEY
          const seedApiBase = process.env.SEED_API_BASE_URL || 'http://localhost:8080'
          let apiUsed = false

          // Ensure we have a dev manager fallback available
          const { getOrCreateDevManager } = require('../src/lib/dev/dev-manager')
          const devMgr = await getOrCreateDevManager(prisma)

          // Prefer contract-level values (these are most accurate for existing contracts)
          let payloadJobTitleId = contract.jobTitleId || employee.jobTitleId || null
          let payloadCompensationTypeId = contract.compensationTypeId || employee.compensationTypeId || null
          let payloadBaseSalary = contract.baseSalary != null ? Number(contract.baseSalary.toString()) : null
          let payloadStartDate = contract.startDate ? new Date(contract.startDate).toISOString().split('T')[0] : (employee.hireDate ? new Date(employee.hireDate).toISOString().split('T')[0] : null)
          let payloadPrimaryBusinessId = contract.primaryBusinessId || employee.primaryBusinessId || null

          // Enrichment: if jobTitleId missing but employee has jobTitleId, use it. If compensation type missing, try to pick a sensible default.
          if (!payloadJobTitleId && employee.jobTitleId) payloadJobTitleId = employee.jobTitleId
          if (!payloadCompensationTypeId && employee.compensationTypeId) payloadCompensationTypeId = employee.compensationTypeId
          // If baseSalary missing, and contract has previous salary or employee has a default in metadata, try to derive - here we avoid guessing and leave null unless contract provides it
          if (payloadBaseSalary == null && contract.previousBaseSalary != null) payloadBaseSalary = Number(contract.previousBaseSalary.toString())

          // If startDate missing, use employee.hireDate (already done). If primaryBusinessId missing, we already try employee.primaryBusinessId.

          // If any required fields are missing, skip API POST and fall back to DB update.
          const missingRequired = !payloadJobTitleId || !payloadCompensationTypeId || payloadBaseSalary == null || !payloadStartDate || !payloadPrimaryBusinessId

          // Only attempt API when the app is not read-only and we have a seed key and required fields
          if (!appIsReadOnly && seedApiKey && !missingRequired) {
            try {
              const res = await fetch(`${seedApiBase}/api/employees/${employee.id}/contracts`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-seed-api-key': seedApiKey
                },
                body: JSON.stringify({
                  jobTitleId: payloadJobTitleId,
                  compensationTypeId: payloadCompensationTypeId,
                  baseSalary: payloadBaseSalary,
                  startDate: payloadStartDate,
                  primaryBusinessId: payloadPrimaryBusinessId,
                  supervisorId: contract.supervisorId || employee.supervisorId || devMgr?.id || null,
                  pdfContractData: pdfData,
                  umbrellaBusinessId: business ? business.umbrellaBusinessId || null : null,
                  businessAssignments: null
                })
              })

              if (res.ok) {
                apiUsed = true
                totalUpdated++
                // log API success and response body for traceability
                const body = await res.json().catch(() => null)
                console.log(`✅ API used for ${employee.employeeNumber} (contract ${contract.id}) - status ${res.status}`)
                if (body) console.log('   API response:', JSON.stringify(body))
              } else {
                const txt = await res.text().catch(() => '')
                console.warn(`⚠️ Contracts API returned ${res.status} for ${employee.employeeNumber}: ${txt}`)
              }
            } catch (err) {
              console.warn(`⚠️ Contracts API call failed for ${employee.employeeNumber}:`, err && err.message ? err.message : err)
            }
          } else if (missingRequired) {
            console.warn(`⚠️ Skipping API POST for ${employee.employeeNumber} because required fields are missing`)
          }

          if (!apiUsed) {
            // Fallback to direct DB update of pdfGenerationData
            await prisma.employeeContracts.update({ where: { id: contract.id }, data: { pdfGenerationData: pdfData, updatedAt: new Date() } })
            totalUpdated++
            console.log(`🔁 DB fallback used for ${employee.employeeNumber} (contract ${contract.id})`)
          }
        }

        console.log(`✅ Regenerated ${contracts.length} contract(s) for ${employee.employeeNumber} (${employee.fullName})`)
      } catch (err) {
        console.error(`⚠️ Failed to regenerate for employee ${employee.employeeNumber}:`, err && err.message ? err.message : err)
      }
    }

    console.log(`🎉 Completed regeneration. Total contracts updated: ${totalUpdated}`)
  } catch (err) {
    console.error('❌ Error during batch regeneration:', err)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  regenerateAll()
}

module.exports = { regenerateAll }
