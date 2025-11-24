import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/business/[businessId]/expenses
 * Fetch business expenses with filtering options
 *
 * Query params:
 * - startDate: Filter expenses from this date
 * - endDate: Filter expenses up to this date
 * - categoryId: Filter by expense category
 * - employeeId: Filter by employee who recorded expense
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { businessId } = await params;
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const categoryId = searchParams.get('categoryId');
    const employeeId = searchParams.get('employeeId');

    // Build where clause
    const where: any = {
      businessId: businessId
    };

    // Date filtering
    if (startDate || endDate) {
      where.expenseDate = {};
      if (startDate) {
        where.expenseDate.gte = new Date(startDate);
      }
      if (endDate) {
        where.expenseDate.lte = new Date(endDate);
      }
    }

    // Category filtering
    if (categoryId) {
      where.categoryId = categoryId;
    }

    // Employee filtering
    if (employeeId) {
      where.employeeId = employeeId;
    }

    // Fetch expenses with related data
    const expenses = await prisma.businessExpenses.findMany({
      where,
      include: {
        expense_categories: {
          select: {
            id: true,
            name: true,
            emoji: true,
            color: true
          }
        },
        expense_subcategories: {
          select: {
            id: true,
            name: true,
            emoji: true
          }
        },
        employees: {
          select: {
            id: true,
            fullName: true
          }
        }
      },
      orderBy: {
        expenseDate: 'desc'
      }
    });

    // Calculate total amount
    const total = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);

    // Aggregate by category
    const byCategory: Record<string, { name: string; emoji: string; value: number; percentage: number }> = {};

    expenses.forEach(exp => {
      const catName = exp.expense_categories.name;
      const catEmoji = exp.expense_categories.emoji;

      if (!byCategory[catName]) {
        byCategory[catName] = {
          name: catName,
          emoji: catEmoji,
          value: 0,
          percentage: 0
        };
      }
      byCategory[catName].value += Number(exp.amount);
    });

    // Calculate percentages
    Object.values(byCategory).forEach(cat => {
      cat.percentage = total > 0 ? (cat.value / total) * 100 : 0;
    });

    // Format for response
    const byCategoryArray = Object.values(byCategory).sort((a, b) => b.value - a.value);

    return NextResponse.json({
      success: true,
      expenses: expenses.map(exp => ({
        id: exp.id,
        amount: Number(exp.amount),
        description: exp.description,
        expenseDate: exp.expenseDate,
        category: {
          id: exp.expense_categories.id,
          name: exp.expense_categories.name,
          emoji: exp.expense_categories.emoji,
          color: exp.expense_categories.color
        },
        subcategory: exp.expense_subcategories ? {
          id: exp.expense_subcategories.id,
          name: exp.expense_subcategories.name,
          emoji: exp.expense_subcategories.emoji
        } : null,
        employee: exp.employees ? {
          id: exp.employees.id,
          name: exp.employees.fullName
        } : null,
        receiptUrl: exp.receiptUrl,
        notes: exp.notes
      })),
      summary: {
        total: Number(total.toFixed(2)),
        byCategory: byCategoryArray,
        count: expenses.length,
        dateRange: {
          start: startDate,
          end: endDate
        }
      }
    });

  } catch (error) {
    console.error('Error fetching business expenses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch expenses' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/business/[businessId]/expenses
 * Create a new business expense record
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { businessId } = await params;
    const body = await request.json();

    // Validate required fields
    if (!body.categoryId || !body.amount || !body.description || !body.expenseDate) {
      return NextResponse.json(
        { error: 'Missing required fields: categoryId, amount, description, expenseDate' },
        { status: 400 }
      );
    }

    // Create expense
    const expense = await prisma.businessExpenses.create({
      data: {
        businessId: businessId,
        categoryId: body.categoryId,
        subcategoryId: body.subcategoryId || null,
        employeeId: body.employeeId || null,
        amount: parseFloat(body.amount),
        description: body.description,
        expenseDate: new Date(body.expenseDate),
        receiptUrl: body.receiptUrl || null,
        notes: body.notes || null,
        createdBy: session.user.id
      },
      include: {
        expense_categories: {
          select: {
            id: true,
            name: true,
            emoji: true
          }
        },
        expense_subcategories: {
          select: {
            id: true,
            name: true,
            emoji: true
          }
        },
        employees: {
          select: {
            id: true,
            fullName: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      expense: {
        id: expense.id,
        amount: Number(expense.amount),
        description: expense.description,
        expenseDate: expense.expenseDate,
        category: {
          id: expense.expense_categories.id,
          name: expense.expense_categories.name,
          emoji: expense.expense_categories.emoji
        },
        subcategory: expense.expense_subcategories ? {
          id: expense.expense_subcategories.id,
          name: expense.expense_subcategories.name,
          emoji: expense.expense_subcategories.emoji
        } : null,
        employee: expense.employees ? {
          id: expense.employees.id,
          name: expense.employees.fullName
        } : null,
        receiptUrl: expense.receiptUrl,
        notes: expense.notes
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating business expense:', error);
    return NextResponse.json(
      { error: 'Failed to create expense' },
      { status: 500 }
    );
  }
}
