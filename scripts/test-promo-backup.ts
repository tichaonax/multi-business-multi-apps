/**
 * Test script: Verify promo tables are captured in backup and restored correctly
 */
import { PrismaClient } from '@prisma/client'
import { createCleanBackup } from '../src/lib/backup-clean'
import { restoreCleanBackup } from '../src/lib/restore-clean'

const prisma = new PrismaClient()

async function main() {
  try {
    // ─── STEP 1: Verify records exist in DB ───────────────────────────────
    const campaigns = await prisma.promoCampaigns.findMany()
    const rewards = await prisma.customerRewards.findMany()
    console.log(`\n[DB] promoCampaigns: ${campaigns.length} records`)
    campaigns.forEach(c => console.log(`  - ${c.id} "${c.name}"`))
    console.log(`[DB] customerRewards: ${rewards.length} records`)
    rewards.forEach(r => console.log(`  - ${r.id} ${r.couponCode} [${r.status}]`))

    // ─── STEP 2: Create backup ────────────────────────────────────────────
    console.log('\n[BACKUP] Creating backup...')
    const backup = await createCleanBackup(prisma, {
      backupType: 'full',
      includeDemoData: false,
      includeBusinessData: true,
      includeDeviceData: false,
      includeAuditLogs: false
    })

    const bd = backup.businessData
    const backupCampaigns = bd.promoCampaigns || []
    const backupRewards = bd.customerRewards || []

    console.log(`\n[BACKUP] promoCampaigns captured: ${backupCampaigns.length}`)
    backupCampaigns.forEach((c: any) => console.log(`  - ${c.id} "${c.name}"`))
    console.log(`[BACKUP] customerRewards captured: ${backupRewards.length}`)
    backupRewards.forEach((r: any) => console.log(`  - ${r.id} ${r.couponCode} [${r.status}]`))

    // ─── STEP 3: Validate counts match ────────────────────────────────────
    const campaignMatch = backupCampaigns.length === campaigns.length
    const rewardMatch = backupRewards.length === rewards.length

    console.log(`\n[VALIDATE] promoCampaigns match: ${campaignMatch ? '✅ PASS' : '❌ FAIL'} (DB: ${campaigns.length}, Backup: ${backupCampaigns.length})`)
    console.log(`[VALIDATE] customerRewards match: ${rewardMatch ? '✅ PASS' : '❌ FAIL'} (DB: ${rewards.length}, Backup: ${backupRewards.length})`)

    // ─── STEP 4: Test restore (same-device, idempotent) ──────────────────
    console.log('\n[RESTORE] Running restore (idempotent upsert)...')
    const result = await restoreCleanBackup(prisma, backup, {
      onProgress: (model, processed, total) => {
        if (model === 'promoCampaigns' || model === 'customerRewards') {
          console.log(`  [restore] ${model}: ${processed}/${total}`)
        }
      },
      onError: (model, id, error) => {
        if (model === 'promoCampaigns' || model === 'customerRewards') {
          console.error(`  [restore ERROR] ${model} ${id}: ${error}`)
        }
      }
    })

    const campaignCount = result.modelCounts['promoCampaigns'] || { attempted: 0, successful: 0, skipped: 0 }
    const rewardCount = result.modelCounts['customerRewards'] || { attempted: 0, successful: 0, skipped: 0 }

    console.log(`\n[RESTORE] promoCampaigns: attempted=${campaignCount.attempted} successful=${campaignCount.successful} skipped=${campaignCount.skipped}`)
    console.log(`[RESTORE] customerRewards: attempted=${rewardCount.attempted} successful=${rewardCount.successful} skipped=${rewardCount.skipped}`)

    const restoreOk = campaignCount.successful === campaigns.length && rewardCount.successful === rewards.length
    console.log(`\n[RESTORE] Result: ${restoreOk ? '✅ PASS' : '❌ FAIL'}`)
    console.log(`[RESTORE] Total processed: ${result.processed}, errors: ${result.errors}, skipped: ${result.skippedRecords}`)

    // ─── Final summary ────────────────────────────────────────────────────
    const allPassed = campaignMatch && rewardMatch && restoreOk
    console.log(`\n${'='.repeat(50)}`)
    console.log(`OVERALL: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`)
    console.log('='.repeat(50))

    process.exit(allPassed ? 0 : 1)
  } catch (e: any) {
    console.error('\n[FATAL]', e.message)
    console.error(e.stack)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
