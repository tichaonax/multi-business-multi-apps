import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

import { randomBytes } from 'crypto';
import { getServerUser } from '@/lib/get-server-user'
export async function GET() {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const projects = await prisma.constructionProjects.findMany({
      where: { 
        createdBy: user.id 
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
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, description, budget, startDate, endDate } = await req.json()
    
    if (!name) {
      return NextResponse.json({ error: 'Project name is required' }, { status: 400 })
    }

    console.log('Creating project:', { name, description, userId: user.id })
    
    const newProject = await prisma.constructionProjects.create({
      data: {
        name,
        description: description || null,
        budget: budget ? parseFloat(budget) : null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        createdBy: user.id,
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