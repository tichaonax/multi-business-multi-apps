// Test script for inventory-add API
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
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.write(postData);
req.end();