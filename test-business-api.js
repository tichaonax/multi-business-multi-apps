const http = require('http');

console.log('Testing user-businesses-for-inventory API...');

const options = {
  hostname: 'localhost',
  port: 8080,
  path: '/api/global/user-businesses-for-inventory?inventoryType=clothing',
  method: 'GET'
};

const req = http.request(options, (res) => {
  console.log('Status:', res.statusCode);
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      console.log('Success:', result.success);
      if (result.success) {
        console.log('Businesses found:', result.businesses.length);
        if (result.businesses.length > 0) {
          console.log('First business:', result.businesses[0]);
        }
      } else {
        console.log('Error:', result.error);
      }
    } catch (e) {
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (e) => {
  console.log('Error:', e.message);
});

req.end();