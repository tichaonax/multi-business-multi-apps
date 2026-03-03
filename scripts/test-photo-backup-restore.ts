/**
 * Test: employee profile photos survive a backup/restore cycle
 *
 * Steps:
 *  1. SETUP   – Insert fake photos into images table + link to first 3 employees
 *  2. BACKUP  – Call createCleanBackup and save to _test-backup.json
 *  3. VALIDATE – Confirm test images appear in backup JSON
 *  4. REMOVE  – Delete images + clear profilePhotoUrl (simulate data loss)
 *  5. VALIDATE REMOVED – Confirm gone from DB
 *  6. RESTORE – Call restoreCleanBackup from saved JSON
 *  7. VALIDATE RESTORED – Confirm photos and URLs are back
 *  8. CLEANUP – Remove test data
 */

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'
import { createCleanBackup } from '../src/lib/backup-clean'
import { restoreCleanBackup } from '../src/lib/restore-clean'

const prisma = new PrismaClient()
const TEST_PREFIX = 'test-photo-backup-restore-'
const BACKUP_FILE = path.join(__dirname, '_test-backup.json')

function sep(label: string) {
  console.log(`\n${'─'.repeat(60)}`)
  console.log(`▶  ${label}`)
  console.log('─'.repeat(60))
}

function makeFakeJpeg(label: string): Buffer {
  const header = Buffer.from([0xff, 0xd8, 0xff, 0xe0]) // JPEG SOI + APP0 marker
  return Buffer.concat([header, Buffer.from(`FAKE_PHOTO_${label}`)])
}

