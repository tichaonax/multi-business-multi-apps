const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Helper function to get random integer between min and max (inclusive)
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Helper function to get random item from array
function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// Helper function to get random amount based on subcategory name
function getRealisticAmount(subcategoryName, categoryName) {
  const amountRanges = {
    // Restaurant
    'Broiler': [20, 50],
    'Beef': [30, 80],
    'Fish': [15, 40],
    'Chicken': [25, 60],
    'Pork': [20, 50],
    'Vegetables': [10, 30],
    'Greens': [5, 15],
    'Cabbage': [3, 10],
    'Carrots': [5, 12],
    'Onions': [3, 8],
    'Tomatoes': [5, 15],
    'Potatoes': [8, 20],
    'Cooking Oil': [15, 35],
    'Cooking Gas': [15, 25],
    'Spices': [5, 20],
    'Salt': [2, 5],
    'Sugar': [8, 15],
    'Flour': [10, 25],
    'Rice': [20, 50],
    'Beans': [10, 30],
    'Rent': [350, 350],  // Fixed monthly
    'Internet': [40, 60],
    'Electricity': [80, 150],
    'Water': [30, 60],
    'Repairs': [50, 200],
    'Maintenance': [30, 100],
    'Wages': [100, 500],
    'Salary': [300, 1200],
    'Advertising': [50, 300],
    'Packaging': [10, 50],
    'Cleaning Supplies': [15, 40],
    'Loan Repayment': [200, 500],
    'Transfer Out': [100, 1000],

    // Grocery
    'Fresh Produce': [100, 300],
    'Dairy Products': [50, 150],
    'Meat Products': [80, 250],
    'Frozen Foods': [40, 120],
    'Beverages': [30, 100],
    'Snacks': [20, 80],
    'Canned Goods': [30, 90],
    'Condiments': [10, 40],
    'Refrigeration': [20, 40],
    'Shelving': [50, 200],
    'Shopping Carts': [80, 150],
    'Cash Register': [30, 100],

    // Hardware
    'Tool Inventory': [50, 200],
    'Equipment': [30, 150],
    'Power Tools': [100, 500],
    'Hand Tools': [20, 100],
    'Lumber': [50, 300],
    'Paint': [30, 120],
    'Nails': [10, 40],
    'Screws': [10, 40],
    'Cement': [40, 150],
    'Plumbing Supplies': [30, 120],
    'Electrical Supplies': [25, 100],
    'Safety Equipment': [20, 80],

    // Clothing
    'Garment Inventory': [100, 500],
    'Accessories': [30, 100],
    'Fabric': [50, 200],
    'Buttons': [5, 20],
    'Zippers': [10, 30],
    'Thread': [5, 15],
    'Mannequins': [50, 150],
    'Display Racks': [80, 200],
    'Hangers': [10, 30],
    'Tags': [5, 20],
    'Staff Commission': [50, 200],  // ⭐ Important for commission tracking
    'Store Supplies': [20, 60]
  };

  // Try to find exact match
  if (amountRanges[subcategoryName]) {
    const [min, max] = amountRanges[subcategoryName];
    return (Math.random() * (max - min) + min).toFixed(2);
  }

  // Try to find category match
  if (amountRanges[categoryName]) {
    const [min, max] = amountRanges[categoryName];
    return (Math.random() * (max - min) + min).toFixed(2);
  }

  // Default range based on category type
  if (categoryName.includes('Utilities') || categoryName.includes('Rent')) {
    return (Math.random() * (100 - 50) + 50).toFixed(2);
  }
  if (categoryName.includes('Inventory') || categoryName.includes('Stock')) {
    return (Math.random() * (300 - 50) + 50).toFixed(2);
  }
  if (categoryName.includes('Salary') || categoryName.includes('Wages')) {
    return (Math.random() * (500 - 200) + 200).toFixed(2);
  }

  // Default fallback
  return (Math.random() * (100 - 20) + 20).toFixed(2);
}

// Get date N days ago
function getDaysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

