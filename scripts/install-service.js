const Service = require('node-windows').Service;
const path = require('path');

const svc = new Service({
  name: 'Multi-Business Management Platform',
  description: 'Unified platform for managing multiple business operations',
  script: path.join(__dirname, '../server.js'),
  nodeOptions: [
    '--harmony',
    '--max_old_space_size=4096'
  ],
  env: {
    name: "NODE_ENV",
    value: "production"
  }
});

svc.on('install', function() {
  console.log('Service installed successfully!');
  svc.start();
});

svc.on('alreadyinstalled', function() {
  console.log('Service is already installed.');
});

svc.on('start', function() {
  console.log('Service started successfully!');
});

svc.on('stop', function() {
  console.log('Service stopped.');
});

svc.on('error', function(err) {
  console.error('Service error:', err);
});

console.log('Installing Multi-Business Management Platform as Windows Service...');
svc.install();