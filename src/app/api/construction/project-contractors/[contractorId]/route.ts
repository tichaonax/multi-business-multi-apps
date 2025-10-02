import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ contractorId: string }> }
)
 {

    const { contractorId } = await params
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { contractorId } = await params

    // Verify the project contractor exists and user has access
    const projectContractor = await prisma.projectContractor.findUnique({
      where: { id: contractorId },
      include: {
        constructionProject: {
          select: {
            id: true,
            name: true,
            createdBy: true
          }
        },
        person: {
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
    if (projectContractor.constructionProject.createdBy !== session.user.id) {
      return NextResponse.json({ error: 'You do not have permission to modify this project' }, { status: 403 })
    }

    // Delete the project contractor assignment
    await prisma.projectContractor.delete({
      where: { id: contractorId }
    })

    return NextResponse.json({ 
      message: 'Contractor successfully removed from project',
      contractor: projectContractor.person.fullName,
      project: projectContractor.constructionProject.name
    })

  } catch (error) {
    console.error('Project contractor removal error:', error)
    return NextResponse.json(
      { error: 'Failed to remove contractor from project' },
      { status: 500 }
    )
  }
}