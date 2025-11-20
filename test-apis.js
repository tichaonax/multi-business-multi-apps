const fetch = require('node-fetch');

async function testAPIs() {
  console.log('Testing Global Inventory APIs...\n');

  // Test 1: User businesses for inventory API
  console.log('1. Testing user-businesses-for-inventory API...');
  try {
    const response = await fetch('http://localhost:8080/api/global/user-businesses-for-inventory?inventoryType=clothing');
    const data = await response.json();
    console.log('   Status:', response.status);
    console.log('   Success:', data.success);
    if (data.success) {
      console.log('   Businesses found:', data.businesses.length);
    } else {
      console.log('   Error:', data.error);
    }
  } catch (error) {
    console.log('   Error:', error.message);
  }

  // Test 2: Inventory lookup API
  console.log('\n2. Testing inventory-lookup API...');
  try {
    const response = await fetch('http://localhost:8080/api/global/inventory-lookup/1234567890123');
    const data = await response.json();
    console.log('   Status:', response.status);
    console.log('   Success:', data.success);
    if (data.success) {
      console.log('   Products found:', data.products.length);
    } else {
      console.log('   Error:', data.error);
    }
  } catch (error) {
    console.log('   Error:', error.message);
  }

  console.log('\nAPI testing complete.');
}

testAPIs();