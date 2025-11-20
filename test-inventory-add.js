// Test script for inventory-add API
const fetch = require('node-fetch');

async function testInventoryAdd() {
  console.log('=== Testing Inventory Add API ===\n');

  try {
    // Test data from the original issue
    const testData = {
      barcode: 'F5600035002BB13CC0436',
      businessId: 'e5bc7e64-a140-4990-870c-59398594cbb2'
    };

    console.log('📝 Test data:');
    console.log(`   Barcode: ${testData.barcode}`);
    console.log(`   Business ID: ${testData.businessId}`);
    console.log('');

    // Make the API request
    const response = await fetch('http://localhost:8080/api/global/inventory-add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Note: This test doesn't include authentication headers
        // In a real scenario, you'd need to include session cookies or JWT tokens
      },
      body: JSON.stringify(testData)
    });

    console.log(`📡 Response status: ${response.status}`);
    console.log(`📡 Response headers:`, Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log(`📡 Response body:`, responseText);

    if (response.ok) {
      console.log('\n✅ SUCCESS! Inventory added successfully');
      try {
        const data = JSON.parse(responseText);
        console.log('📦 Response data:', JSON.stringify(data, null, 2));
      } catch (e) {
        console.log('📦 Raw response:', responseText);
      }
    } else {
      console.log('\n❌ FAILED! API returned error');
      console.log(`   Status: ${response.status}`);
      console.log(`   Body: ${responseText}`);
    }

  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

testInventoryAdd();