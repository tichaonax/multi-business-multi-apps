import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{ projectId: string }>
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { projectId } = await params

    // Verify project exists and user has access
    const project = await prisma.constructionProjects.findFirst({
      where: {
        id: projectId,
        createdBy: session.user.id
      }
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      )
    }

    // Get all transactions for this project
    const transactions = await prisma.projectTransactions.findMany({
      where: { projectId },
      include: {
        personal_expenses: {
          select: {
            amount: true,
            date: true
          }
        },
        project_stages: {
          select: {
            id: true,
            name: true
          }
        },
        persons: {
          select: {
            id: true,
            fullName: true
          }
        }
      }
    })

    // Get all stages with their assignments
    const stages = await prisma.projectStages.findMany({
      where: { projectId },
      include: {
        stage_contractor_assignments: {
          include: {
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
      },
      orderBy: { orderIndex: 'asc' }
    })

    // Calculate totals by transaction type
    const contractorPayments = transactions.filter(t => 
      t.transactionType === 'contractor_payment' || t.transactionType === 'deposit'
    )
    const projectExpenses = transactions.filter(t => t.transactionType === 'project_expense')

    const totalContractorPayments = contractorPayments.reduce((sum, t) => 
      sum + parseFloat(t.amount.toString()), 0
    )
    const totalProjectExpenses = projectExpenses.reduce((sum, t) => 
      sum + parseFloat(t.amount.toString()), 0
    )
    const totalProjectCost = totalContractorPayments + totalProjectExpenses

    // Calculate totals by stage
    const stageBreakdown = stages.map(stage => {
      const stageTransactions = transactions.filter(t => t.stageId === stage.id)
      const stageContractorPayments = stageTransactions.filter(t => 
        t.transactionType === 'contractor_payment' || t.transactionType === 'deposit'
      )
      const stageProjectExpenses = stageTransactions.filter(t => 
        t.transactionType === 'project_expense'
      )
      
      const stageContractorTotal = stageContractorPayments.reduce((sum, t) => 
        sum + parseFloat(t.amount.toString()), 0
      )
      const stageExpenseTotal = stageProjectExpenses.reduce((sum, t) => 
        sum + parseFloat(t.amount.toString()), 0
      )
      
      // Calculate assigned amounts vs actual payments for contractors
      const totalAssignedAmount = stage.stageContractorAssignments.reduce((sum, assignment) => 
        sum + parseFloat(assignment.predeterminedAmount.toString()), 0
      )
      
      const depositsPaid = stage.stageContractorAssignments.reduce((sum, assignment) => 
        sum + (assignment.isDepositPaid ? parseFloat((assignment.depositAmount || 0).toString()) : 0), 0
      )
      
      return {
        stage: {
          id: stage.id,
          name: stage.name,
          status: stage.status,
          estimatedAmount: stage.estimatedAmount ? parseFloat(stage.estimatedAmount.toString()) : null
        },
        contractorPayments: {
          totalAssigned: totalAssignedAmount,
          totalPaid: stageContractorTotal,
          depositsPaid: depositsPaid,
          remainingBalance: totalAssignedAmount - stageContractorTotal
        },
        projectExpenses: {
          total: stageExpenseTotal
        },
        stageTotal: stageContractorTotal + stageExpenseTotal,
        contractors: stage.stageContractorAssignments.map(assignment => ({
          contractorId: assignment.projectContractor.persons.id,
          contractorName: assignment.projectContractor.persons.fullName,
          assignedAmount: parseFloat(assignment.predeterminedAmount.toString()),
          depositAmount: assignment.depositAmount ? parseFloat(assignment.depositAmount.toString()) : 0,
          isDepositPaid: assignment.isDepositPaid,
          isFinalPaymentMade: assignment.isFinalPaymentMade,
          payments: stageContractorPayments.filter(t => 
            t.recipientPersonId === assignment.projectContractor.persons.id
          ).map(t => ({
            amount: parseFloat(t.amount.toString()),
            date: t.personalExpense?.date,
            type: t.transactionType,
            description: t.description
          }))
        }))
      }
    })

    // Calculate contractor breakdown (across all stages)
    const contractorBreakdown = await prisma.projectContractors.findMany({
      where: { projectId },
      include: {
        person: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            email: true
          }
        },
        stageAssignments: {
          include: {
            stage: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    })

    const contractorSummary = contractorBreakdown.map(contractor => {
      const contractorTransactions = transactions.filter(t => 
        t.recipientPersonId === contractor.persons.id &&
        (t.transactionType === 'contractor_payment' || t.transactionType === 'deposit')
      )
      
      const totalAssigned = contractor.stageAssignments.reduce((sum, assignment) => 
        sum + parseFloat(assignment.predeterminedAmount.toString()), 0
      )
      
      const totalPaid = contractorTransactions.reduce((sum, t) => 
        sum + parseFloat(t.amount.toString()), 0
      )
      
      return {
        contractor: contractor.person,
        role: contractor.role,
        isPrimary: contractor.isPrimary,
        totalAssigned,
        totalPaid,
        remainingBalance: totalAssigned - totalPaid,
        stageCount: contractor.stageAssignments.length,
        stages: contractor.stageAssignments.map(assignment => ({
          stageId: assignment.stage.id,
          stageName: assignment.stage.name,
          assignedAmount: parseFloat(assignment.predeterminedAmount.toString()),
          depositAmount: assignment.depositAmount ? parseFloat(assignment.depositAmount.toString()) : 0,
          isDepositPaid: assignment.isDepositPaid,
          isFinalPaymentMade: assignment.isFinalPaymentMade
        }))
      }
    })

    const summary = {
      project: {
        id: project.id,
        name: project.name,
        status: project.status,
        budget: project.budget ? parseFloat(project.budget.toString()) : null
      },
      totalCosts: {
        contractorPayments: totalContractorPayments,
        projectExpenses: totalProjectExpenses,
        totalProjectCost,
        budgetVariance: project.budget ? 
          totalProjectCost - parseFloat(project.budget.toString()) : null,
        budgetUtilization: project.budget ? 
          (totalProjectCost / parseFloat(project.budget.toString())) * 100 : null
      },
      transactionCounts: {
        totalTransactions: transactions.length,
        contractorPayments: contractorPayments.length,
        projectExpenses: projectExpenses.length,
        pendingTransactions: transactions.filter(t => t.status === 'pending').length
      },
      stageBreakdown,
      contractorSummary,
      lastUpdated: new Date().toISOString()
    }

    return NextResponse.json(summary)
  } catch (error) {
    console.error('Project cost summary error:', error)
    return NextResponse.json(
      { error: 'Failed to generate project cost summary' },
      { status: 500 }
    )
  }
}