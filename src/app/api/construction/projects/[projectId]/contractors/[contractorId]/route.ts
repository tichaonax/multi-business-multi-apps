import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/permission-utils'
import { getServerUser } from '@/lib/get-server-user'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; contractorId: string }> }
)
 {

    const { projectId, contractorId } = await params
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Allow access if user has either construction or personal finance permissions
    if (!hasPermission(user, 'canViewConstructionProjects') && !hasPermission(user, 'canAccessPersonalFinance')) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    // First verify the project exists and user has access
    const project = await prisma.constructionProjects.findUnique({
      where: { id: projectId }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Get contractor details with all related information
    const contractor = await prisma.projectContractors.findFirst({
      where: {
        id: contractorId,
        projectId: projectId
      },
      include: {
        person: {
          include: {
            idFormatTemplate: true
          }
        },
        constructionProject: {
          select: {
            id: true,
            name: true,
            status: true
          }
        },
        stageContractorAssignments: {
          include: {
            projectStage: {
              select: {
                id: true,
                name: true,
                description: true,
                status: true
              }
            }
          }
        },
        projectTransactions: {
          include: {
            personalExpense: true,
            approvedBy: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    })

    if (!contractor) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 })
    }

    // Convert Decimal amounts to numbers for JSON serialization and map field names
    const contractorWithConvertedAmounts = {
      ...contractor,
      // Map constructionProject to project for UI compatibility
      project: contractor.constructionProject,
      // Map stageContractorAssignments to stageAssignments and fix nested stage field
      stageAssignments: contractor.stageContractorAssignments?.map(assignment => ({
        ...assignment,
        stage: assignment.projectStage, // Map projectStage to stage for UI
        predeterminedAmount: assignment.predeterminedAmount ? Number(assignment.predeterminedAmount) : 0,
        depositPercentage: assignment.depositPercentage ? Number(assignment.depositPercentage) : 0,
        depositAmount: assignment.depositAmount ? Number(assignment.depositAmount) : null
      })),
      hourlyRate: contractor.hourlyRate ? Number(contractor.hourlyRate) : null,
      totalContractAmount: contractor.totalContractAmount ? Number(contractor.totalContractAmount) : null,
      projectTransactions: contractor.project_transactions?.map(transaction => ({
        ...transaction,
        amount: transaction.amount ? Number(transaction.amount) : 0
      }))
    }
    
    // Clean up the original field names to avoid confusion
    delete contractorWithConvertedAmounts.constructionProject
    delete contractorWithConvertedAmounts.stageContractorAssignments

    return NextResponse.json(contractorWithConvertedAmounts)
  } catch (error) {
    console.error('Contractor details fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch contractor details' }, { status: 500 })
  }
}