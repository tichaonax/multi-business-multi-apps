const http = require('http');

const testData = {
  businessId: 'grocery-demo-business',
  businessType: 'grocery',
  printerId: 'test-printer',
  receiptData: {
    receiptNumber: { formattedNumber: 'TEST-001' },
    businessId: 'grocery-demo-business',
    transactionId: 'test-transaction',
    transactionDate: new Date().toISOString(),
    businessName: 'Test Grocery',
    businessType: 'grocery',
    items: [{ name: 'Test Item', quantity: 1, unitPrice: 1.00, totalPrice: 1.00 }],
    subtotal: 1.00,
    tax: 0,
    discount: 0,
    total: 1.00,
    paymentMethod: 'CASH',
    salespersonName: 'Test'
  }
};

const postData = JSON.stringify(testData);
const options = {
  hostname: 'localhost',
  port: 8080,
  path: '/api/print/receipt',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('Sending test request to API...');

const req = http.request(options, (res) => {
  console.log('Status:', res.statusCode);
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      console.log('Response:', JSON.stringify(result, null, 2));
    } catch (e) {
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (e) => {
  console.error('Request error:', e.message);
});

req.write(postData);
req.end();