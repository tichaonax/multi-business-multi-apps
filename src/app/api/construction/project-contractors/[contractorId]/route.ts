import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ contractorId: string }> }
)
 {

    const { contractorId } = await params
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { contractorId } = await params

    // Verify the project contractor exists and user has access
    const projectContractor = await prisma.projectContractors.findUnique({
      where: { id: contractorId },
      include: {
        construction_projects: {
          select: {
            id: true,
            name: true,
            createdBy: true
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

    if (!projectContractor) {
      return NextResponse.json({ error: 'Project contractor assignment not found' }, { status: 404 })
    }

    // Check if user owns the project (basic access control)
    if (projectContractor.construction_projects?.createdBy !== user.id) {
      return NextResponse.json({ error: 'You do not have permission to modify this project' }, { status: 403 })
    }

    // Delete the project contractor assignment
    await prisma.projectContractors.delete({
      where: { id: contractorId }
    })

    return NextResponse.json({ 
      message: 'Contractor successfully removed from project',
      contractor: projectContractor.persons.fullName,
      project: projectContractor.construction_projects?.name
    })

  } catch (error) {
    console.error('Project contractor removal error:', error)
    return NextResponse.json(
      { error: 'Failed to remove contractor from project' },
      { status: 500 }
    )
  }
}