async function main() {
  const testImageIds: string[] = []
  const patchedEmployeeIds: string[] = []
  const originalPhotoUrls: Record<string, string | null> = {}

  try {
    // ── 1. SETUP ──────────────────────────────────────────────────────────
    sep('1. SETUP — insert test photos + link to employees')
    const employees = await prisma.employees.findMany({ take: 3, orderBy: { createdAt: 'asc' } })
    if (employees.length === 0) throw new Error('No employees found — please seed first')
    console.log(`Found ${employees.length} employee(s)`)

    for (const emp of employees) {
      const imgId = `${TEST_PREFIX}${emp.id}`
      const data = makeFakeJpeg(emp.id)
      await prisma.images.create({ data: { id: imgId, data, mimeType: 'image/jpeg', size: data.length } })
      testImageIds.push(imgId)
      originalPhotoUrls[emp.id] = emp.profilePhotoUrl
      await prisma.employees.update({ where: { id: emp.id }, data: { profilePhotoUrl: `/api/images/${imgId}` } })
      patchedEmployeeIds.push(emp.id)
      console.log(`  ✅ image ${imgId} → employee ${emp.firstName} ${emp.lastName}`)
    }

    // ── 2. BACKUP ─────────────────────────────────────────────────────────
    sep('2. BACKUP — create backup JSON')
    const backup = await createCleanBackup(prisma as any, { backupType: 'full', includeDemoData: true })
    fs.writeFileSync(BACKUP_FILE, JSON.stringify(backup))
    const imagesInBackup: any[] = (backup.businessData.images || [])
    console.log(`  Total images in backup: ${imagesInBackup.length}`)
    const testImgsInBackup = imagesInBackup.filter((i: any) => testImageIds.includes(i.id))
    console.log(`  Test images in backup: ${testImgsInBackup.length} / ${testImageIds.length}`)

    if (testImgsInBackup.length !== testImageIds.length) {
      throw new Error(`❌ FAIL: Expected ${testImageIds.length} test images in backup, got ${testImgsInBackup.length}`)
    }
    for (const img of testImgsInBackup) {
      // Debug: show what type Prisma returned for the Bytes field
      const dataType = img.data === null ? 'null' : img.data === undefined ? 'undefined' : img.data.constructor?.name ?? typeof img.data
      const dataLen = img.data?.length ?? img.data?.byteLength ?? '?'
      console.log(`  [debug] Image ${img.id}: data type=${dataType} length=${dataLen}`)
      const hasData = img.data != null && (
        Buffer.isBuffer(img.data) ||
        img.data instanceof Uint8Array ||
        (typeof img.data === 'object' && img.data.type === 'Buffer' && Array.isArray(img.data.data))
      )
      if (!hasData) throw new Error(`❌ FAIL: Image ${img.id} missing data in backup (type=${dataType})`)
      console.log(`  ✅ Image ${img.id}: data present`)
    }

    // ── 3. VALIDATE BEFORE ────────────────────────────────────────────────
    sep('3. VALIDATE — photos exist in DB before removal')
    for (const imgId of testImageIds) {
      const img = await prisma.images.findUnique({ where: { id: imgId } })
      if (!img) throw new Error(`❌ FAIL: Image ${imgId} not in DB`)
      console.log(`  ✅ Image ${imgId}: size=${img.size}`)
    }

    // ── 4. REMOVE ─────────────────────────────────────────────────────────
    sep('4. REMOVE — delete test photos (simulate data loss)')
    for (const empId of patchedEmployeeIds) {
      await prisma.employees.update({ where: { id: empId }, data: { profilePhotoUrl: null } })
    }
    const del = await prisma.images.deleteMany({ where: { id: { in: testImageIds } } })
    console.log(`  Deleted ${del.count} images, cleared ${patchedEmployeeIds.length} employee profilePhotoUrls`)

    // ── 5. VALIDATE REMOVED ───────────────────────────────────────────────
    sep('5. VALIDATE — photos gone from DB')
    for (const imgId of testImageIds) {
      const img = await prisma.images.findUnique({ where: { id: imgId } })
      if (img) throw new Error(`❌ FAIL: Image ${imgId} still exists`)
      console.log(`  ✅ Image ${imgId}: confirmed deleted`)
    }
    const empsAfterDel = await prisma.employees.findMany({ where: { id: { in: patchedEmployeeIds } }, select: { id: true, profilePhotoUrl: true } })
    for (const emp of empsAfterDel) {
      if (emp.profilePhotoUrl) throw new Error(`❌ FAIL: Employee ${emp.id} still has profilePhotoUrl`)
      console.log(`  ✅ Employee ${emp.id}: profilePhotoUrl=null`)
    }

    // ── 6. RESTORE ────────────────────────────────────────────────────────
    sep('6. RESTORE — restore from backup JSON')
    const savedBackup = JSON.parse(fs.readFileSync(BACKUP_FILE, 'utf8'))
    const result = await restoreCleanBackup(prisma as any, savedBackup, {
      onProgress: (model, processed, total) => {
        if (model === 'images') console.log(`  [images] ${processed}/${total}`)
      }
    })
    console.log(`  Restore done: processed=${result.processed} errors=${result.errors} skipped=${result.skippedRecords}`)
    const imgCounts = result.modelCounts?.images
    if (imgCounts) {
      console.log(`  images: attempted=${imgCounts.attempted} successful=${imgCounts.successful} skipped=${imgCounts.skipped}`)
    } else {
      console.warn('  ⚠️  No modelCounts.images — images model may not have been processed')
    }

    // ── 7. VALIDATE RESTORED ──────────────────────────────────────────────
    sep('7. VALIDATE — photos restored')
    let pass = true
    for (const imgId of testImageIds) {
      const img = await prisma.images.findUnique({ where: { id: imgId } })
      if (!img) { console.error(`  ❌ FAIL: Image ${imgId} NOT restored`); pass = false; continue }
      // Prisma returns Bytes as Uint8Array; both Buffer and Uint8Array are valid
      const dataLen = Buffer.isBuffer(img.data) ? img.data.length : img.data instanceof Uint8Array ? img.data.byteLength : 0
      if (dataLen === 0) {
        console.error(`  ❌ FAIL: Image ${imgId} restored but data is empty (type=${img.data?.constructor?.name})`); pass = false; continue
      }
      console.log(`  ✅ Image ${imgId}: size=${img.size} data=${dataLen}B`)
    }
    const empsAfterRestore = await prisma.employees.findMany({ where: { id: { in: patchedEmployeeIds } }, select: { id: true, firstName: true, lastName: true, profilePhotoUrl: true } })
    for (const emp of empsAfterRestore) {
      const expectedUrl = `/api/images/${TEST_PREFIX}${emp.id}`
      if (emp.profilePhotoUrl !== expectedUrl) {
        console.error(`  ❌ FAIL: ${emp.firstName} profilePhotoUrl=${emp.profilePhotoUrl} (expected ${expectedUrl})`); pass = false
      } else {
        console.log(`  ✅ Employee ${emp.firstName} ${emp.lastName}: profilePhotoUrl restored`)
      }
    }
    if (!pass) throw new Error('One or more validation checks failed')
    console.log('\n  🎉 ALL CHECKS PASSED — photos survive backup/restore correctly')

  } finally {
    // ── 8. CLEANUP ────────────────────────────────────────────────────────
    sep('8. CLEANUP — remove test data')
    const del = await prisma.images.deleteMany({ where: { id: { in: testImageIds } } })
    console.log(`  Deleted ${del.count} test image(s)`)
    for (const empId of patchedEmployeeIds) {
      const original = originalPhotoUrls[empId] ?? null
      await prisma.employees.update({ where: { id: empId }, data: { profilePhotoUrl: original } })
      console.log(`  Restored employee ${empId} profilePhotoUrl → ${original ?? 'null'}`)
    }
    if (fs.existsSync(BACKUP_FILE)) { fs.unlinkSync(BACKUP_FILE); console.log('  Removed _test-backup.json') }
    await prisma.$disconnect()
  }
}

main().catch(e => { console.error('\n❌ Test failed:', e.message || e); process.exit(1) })
