const Service = require('node-windows').Service;
const path = require('path');

const svc = new Service({
  name: 'Multi-Business Management Platform',
  script: path.join(__dirname, '../server.js')
});

svc.on('uninstall', function() {
  console.log('Service uninstalled successfully!');
});

svc.on('doesnotexist', function() {
  console.log('Service does not exist.');
});

console.log('Uninstalling Multi-Business Management Platform Windows Service...');
svc.uninstall();