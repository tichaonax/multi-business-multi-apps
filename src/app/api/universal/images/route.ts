import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export async function POST(request: NextRequest) {
  try {
    const data = await request.formData()
    const files: File[] = data.getAll('files') as File[]

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files uploaded' }, { status: 400 })
    }

    const uploadDir = join(process.cwd(), 'public/uploads/images')

    // Ensure upload directory exists
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    const uploadedFiles = []

    for (const file of files) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        return NextResponse.json({
          error: `File ${file.name} is not an image`
        }, { status: 400 })
      }

      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json({
          error: `File ${file.name} is too large (max 10MB)`
        }, { status: 400 })
      }

      // Generate unique filename
      const timestamp = Date.now()
      const randomString = Math.random().toString(36).substring(2)
      const extension = file.name.split('.').pop()
      const filename = `${timestamp}_${randomString}.${extension}`

      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)

      // Save file
      const filepath = join(uploadDir, filename)
      await writeFile(filepath, buffer)

      uploadedFiles.push({
        filename,
        originalName: file.name,
        size: file.size,
        type: file.type,
        url: `/uploads/images/${filename}`
      })
    }

    return NextResponse.json({
      success: true,
      data: uploadedFiles
    })

  } catch (error) {
    console.error('Image upload error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to upload images'
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const filename = searchParams.get('filename')

    if (!filename) {
      return NextResponse.json({ error: 'Filename required' }, { status: 400 })
    }

    const filepath = join(process.cwd(), 'public/uploads/images', filename)

    if (existsSync(filepath)) {
      const { unlink } = await import('fs/promises')
      await unlink(filepath)
    }

    return NextResponse.json({
      success: true,
      message: 'Image deleted successfully'
    })

  } catch (error) {
    console.error('Image delete error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to delete image'
    }, { status: 500 })
  }
}