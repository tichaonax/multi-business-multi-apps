const http = require('http');

const data = JSON.stringify({
  barcode: "F5600035002BB13CC0436",
  businessId: "e5bc7e64-a140-4990-870c-59398594cbb2",
  inventoryType: "clothing",
  productData: {
    name: "Test Product",
    description: "Test Description"
  }
});

const options = {
  hostname: 'localhost',
  port: 8080,
  path: '/api/global/inventory-add',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  },
  timeout: 5000
};

console.log('Making request to inventory-add API...');

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers:`, res.headers);

  res.setEncoding('utf8');
  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
  });
  res.on('end', () => {
    console.log('Response body:', body);
    process.exit(0);
  });
});

req.on('error', (e) => {
  console.error(`Request failed: ${e.message}`);
  process.exit(1);
});

req.on('timeout', () => {
  console.error('Request timed out');
  req.destroy();
  process.exit(1);
});

req.write(data);
req.end();