#!/usr/bin/env node
/**
 * Backfill script: migrate embedded previous-contract IDs into the dedicated DB column
 * - For each employeeContract where previousContractId IS NULL, check:
 *   - pdfGenerationData.previousContractId
 *   - notes string for [BASED_ON:<id>]
 * - If found, set previousContractId = id
 * - Remove previousContractId key from pdfGenerationData and strip the tag from notes
 * - Log summary
 *
 * Usage: node ./scripts/backfill-previous-contracts.js
 */

const { PrismaClient } = require('@prisma/client')

async function run() {
  const prisma = new PrismaClient()
  try {
    console.log('🔌 Backfill start: connecting to DB')

    const contracts = await prisma.employeeContracts.findMany({
      where: { previousContractId: null },
      select: { id: true, pdfGenerationData: true, notes: true }
    })

    console.log(`🔎 Scanning ${contracts.length} contracts with null previousContractId`)

    let migrated = 0
    let cleaned = 0
    let skipped = 0

    for (const c of contracts) {
      const { id, pdfGenerationData, notes } = c
      let parsedId = null

      if (pdfGenerationData && typeof pdfGenerationData === 'object' && pdfGenerationData.previousContractId) {
        parsedId = pdfGenerationData.previousContractId
      }

      if (!parsedId && typeof notes === 'string') {
        const m = notes.match(/\[BASED_ON:([^\]]+)\]/)
        if (m && m[1]) parsedId = m[1]
      }

      if (!parsedId) {
        skipped++
        continue
      }

      // Clean pdfGenerationData by removing previousContractId if present
      let newPdf = pdfGenerationData && typeof pdfGenerationData === 'object' ? { ...pdfGenerationData } : null
      if (newPdf && newPdf.previousContractId) {
        delete newPdf.previousContractId
      }
      if (newPdf && Object.keys(newPdf).length === 0) newPdf = null

      // Clean notes by removing the [BASED_ON:...] tag
      let newNotes = notes
      if (typeof newNotes === 'string') {
        newNotes = newNotes.replace(/\[BASED_ON:[^\]]+\]\s*/g, '')
        if (newNotes.trim() === '') newNotes = null
      }

      try {
        await prisma.employeeContracts.update({
          where: { id },
          data: {
            previousContractId: parsedId,
            pdfGenerationData: newPdf,
            notes: newNotes
          }
        })
        migrated++
        if ((pdfGenerationData && pdfGenerationData.previousContractId) || (notes && /\[BASED_ON:[^\]]+\]/.test(notes))) cleaned++
        console.log(`✅ Migrated contract ${id} -> previousContractId=${parsedId}`)
      } catch (err) {
        console.error(`✖ Failed to update contract ${id}:`, err.message || err)
      }
    }

    console.log('--- Backfill summary ---')
    console.log('Total scanned:', contracts.length)
    console.log('Migrated (set DB column):', migrated)
    console.log('Cleaned embedded traces (pdf/notes):', cleaned)
    console.log('Skipped (no embedded id):', skipped)

    process.exit(0)
  } catch (err) {
    console.error('Backfill failed:', err)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

run()
