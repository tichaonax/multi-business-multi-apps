// Test script for inventory-add API using fetch
const http = require('http');

const postData = JSON.stringify({
  barcode: 'F5600035002BB13CC0436',
  businessId: 'e5bc7e64-a140-4990-870c-59398594cbb2',
  inventoryType: 'clothing',
  productData: {
    name: 'Scanned Product (F5600035002BB13CC0436)',
    description: 'Added from barcode scan on 2025-11-16'
  }
});

const options = {
  hostname: 'localhost',
  port: 8080,
  path: '/api/global/inventory-add',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('Testing inventory-add API...');
console.log('Payload:', postData);

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers:`, res.headers);

  res.setEncoding('utf8');
  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
  });
  res.on('end', () => {
    console.log('Response:', body);
    process.exit(0);
  });
});

req.on('error', (e) => {
  console.error(`Request failed: ${e.message}`);
  process.exit(1);
});

req.write(postData);
req.end();

// Timeout after 10 seconds
setTimeout(() => {
  console.error('Request timed out');
  process.exit(1);
}, 10000);