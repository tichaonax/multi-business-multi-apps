/**
 * Reverses warehouse items that were moved to business inventory.
 * Finds all MOVED_TO_BUSINESS items in a given batch (or optionally by barcode),
 * deletes the created business product (cascades to variants, stock movements,
 * product_barcodes, product_images), and resets the warehouse item to IN_WAREHOUSE.
 *
 * Usage:
 *   node scripts/reverse-warehouse-move.js <batchId>
 *   node scripts/reverse-warehouse-move.js <batchId> --barcode 183212005
 */

const path = require('path');
require('dotenv').config({ path: path.join(process.cwd(), '.env.local') });
require('dotenv').config({ path: path.join(process.cwd(), '.env') });
const { Client } = require('pg');

const batchId = process.argv[2];
const barcodeIdx = process.argv.indexOf('--barcode');
const filterBarcode = barcodeIdx !== -1 ? process.argv[barcodeIdx + 1] : null;

if (!batchId) {
  console.error('Usage: node scripts/reverse-warehouse-move.js <batchId> [--barcode <barcode>]');
  process.exit(1);
}

(async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    // Find moved items in the batch
    let query = `
      SELECT wi.id, wi."orderNumber", wi."productName", wi."businessProductId", pv.barcode
      FROM warehouse_items wi
      LEFT JOIN business_products bp ON bp.id = wi."businessProductId"
      LEFT JOIN product_variants pv ON pv."productId" = bp.id AND pv."isActive" = true
      WHERE wi."batchId" = $1
        AND wi.status = 'MOVED_TO_BUSINESS'
        AND wi."businessProductId" IS NOT NULL
    `;
    const queryParams = [batchId];

    if (filterBarcode) {
      query += ` AND pv.barcode = $2`;
      queryParams.push(filterBarcode);
    }

    const { rows: movedItems } = await client.query(query, queryParams);

    if (movedItems.length === 0) {
      console.log('No MOVED_TO_BUSINESS items found for this batch' + (filterBarcode ? ` with barcode ${filterBarcode}` : '') + '.');
      await client.end();
      return;
    }

    console.log(`Found ${movedItems.length} moved item(s) to reverse:`);
    movedItems.forEach(r => console.log(`  - ${r.orderNumber}: ${r.productName.slice(0, 60)} (barcode: ${r.barcode || 'none'})`));

    // Reverse each item
    for (const item of movedItems) {
      const productId = item.businessProductId;
      console.log(`\nReversing item ${item.orderNumber} (productId: ${productId})...`);

      await client.query('BEGIN');
      try {
        // Delete product_barcodes (may not cascade automatically)
        await client.query(`DELETE FROM product_barcodes WHERE "productId" = $1`, [productId]);
        console.log('  ✓ Deleted product_barcodes');

        // Delete product_images
        await client.query(`DELETE FROM product_images WHERE "productId" = $1`, [productId]);
        console.log('  ✓ Deleted product_images');

        // Delete stock movements
        await client.query(`DELETE FROM business_stock_movements WHERE "businessProductId" = $1`, [productId]);
        console.log('  ✓ Deleted stock_movements');

        // Delete variants (stock_movements by variantId already gone)
        await client.query(`DELETE FROM product_variants WHERE "productId" = $1`, [productId]);
        console.log('  ✓ Deleted product_variants');

        // Delete the product itself
        await client.query(`DELETE FROM business_products WHERE id = $1`, [productId]);
        console.log('  ✓ Deleted business_product');

        // Reset warehouse item
        await client.query(`
          UPDATE warehouse_items
          SET status = 'IN_WAREHOUSE',
              "businessProductId" = NULL,
              "movedAt" = NULL,
              "movedBy" = NULL,
              "updatedAt" = NOW()
          WHERE id = $1
        `, [item.id]);
        console.log('  ✓ Reset warehouse item to IN_WAREHOUSE');

        await client.query('COMMIT');
        console.log(`  ✅ Reversed successfully`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`  ❌ Failed to reverse ${item.orderNumber}:`, err.message);
      }
    }

    console.log('\nDone.');
  } finally {
    await client.end();
  }
})();
