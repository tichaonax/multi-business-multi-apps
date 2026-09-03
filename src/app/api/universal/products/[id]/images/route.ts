import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Menu/product image upload — stores the binary in the `images` table
 * (same pattern as `POST /api/universal/images`), not the local filesystem.
 *
 * This route used to write files to `public/uploads/images/` on disk. That
 * works fine in a plain `next dev` server but silently fails to persist (or
 * to actually get served afterward) once the app is packaged for Electron —
 * a packaged build's bundled `public/` directory isn't reliably writable or
 * even the same folder the running app reads from, so uploaded images would
 * "succeed" with a 200 response but never actually show up. Every other
 * image-upload path in this app already stores bytes in Postgres and serves
 * them via `GET /api/images/[id]`, which has no such dependency on the
 * host filesystem — this route now does the same, using the `imageId`
 * relation `ProductImages` already had for exactly this purpose.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: productId } = await params
    const product = await prisma.businessProducts.findUnique({ where: { id: productId } })
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

    const data = await request.formData()
    const files = data.getAll('files') as File[]

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files uploaded' }, { status: 400 })
    }

    const existingCount = await prisma.productImages.count({ where: { productId } }).catch(() => 0)
    const createdImages = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (!file.type.startsWith('image/')) {
        return NextResponse.json({ error: `File ${file.name} is not an image` }, { status: 400 })
      }
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json({ error: `File ${file.name} is too large (max 10MB)` }, { status: 400 })
      }

      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)

      const image = await prisma.images.create({
        data: { data: buffer, mimeType: file.type, size: file.size },
      })

      const img = await prisma.productImages.create({
        data: {
          productId,
          imageId: image.id,
          imageUrl: `/api/images/${image.id}`,
          altText: file.name,
          isPrimary: false,
          sortOrder: existingCount + i,
          imageSize: 'MEDIUM',
          businessType: product.businessType || 'restaurant',
          updatedAt: new Date(),
        },
      })

      createdImages.push(img)
    }

    // Return the updated product with images to simplify client updates
    const productWithImages = await prisma.businessProducts.findUnique({
      where: { id: productId },
      include: {
        product_images: {
          orderBy: [
            { isPrimary: 'desc' },
            { sortOrder: 'asc' }
          ]
        },
        product_variants: {
          where: { isActive: true },
          orderBy: { name: 'asc' }
        }
      }
    })

    // Normalize to the legacy API shape expected by the client
    const normalized = productWithImages
      ? {
          ...productWithImages,
          images: (productWithImages as any).product_images || [],
          variants: (productWithImages as any).product_variants || []
        }
      : null

    return NextResponse.json({ success: true, data: normalized })
  } catch (error) {
    console.error('Product image upload error:', error)
    return NextResponse.json({ success: false, error: 'Failed to upload images' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await params
    const body = await request.json().catch(() => ({}))
    const imageId = body.imageId || body.id

    if (!imageId) {
      return NextResponse.json({ error: 'imageId required' }, { status: 400 })
    }

    const imgRecord = await prisma.productImages.findUnique({ where: { id: imageId } })
    if (!imgRecord) return NextResponse.json({ error: 'Image not found' }, { status: 404 })

    await prisma.productImages.delete({ where: { id: imgRecord.id } })
    if (imgRecord.imageId) {
      await prisma.images.delete({ where: { id: imgRecord.imageId } }).catch(() => {})
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Product image delete error:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete image' }, { status: 500 })
  }
}
