import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  getGlobalPayrollAccount,
  generateDepositNote,
  updatePayrollAccountBalance,
} from '@/lib/payroll-account-utils';

/**
 * GET /api/business/[businessId]/expenses
 * Fetch business expenses (via ExpenseAccountPayments through ExpenseAccounts)
 *
 * Query params:
 * - startDate: Filter expenses from this date
 * - endDate: Filter expenses up to this date
 * - categoryId: Filter by expense category
 * - employeeId: Filter by employee payee
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

    // Find the business's expense accounts
    const businessAccounts = await prisma.expenseAccounts.findMany({
      where: { businessId, isActive: true },
      select: { id: true },
    });

    const accountIds = businessAccounts.map(a => a.id);

    // If business has no expense accounts, return empty
    if (accountIds.length === 0) {
      return NextResponse.json({
        success: true,
        expenses: [],
        summary: {
          total: 0,
          byCategory: [],
          count: 0,
          dateRange: { start: startDate, end: endDate }
        }
      });
    }

    // Build where clause for payments
    const where: any = {
      expenseAccountId: { in: accountIds },
    };

    // Date filtering
    if (startDate || endDate) {
      where.paymentDate = {};
      if (startDate) {
        where.paymentDate.gte = new Date(startDate);
      }
      if (endDate) {
        where.paymentDate.lte = new Date(endDate);
      }
    }

    // Category filtering
    if (categoryId) {
      where.categoryId = categoryId;
    }

    // Employee filtering
    if (employeeId) {
      where.payeeEmployeeId = employeeId;
    }

    // Fetch expense payments with related data
    const expenses = await prisma.expenseAccountPayments.findMany({
      where,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            emoji: true,
            color: true
          }
        },
        subcategory: {
          select: {
            id: true,
            name: true,
            emoji: true
          }
        },
        payeeEmployee: {
          select: {
            id: true,
            fullName: true
          }
        }
      },
      orderBy: {
        paymentDate: 'desc'
      }
    });

    // Calculate total amount
    const total = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);

    // Aggregate by category
    const byCategory: Record<string, { name: string; emoji: string; value: number; percentage: number }> = {};

    expenses.forEach(exp => {
      const catName = exp.category.name;
      const catEmoji = exp.category.emoji;

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
        description: exp.notes || exp.receiptReason || '',
        expenseDate: exp.paymentDate,
        category: {
          id: exp.category.id,
          name: exp.category.name,
          emoji: exp.category.emoji,
          color: exp.category.color
        },
        subcategory: exp.subcategory ? {
          id: exp.subcategory.id,
          name: exp.subcategory.name,
          emoji: exp.subcategory.emoji
        } : null,
        employee: exp.payeeEmployee ? {
          id: exp.payeeEmployee.id,
          name: exp.payeeEmployee.fullName
        } : null,
        receiptUrl: null,
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
 * Create a new expense payment record
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
    if (!body.categoryId || !body.amount || !body.expenseDate) {
      return NextResponse.json(
        { error: 'Missing required fields: categoryId, amount, expenseDate' },
        { status: 400 }
      );
    }

    // Find the business's expense account
    const expenseAccount = await prisma.expenseAccounts.findFirst({
      where: { businessId, isActive: true },
    });

    if (!expenseAccount) {
      return NextResponse.json(
        { error: 'No active expense account found for this business' },
        { status: 404 }
      );
    }

    // Create expense payment
    const expense = await prisma.expenseAccountPayments.create({
      data: {
        expenseAccountId: expenseAccount.id,
        payeeType: body.employeeId ? 'EMPLOYEE' : 'OTHER',
        payeeEmployeeId: body.employeeId || null,
        categoryId: body.categoryId,
        subcategoryId: body.subcategoryId || null,
        amount: parseFloat(body.amount),
        paymentDate: new Date(body.expenseDate),
        notes: body.description || body.notes || null,
        receiptReason: body.description || null,
        createdBy: session.user.id,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            emoji: true
          }
        },
        subcategory: {
          select: {
            id: true,
            name: true,
            emoji: true
          }
        },
        payeeEmployee: {
          select: {
            id: true,
            fullName: true
          }
        }
      }
    });

    // Auto-create payroll deposit if expense category is "Payroll"
    if (expense.category.name.toLowerCase().includes('payroll')) {
      try {
        const payrollAccount = await getGlobalPayrollAccount();
        if (payrollAccount) {
          const business = await prisma.businesses.findUnique({
            where: { id: businessId },
            select: { name: true },
          });

          if (business) {
            const depositNote = generateDepositNote(business.name, 'PAYROLL_EXPENSE');

            await prisma.payrollAccountDeposits.create({
              data: {
                payrollAccountId: payrollAccount.id,
                businessId: businessId,
                amount: parseFloat(body.amount),
                autoGeneratedNote: depositNote,
                transactionType: 'PAYROLL_EXPENSE',
                createdBy: session.user.id,
                expenseId: expense.id,
              },
            });

            await updatePayrollAccountBalance(payrollAccount.id);
          }
        }
      } catch (payrollError) {
        console.error('Error auto-creating payroll deposit:', payrollError);
      }
    }

    return NextResponse.json({
      success: true,
      expense: {
        id: expense.id,
        amount: Number(expense.amount),
        description: expense.notes || '',
        expenseDate: expense.paymentDate,
        category: {
          id: expense.category.id,
          name: expense.category.name,
          emoji: expense.category.emoji
        },
        subcategory: expense.subcategory ? {
          id: expense.subcategory.id,
          name: expense.subcategory.name,
          emoji: expense.subcategory.emoji
        } : null,
        employee: expense.payeeEmployee ? {
          id: expense.payeeEmployee.id,
          name: expense.payeeEmployee.fullName
        } : null,
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
