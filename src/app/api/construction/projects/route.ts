import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const projects = await prisma.constructionProject.findMany({
      where: { 
        createdBy: session.user.id 
      },
      orderBy: { 
        createdAt: 'desc' 
      }
    })
    return NextResponse.json(projects)
  } catch (error) {
    console.error('Projects fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, description, budget, startDate, endDate } = await req.json()
    
    if (!name) {
      return NextResponse.json({ error: 'Project name is required' }, { status: 400 })
    }

    console.log('Creating project:', { name, description, userId: session.user.id })
    
    const newProject = await prisma.constructionProject.create({
      data: {
        name,
        description: description || null,
        budget: budget ? parseFloat(budget) : null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        createdBy: session.user.id,
      }
    })

    console.log('Project created successfully:', newProject)
    return NextResponse.json(newProject)
  } catch (error) {
    console.error('Project creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    )
  }
}