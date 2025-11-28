const { seedClothingProducts } = require('./src/lib/seed-clothing-products.ts');

async function seedProducts() {
  try {
    console.log('Starting clothing product seeding...');
    const result = await seedClothingProducts('f5de1321-5251-45cf-96e4-69cdd40836d2');
    console.log('Seeding result:', result);
  } catch (error) {
    console.error('Error:', error);
  }
}

seedProducts();