async function seedBusinessExpenses() {
  console.log('🌱 Starting demo business expense seeding...\n');

  try {
    // Get all demo businesses
    const demoBusinesses = await prisma.businesses.findMany({
      where: { isDemo: true },
      select: { id: true, name: true, type: true }
    });

    console.log(`Found ${demoBusinesses.length} demo businesses`);

    // Check for existing demo business expenses
    const existingExpensesCount = await prisma.businessExpenses.count({
      where: {
        businessId: {
          in: demoBusinesses.map(b => b.id)
        }
      }
    });

    if (existingExpensesCount > 0) {
      console.log(`⚠️  Found ${existingExpensesCount} existing demo business expenses`);
      console.log('🗑️  Cleaning up existing demo expense data to ensure fresh seed...\n');

      // Delete existing demo business expenses
      await prisma.businessExpenses.deleteMany({
        where: {
          businessId: {
            in: demoBusinesses.map(b => b.id)
          }
        }
      });

      console.log('✅ Cleanup complete\n');
    } else {
      console.log('✅ No existing demo expenses found\n');
    }

    let totalExpensesCreated = 0;

    // Get system user for createdBy
    const systemUser = await prisma.users.findFirst({
      where: { email: { contains: 'admin' } }
    });

    // Process each business
    for (const business of demoBusinesses) {
      console.log(`📦 Processing: ${business.name} (${business.type})`);

      // Map business types to domain names (handle naming differences)
      const domainNameMap = {
        'restaurant': 'Restaurant',
        'grocery': 'Groceries',
        'hardware': 'Hardware',
        'clothing': 'Clothing',
        'construction': 'Construction',
        'vehicle': 'Vehicle'
      };

      const domainName = domainNameMap[business.type.toLowerCase()] || business.type;

      // Get the domain for this business type
      const domain = await prisma.expenseDomains.findFirst({
        where: { name: { equals: domainName, mode: 'insensitive' } },
        include: {
          expense_categories: {
            include: {
              expense_subcategories: true
            }
          }
        }
      });

      if (!domain || domain.expense_categories.length === 0) {
        console.log(`  ⚠️  No expense domain found for ${business.type}`);
        continue;
      }

      console.log(`  Found domain: ${domain.name} with ${domain.expense_categories.length} categories`);

      // Get employees for this business
      const employees = await prisma.employees.findMany({
        where: { primaryBusinessId: business.id },
        select: { id: true, fullName: true }
      });

      if (employees.length === 0) {
        console.log(`  ⚠️  No employees found for ${business.name}`);
        continue;
      }

      console.log(`  Found ${employees.length} employees`);

      let businessExpenseCount = 0;

      // Generate expenses for last 30 days
      for (let day = 0; day < 30; day++) {
        const dailyExpenseCount = randomInt(5, 15);
        const expenseDate = getDaysAgo(day);

        for (let i = 0; i < dailyExpenseCount; i++) {
          // Pick random category
          const category = randomItem(domain.expense_categories);

          // Pick random subcategory if available
          const subcategory = category.expense_subcategories?.length > 0
            ? randomItem(category.expense_subcategories)
            : null;

          // Generate realistic amount
          const amount = getRealisticAmount(
            subcategory?.name || '',
            category.name
          );

          // Assign to random employee
          const employee = randomItem(employees);

          // Create expense record
          try {
            await prisma.businessExpenses.create({
              data: {
                businessId: business.id,
                categoryId: category.id,
                subcategoryId: subcategory?.id || null,
                employeeId: employee.id,
                amount: parseFloat(amount),
                description: subcategory
                  ? `${subcategory.name} - ${category.name}`
                  : category.name,
                expenseDate: expenseDate,
                createdBy: systemUser?.id || null,
                createdAt: expenseDate
              }
            });

            businessExpenseCount++;
            totalExpensesCreated++;
          } catch (error) {
            console.error(`    ❌ Error creating expense:`, error.message);
          }
        }
      }

      console.log(`  ✅ Created ${businessExpenseCount} expenses\n`);
    }

    console.log('✅ Demo business expense seeding complete!');
    console.log(`\n📊 Summary:`);
    console.log(`   - Total businesses processed: ${demoBusinesses.length}`);
    console.log(`   - Total expenses created: ${totalExpensesCreated}`);
    console.log(`   - Average per business: ${Math.round(totalExpensesCreated / demoBusinesses.length)}`);
    console.log(`   - Date range: Last 30 days`);

  } catch (error) {
    console.error('❌ Error seeding business expenses:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding function
seedBusinessExpenses()
  .then(() => {
    console.log('\n✨ Seeding script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Seeding script failed:', error);
    process.exit(1);
  });
