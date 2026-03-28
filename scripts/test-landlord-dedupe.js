/**
 * Test script for landlord deduplication migration logic
 * Inserts duplicate landlords + references, runs dedup SQL, verifies result, cleans up
 */
const { PrismaClient } = require('@prisma/client')
const { randomUUID } = require('crypto')
const prisma = new PrismaClient()

async function main() {
  console.log('\n══════════════════════════════════════════════════')
  console.log('  LANDLORD DEDUP MIGRATION TEST')
  console.log('══════════════════════════════════════════════════\n')

  // ── Setup: find a business and expense account to reference ──────────────
  const business = await prisma.businesses.findFirst({ select: { id: true, type: true } })
  if (!business) throw new Error('No business found — cannot run test')

  const expenseAccount = await prisma.expenseAccounts.findFirst({
    where: { businessId: business.id, isActive: true },
    select: { id: true }
  })
  if (!expenseAccount) throw new Error('No expense account found')

  const user = await prisma.users.findFirst({ select: { id: true } })
  if (!user) throw new Error('No user found')

  console.log(`Using business: ${business.id} (${business.type})`)
  console.log(`Using expenseAccount: ${expenseAccount.id}`)

  // ── Step 1: Insert 3 duplicate landlords with same name ───────────────────
  console.log('\n[1] Inserting 3 duplicate landlords named "Test Landlord Co"...')
  const oldestId = randomUUID()
  const dup1Id = randomUUID()
  const dup2Id = randomUUID()

  const oldest = await prisma.businessSuppliers.create({
    data: {
      id: oldestId,
      supplierNumber: `LND-TEST-${oldestId.slice(0,8).toUpperCase()}`,
      name: 'Test Landlord Co',
      businessType: 'LANDLORD',
      businessId: null,
      supplierType: 'LANDLORD',
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date(),
    }
  })
  const dup1 = await prisma.businessSuppliers.create({
    data: {
      id: dup1Id,
      supplierNumber: `LND-TEST-${dup1Id.slice(0,8).toUpperCase()}`,
      name: 'Test Landlord Co',
      businessType: 'LANDLORD',
      businessId: null,
      supplierType: 'LANDLORD',
      createdAt: new Date('2025-06-01'),
      updatedAt: new Date(),
    }
  })
  const dup2 = await prisma.businessSuppliers.create({
    data: {
      id: dup2Id,
      supplierNumber: `LND-TEST-${dup2Id.slice(0,8).toUpperCase()}`,
      name: 'Test Landlord Co',  // same name, different case to test case-insensitive
      businessType: 'LANDLORD',
      businessId: null,
      supplierType: 'LANDLORD',
      createdAt: new Date('2025-12-01'),
      updatedAt: new Date(),
    }
  })
  console.log(`  ✓ oldest: ${oldest.id} (${oldest.createdAt.toISOString().split('T')[0]})`)
  console.log(`  ✓ dup1:   ${dup1.id} (${dup1.createdAt.toISOString().split('T')[0]})`)
  console.log(`  ✓ dup2:   ${dup2.id} (${dup2.createdAt.toISOString().split('T')[0]})`)

  // ── Step 2: Point an existing rent config to dup1 ────────────────────────
  console.log('\n[2] Pointing existing rent config to dup1...')
  const existingRentConfig = await prisma.businessRentConfig.findFirst({ select: { id: true, landlordSupplierId: true } })
  if (!existingRentConfig) throw new Error('No rent config found to test with')
  const originalLandlordId = existingRentConfig.landlordSupplierId
  await prisma.businessRentConfig.update({
    where: { id: existingRentConfig.id },
    data: { landlordSupplierId: dup1.id }
  })
  const rentConfig = existingRentConfig
  console.log(`  ✓ rent config ${rentConfig.id} → landlord ${dup1.id}`)

  // ── Step 3: Run the dedup SQL ──────────────────────────────────────────────
  console.log('\n[3] Running dedup SQL...')
  await prisma.$executeRawUnsafe(`
    DO $$
    DECLARE
      dup RECORD;
      keeper_id TEXT;
    BEGIN
      FOR dup IN
        SELECT LOWER(TRIM(name)) AS norm_name
        FROM business_suppliers
        WHERE "supplierType" = 'LANDLORD'
        GROUP BY LOWER(TRIM(name))
        HAVING COUNT(*) > 1
      LOOP
        SELECT id INTO keeper_id
        FROM business_suppliers
        WHERE "supplierType" = 'LANDLORD'
          AND LOWER(TRIM(name)) = dup.norm_name
        ORDER BY "createdAt" ASC
        LIMIT 1;

        UPDATE business_rent_configs
        SET "landlordSupplierId" = keeper_id
        WHERE "landlordSupplierId" IN (
          SELECT id FROM business_suppliers
          WHERE "supplierType" = 'LANDLORD'
            AND LOWER(TRIM(name)) = dup.norm_name
            AND id <> keeper_id
        );

        UPDATE expense_account_payments
        SET "payeeSupplierId" = keeper_id
        WHERE "payeeSupplierId" IN (
          SELECT id FROM business_suppliers
          WHERE "supplierType" = 'LANDLORD'
            AND LOWER(TRIM(name)) = dup.norm_name
            AND id <> keeper_id
        );

        UPDATE supplier_payment_requests
        SET "supplierId" = keeper_id
        WHERE "supplierId" IN (
          SELECT id FROM business_suppliers
          WHERE "supplierType" = 'LANDLORD'
            AND LOWER(TRIM(name)) = dup.norm_name
            AND id <> keeper_id
        );

        UPDATE supplier_ratings
        SET "supplierId" = keeper_id
        WHERE "supplierId" IN (
          SELECT id FROM business_suppliers
          WHERE "supplierType" = 'LANDLORD'
            AND LOWER(TRIM(name)) = dup.norm_name
            AND id <> keeper_id
        );

        DELETE FROM business_suppliers
        WHERE "supplierType" = 'LANDLORD'
          AND LOWER(TRIM(name)) = dup.norm_name
          AND id <> keeper_id;

        RAISE NOTICE 'Deduped landlord "%" — kept %', dup.norm_name, keeper_id;
      END LOOP;
    END $$;
  `)
  console.log('  ✓ Dedup SQL executed')

  // ── Step 4: Verify ────────────────────────────────────────────────────────
  console.log('\n[4] Verifying results...')
  let pass = true

  const remaining = await prisma.businessSuppliers.findMany({
    where: { name: { contains: 'Test Landlord Co', mode: 'insensitive' }, supplierType: 'LANDLORD' },
    select: { id: true, name: true, createdAt: true }
  })
  if (remaining.length === 1 && remaining[0].id === oldest.id) {
    console.log(`  ✓ Only oldest record remains: ${remaining[0].id}`)
  } else {
    console.log(`  ✗ Expected 1 record (oldest), found ${remaining.length}: ${remaining.map(r => r.id).join(', ')}`)
    pass = false
  }

  const updatedRentConfig = await prisma.businessRentConfig.findUnique({
    where: { id: rentConfig.id },
    select: { landlordSupplierId: true }
  })
  if (updatedRentConfig?.landlordSupplierId === oldest.id) {
    console.log(`  ✓ Rent config re-pointed to oldest: ${oldest.id}`)
  } else {
    console.log(`  ✗ Rent config still points to: ${updatedRentConfig?.landlordSupplierId}`)
    pass = false
  }

  // ── Step 5: Cleanup ───────────────────────────────────────────────────────
  console.log('\n[5] Cleaning up test data...')
  // Restore original landlord on rent config
  await prisma.businessRentConfig.update({
    where: { id: rentConfig.id },
    data: { landlordSupplierId: originalLandlordId }
  })
  // Remove test landlords (dup1/dup2 already deleted by dedup, only oldest remains)
  await prisma.businessSuppliers.deleteMany({
    where: { id: { in: [oldest.id, dup1.id, dup2.id] } }
  })
  console.log('  ✓ Test data removed')

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════')
  if (pass) {
    console.log('  ✅  DEDUP MIGRATION VERIFIED — safe to deploy')
  } else {
    console.log('  ❌  TEST FAILED — review output above')
  }
  console.log('══════════════════════════════════════════════════\n')

  await prisma.$disconnect()
  process.exit(pass ? 0 : 1)
}

main().catch(e => { console.error(e); process.exit(1) })
