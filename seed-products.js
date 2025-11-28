async function seedProducts() {
  try {
    const response = await fetch('http://localhost:8080/api/admin/clothing/seed-products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        businessId: 'f5de1321-5251-45cf-96e4-69cdd40836d2'
      })
    });

    const result = await response.json();
    console.log('Response status:', response.status);
    console.log('Response:', result);
  } catch (error) {
    console.error('Error:', error);
  }
}

seedProducts();