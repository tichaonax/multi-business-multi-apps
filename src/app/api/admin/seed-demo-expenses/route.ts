import { NextRequest, NextResponse } from 'next/server';


import { prisma } from '@/lib/prisma';
import { getServerUser } from '@/lib/get-server-user'

// Helper function to check admin access


// Helper function to get random integer
function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Helper function to get random item from array
function randomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

// Helper function to get realistic amount based on subcategory
function getRealisticAmount(subcategoryName: string, categoryName: string): string {
  const amountRanges: Record<string, [number, number]> = {
    'Broiler': [20, 50],
    'Beef': [30, 80],
    'Fish': [15, 40],
    'Chicken': [25, 60],
    'Vegetables': [10, 30],
    'Cooking Oil': [15, 35],
    'Cooking Gas': [15, 25],
    'Rent': [350, 350],
    'Internet': [40, 60],
    'Electricity': [80, 150],
    'Water': [30, 60],
    'Wages': [100, 500],
    'Salary': [300, 1200],
    'Fresh Produce': [100, 300],
    'Dairy Products': [50, 150],
    'Tool Inventory': [50, 200],
    'Equipment': [30, 150],
    'Lumber': [50, 300],
    'Paint': [30, 120],
    'Garment Inventory': [100, 500],
    'Fabric': [50, 200],
    'Staff Commission': [50, 200]
  };

  if (amountRanges[subcategoryName]) {
    const [min, max] = amountRanges[subcategoryName];
    return (Math.random() * (max - min) + min).toFixed(2);
  }

  if (amountRanges[categoryName]) {
    const [min, max] = amountRanges[categoryName];
    return (Math.random() * (max - min) + min).toFixed(2);
  }

  // Default fallback
  return (Math.random() * (100 - 20) + 20).toFixed(2);
}

// Get date N days ago
function getDaysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser();

    if ((!user || user.role !== 'admin')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 401 });
    }

    // Get all demo businesses
    const demoBusinesses = await prisma.businesses.findMany({
      where: { isDemo: true },
      select: { id: true, name: true, type: true }
    });

    // Check for existing demo business expenses
    const existingExpensesCount = await prisma.businessExpenses.count({
      where: {
        businessId: {
          in: demoBusinesses.map(b => b.id)
        }
      }
    });

    let cleanupCount = 0;
    if (existingExpensesCount > 0) {
      await prisma.businessExpenses.deleteMany({
        where: {
          businessId: {
            in: demoBusinesses.map(b => b.id)
          }
        }
      });
      cleanupCount = existingExpensesCount;
    }

    let totalExpensesCreated = 0;
    const businessSummary: any[] = [];

    // Domain name mapping
    const domainNameMap: Record<string, string> = {
      'restaurant': 'Restaurant',
      'grocery': 'Groceries',
      'hardware': 'Hardware',
      'clothing': 'Clothing',
      'construction': 'Construction',
      'vehicle': 'Vehicle'
    };

    // Get system user for createdBy
    const systemUser = await prisma.users.findFirst({
      where: { email: { contains: 'admin' } }
    });

    // Process each business
    for (const business of demoBusinesses) {
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
        businessSummary.push({
          businessId: business.id,
          businessName: business.name,
          businessType: business.type,
          expensesCreated: 0,
          error: 'No expense domain found'
        });
        continue;
      }

      // Get employees for this business
      const employees = await prisma.employees.findMany({
        where: { primaryBusinessId: business.id },
        select: { id: true, fullName: true }
      });

      if (employees.length === 0) {
        businessSummary.push({
          businessId: business.id,
          businessName: business.name,
          businessType: business.type,
          expensesCreated: 0,
          error: 'No employees found'
        });
        continue;
      }

      let businessExpenseCount = 0;

      // Generate expenses for last 30 days
      for (let day = 0; day < 30; day++) {
        const dailyExpenseCount = randomInt(5, 15);
        const expenseDate = getDaysAgo(day);

        for (let i = 0; i < dailyExpenseCount; i++) {
          const category = randomItem(domain.expense_categories);
          const subcategory = category.expense_subcategories?.length > 0
            ? randomItem(category.expense_subcategories)
            : null;

          const amount = getRealisticAmount(
            subcategory?.name || '',
            category.name
          );

          const employee = randomItem(employees);

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
            // Skip failed inserts
          }
        }
      }

      businessSummary.push({
        businessId: business.id,
        businessName: business.name,
        businessType: business.type,
        expensesCreated: businessExpenseCount,
        employees: employees.length,
        categories: domain.expense_categories.length
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Demo business expenses seeded successfully',
      data: {
        cleanedUp: cleanupCount,
        totalExpenses: totalExpensesCreated,
        businesses: businessSummary,
        dateRange: '30 days',
        averagePerBusiness: Math.round(totalExpensesCreated / demoBusinesses.length)
      }
    });

  } catch (error: any) {
    console.error('Error seeding demo expenses:', error);
    return NextResponse.json(
      { error: 'Failed to seed demo expenses', details: error.message },
      { status: 500 }
    );
  }
}
