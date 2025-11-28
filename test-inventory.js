async function testInventoryAPI() {
  const businessId = '3de615c8-7259-4641-a8f2-9fffa570805a';

  try {
    console.log('Testing inventory API...');

    // Try without authentication first
    const response = await fetch(`http://localhost:8080/api/inventory/${businessId}/items`);

    console.log(`Response status: ${response.status}`);

    if (response.ok) {
      const data = await response.json();
      console.log('Success! Response data:');
      console.log(JSON.stringify(data, null, 2));
    } else {
      const errorText = await response.text();
      console.log('Error response:', errorText);
    }

  } catch (error) {
    console.error('Error testing API:', error);
  }
}

testInventoryAPI();