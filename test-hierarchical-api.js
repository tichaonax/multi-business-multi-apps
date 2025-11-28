const fetch = require('node-fetch');

async function testAPI() {
  try {
    console.log('Testing hierarchical API...');
    const response = await fetch('http://localhost:8080/api/expense-categories/hierarchical');
    const data = await response.json();

    console.log('Status:', response.status);
    console.log('Response keys:', Object.keys(data));

    if (data.domains) {
      console.log('Domains count:', data.domains.length);
      if (data.domains.length > 0) {
        console.log('First domain categories count:', data.domains[0].expense_categories ? data.domains[0].expense_categories.length : 0);
        if (data.domains[0].expense_categories && data.domains[0].expense_categories.length > 0) {
          console.log('First category:', data.domains[0].expense_categories[0]);
        }
      }
    } else {
      console.log('No domains in response');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testAPI();