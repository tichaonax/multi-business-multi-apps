const http = require('http');

console.log('Testing Global Inventory APIs...\n');

// Test 1: User businesses for inventory API
console.log('1. Testing user-businesses-for-inventory API...');
const options1 = {
  hostname: 'localhost',
  port: 8080,
  path: '/api/global/user-businesses-for-inventory?inventoryType=clothing',
  method: 'GET'
};

const req1 = http.request(options1, (res) => {
  console.log('   Status:', res.statusCode);
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      console.log('   Success:', result.success);
      if (result.success) {
        console.log('   Businesses found:', result.businesses.length);
      } else {
        console.log('   Error:', result.error);
      }
    } catch (e) {
      console.log('   Raw response:', data);
    }
    testInventoryLookup();
  });
});

req1.on('error', (e) => {
  console.log('   Error:', e.message);
  testInventoryLookup();
});

req1.end();

function testInventoryLookup() {
  console.log('\n2. Testing inventory-lookup API...');
  const options2 = {
    hostname: 'localhost',
    port: 8080,
    path: '/api/global/inventory-lookup/1234567890123',
    method: 'GET'
  };

  const req2 = http.request(options2, (res) => {
    console.log('   Status:', res.statusCode);
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      try {
        const result = JSON.parse(data);
        console.log('   Success:', result.success);
        if (result.success) {
          console.log('   Products found:', result.products.length);
        } else {
          console.log('   Error:', result.error);
        }
      } catch (e) {
        console.log('   Raw response:', data);
      }
      console.log('\nAPI testing complete.');
    });
  });

  req2.on('error', (e) => {
    console.log('   Error:', e.message);
    console.log('\nAPI testing complete.');
  });

  req2.end();
}