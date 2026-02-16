import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

import { randomBytes } from 'crypto';
import { getServerUser } from '@/lib/get-server-user'
interface RouteParams {
  params: Promise<{ projectId: string }>
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { projectId } = await params
    const { searchParams } = new URL(req.url)
    const transactionType = searchParams.get('transactionType')
    const status = searchParams.get('status')
    const stageId = searchParams.get('stageId')

    // Verify project exists and user has access
    const project = await prisma.constructionProjects.findFirst({
      where: {
        id: projectId,
        createdBy: user.id
      }
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      )
    }

    const where: any = { projectId }
    
    if (transactionType) {
      where.transactionType = transactionType
    }
    
    if (status) {
      where.status = status
    }
    
    if (stageId) {
      where.stageId = stageId
    }

    const transactions = await prisma.projectTransactions.findMany({
      where,
      include: {
        personal_expenses: {
          select: {
            id: true,
            amount: true,
            description: true,
            date: true,
            category: true
          }
        },
        project_stages: {
          select: {
            id: true,
            name: true,
            status: true
          }
        },
        persons: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            email: true
          }
        },
        project_contractors: {
          include: {
            persons: {
              select: {
                id: true,
                fullName: true,
                phone: true,
                email: true
              }
            }
          }
        },
        stage_contractor_assignments: {
          include: {
            project_stages: {
              select: {
                id: true,
                name: true
              }
            },
            project_contractors: {
              include: {
                persons: {
                  select: {
                    id: true,
                    fullName: true
                  }
                }
              }
            }
          }
        },
        users_project_transactions_approvedByTousers: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        users_project_transactions_createdByTousers: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Convert Decimal amounts to numbers for proper JSON serialization
    const transactionsWithConvertedAmounts = transactions.map(transaction => ({
      ...transaction,
      amount: transaction.amount ? Number(transaction.amount) : 0
    }))

    return NextResponse.json(transactionsWithConvertedAmounts)
  } catch (error) {
    console.error('Project transactions fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch project transactions' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { projectId } = await params
    const data = await req.json()
    const {
      personalExpenseId, // Required: links to the actual expense record
      stageId,
      recipientPersonId,
      projectContractorId,
      stageAssignmentId,
      transactionType, // 'contractor_payment', 'project_expense', 'deposit'
      paymentCategory, // For project expenses: materials, fuel, equipment, etc.
      amount,
      description,
      paymentMethod,
      referenceNumber,
      notes
    } = data

    // Validation
    if (!personalExpenseId || !transactionType || !amount || !description) {
      return NextResponse.json(
        { error: 'Personal expense ID, transaction type, amount, and description are required' },
        { status: 400 }
      )
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      )
    }

    const validTransactionTypes = ['contractor_payment', 'project_expense', 'deposit']
    if (!validTransactionTypes.includes(transactionType)) {
      return NextResponse.json(
        { error: 'Invalid transaction type' },
        { status: 400 }
      )
    }

    // Verify project exists and user has access
    const project = await prisma.constructionProjects.findFirst({
      where: {
        id: projectId,
        createdBy: user.id
      }
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      )
    }

    // Verify personal expense exists and belongs to user
    const personalExpense = await prisma.personalExpenses.findFirst({
      where: {
        id: personalExpenseId,
        userId: user.id
      }
    })

    if (!personalExpense) {
      return NextResponse.json(
        { error: 'Personal expense not found or access denied' },
        { status: 404 }
      )
    }

    // Verify amounts match (the transaction amount should match the personal expense)
    if (Math.abs(parseFloat(amount) - parseFloat(personalExpense.amount.toString())) > 0.01) {
      return NextResponse.json(
        { error: 'Transaction amount must match the personal expense amount' },
        { status: 400 }
      )
    }

    // Additional validations based on transaction type
    if (transactionType === 'contractor_payment' || transactionType === 'deposit') {
      if (!recipientPersonId && !projectContractorId) {
        return NextResponse.json(
          { error: 'Contractor payments require recipient person or project contractor' },
          { status: 400 }
        )
      }
    }

    // Verify optional foreign keys exist
    if (stageId) {
      const stage = await prisma.projectStages.findFirst({
        where: { id: stageId, projectId }
      })
      if (!stage) {
        return NextResponse.json(
          { error: 'Stage not found in this project' },
          { status: 404 }
        )
      }
    }

    if (recipientPersonId) {
      const person = await prisma.persons.findUnique({
        where: { id: recipientPersonId }
      })
      if (!person) {
        return NextResponse.json(
          { error: 'Recipient person not found' },
          { status: 404 }
        )
      }
    }

    if (projectContractorId) {
      const contractor = await prisma.projectContractors.findFirst({
        where: { id: projectContractorId, projectId }
      })
      if (!contractor) {
        return NextResponse.json(
          { error: 'Project contractor not found' },
          { status: 404 }
        )
      }
    }

    if (stageAssignmentId) {
      const assignment = await prisma.stageContractorAssignments.findUnique({
        where: { id: stageAssignmentId },
        include: { project_stages: true }
      })
      if (!assignment || assignment.project_stages?.projectId !== projectId) {
        return NextResponse.json(
          { error: 'Stage assignment not found in this project' },
          { status: 404 }
        )
      }
    }

    const newTransaction = await prisma.projectTransactions.create({
      data: {
        projectId,
        stageId: stageId || null,
        personalExpenseId,
        recipientPersonId: recipientPersonId || null,
        projectContractorId: projectContractorId || null,
        stageAssignmentId: stageAssignmentId || null,
        transactionType,
        paymentCategory: paymentCategory || null,
        amount: parseFloat(amount),
        description,
        paymentMethod: paymentMethod || null,
        referenceNumber: referenceNumber || null,
        notes: notes || null,
        createdBy: user.id
      },
      include: {
        personal_expenses: {
          select: {
            id: true,
            amount: true,
            description: true,
            date: true,
            category: true
          }
        },
        project_stages: {
          select: {
            id: true,
            name: true,
            status: true
          }
        },
        persons: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            email: true
          }
        },
        project_contractors: {
          include: {
            persons: {
              select: {
                id: true,
                fullName: true,
                phone: true,
                email: true
              }
            }
          }
        },
        stage_contractor_assignments: {
          include: {
            project_stages: {
              select: {
                id: true,
                name: true
              }
            },
            project_contractors: {
              include: {
                persons: {
                  select: {
                    id: true,
                    fullName: true
                  }
                }
              }
            }
          }
        }
      }
    })

    // If this is a deposit, update the stage assignment
    if (transactionType === 'deposit' && stageAssignmentId) {
      await prisma.stageContractorAssignments.update({
        where: { id: stageAssignmentId },
        data: {
          isDepositPaid: true,
          depositPaidDate: new Date()
        }
      })
    }

    return NextResponse.json(newTransaction)
  } catch (error) {
    console.error('Project transaction creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create project transaction' },
      { status: 500 }
    )
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { projectId } = await params
    const data = await req.json()
    const { transactionId, status } = data

    // Validation
    if (!transactionId || !status) {
      return NextResponse.json(
        { error: 'Transaction ID and status are required' },
        { status: 400 }
      )
    }

    const validStatuses = ['pending', 'approved', 'paid', 'cancelled']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be one of: pending, approved, paid, cancelled' },
        { status: 400 }
      )
    }

    // Verify project exists and user has access
    const project = await prisma.constructionProjects.findFirst({
      where: {
        id: projectId,
        createdBy: user.id
      }
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      )
    }

    // Verify transaction exists and belongs to this project
    const transaction = await prisma.projectTransactions.findFirst({
      where: {
        id: transactionId,
        projectId: projectId,
        createdBy: user.id // Only creator can update status
      }
    })

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found or access denied' },
        { status: 404 }
      )
    }

    // Update transaction status
    const updatedData: any = {
      status: status,
      updatedAt: new Date()
    }

    // Set timestamp fields based on status
    if (status === 'approved') {
      updatedData.approvedBy = user.id
      updatedData.approvedAt = new Date()
    } else if (status === 'paid') {
      updatedData.paidAt = new Date()
      // If not already approved, also set approval
      if (transaction.status === 'pending') {
        updatedData.approvedBy = user.id
        updatedData.approvedAt = new Date()
      }
    }

    const updatedTransaction = await prisma.projectTransactions.update({
      where: { id: transactionId },
      data: updatedData,
      include: {
        personal_expenses: {
          select: {
            id: true,
            amount: true,
            description: true,
            date: true,
            category: true
          }
        },
        project_stages: {
          select: {
            id: true,
            name: true,
            status: true
          }
        },
        persons: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            email: true
          }
        },
        project_contractors: {
          include: {
            persons: {
              select: {
                id: true,
                fullName: true,
                phone: true,
                email: true
              }
            }
          }
        },
        users_project_transactions_approvedByTousers: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        users_project_transactions_createdByTousers: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json(updatedTransaction)
  } catch (error) {
    console.error('Transaction status update error:', error)
    return NextResponse.json(
      { error: 'Failed to update transaction status' },
      { status: 500 }
    )
  }
}