const http = require('http');

console.log('Testing receipt printing API...');

const testData = {
  businessId: 'grocery-demo-2',
  businessType: 'grocery',
  printerId: '1b45cad3-dde3-4286-a840-1d44440a2883',
  items: [{ name: 'Test Item', quantity: 1, unitPrice: 1.00, totalPrice: 1.00 }],
  receiptData: {
    receiptNumber: { formattedNumber: 'TEST-001' },
    businessId: 'grocery-demo-2',
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
  console.error('Error:', e.message);
});

req.write(postData);
req.end();