import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir, unlink } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> })
 {

    const { id } = await params
  try {
    const { id: productId } = await params
    // verify product exists
    const product = await prisma.businessProduct.findUnique({ where: { id: productId } })
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

    const data = await request.formData()
    const files = data.getAll('files') as File[]

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files uploaded' }, { status: 400 })
    }

    const uploadDir = join(process.cwd(), 'public/uploads/images')
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    const createdImages = []

    // determine current count for sortOrder baseline
    const existingCount = await prisma.productImage.count({ where: { productId } }).catch(() => 0)

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (!file.type.startsWith('image/')) {
        return NextResponse.json({ error: `File ${file.name} is not an image` }, { status: 400 })
      }
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json({ error: `File ${file.name} is too large (max 10MB)` }, { status: 400 })
      }

      const timestamp = Date.now()
      const randomString = Math.random().toString(36).substring(2)
      const extension = (file.name.split('.').pop() || 'jpg').replace(/[^a-zA-Z0-9]/g, '')
      const filename = `${timestamp}_${randomString}.${extension}`

      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      const filepath = join(uploadDir, filename)
      await writeFile(filepath, buffer)

      const url = `/uploads/images/${filename}`

      const img = await prisma.productImage.create({
        data: {
          productId,
          imageUrl: url,
          altText: file.name,
          isPrimary: false,
          sortOrder: existingCount + i,
          imageSize: 'MEDIUM',
          businessType: product.businessType || 'restaurant'
        }
      })

      createdImages.push(img)
    }

    // Return the updated product with images to simplify client updates
    const productWithImages = await prisma.businessProduct.findUnique({
      where: { id: productId },
      include: {
        productImages: {
          orderBy: [
            { isPrimary: 'desc' },
            { sortOrder: 'asc' }
          ]
        },
        productVariants: {
          where: { isActive: true },
          orderBy: { name: 'asc' }
        }
      }
    })

    // Normalize to the legacy API shape expected by the client
    const normalized = productWithImages
      ? {
          ...productWithImages,
          images: (productWithImages as any).productImages || [],
          variants: (productWithImages as any).productVariants || []
        }
      : null

    return NextResponse.json({ success: true, data: normalized })
  } catch (error) {
    console.error('Product image upload error:', error)
    return NextResponse.json({ success: false, error: 'Failed to upload images' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> })
 {

    const { id } = await params
  try {
    const { id: productId } = await params
    const body = await request.json().catch(() => ({}))
    const imageId = body.imageId || body.id
    const filename = body.filename

    if (!imageId && !filename) {
      return NextResponse.json({ error: 'imageId or filename required' }, { status: 400 })
    }

    let imgRecord = null
    if (imageId) {
      imgRecord = await prisma.productImage.findUnique({ where: { id: imageId } })
    } else if (filename) {
      // try to find by imageUrl containing filename
      imgRecord = await prisma.productImage.findFirst({ where: { imageUrl: { contains: filename } } })
    }

    if (!imgRecord) return NextResponse.json({ error: 'Image not found' }, { status: 404 })

    // delete file from disk if present
    try {
      const parts = imgRecord.imageUrl.split('/')
      const fname = parts[parts.length - 1]
      const filepath = join(process.cwd(), 'public/uploads/images', fname)
      if (existsSync(filepath)) {
        await unlink(filepath)
      }
    } catch (err) {
      console.warn('Failed to delete image file:', err)
    }

    await prisma.productImage.delete({ where: { id: imgRecord.id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Product image delete error:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete image' }, { status: 500 })
  }
}
