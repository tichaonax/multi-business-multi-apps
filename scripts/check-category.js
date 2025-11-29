const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkCategory() {
  const categoryId = '3446b210-c1ad-44c6-ad29-250c303bd5d8'

  console.log('Checking category:', categoryId)

  const category = await prisma.expenseCategories.findUnique({
    where: { id: categoryId }
  })

  if (category) {
    console.log('✅ Category found:', category.name)
    console.log('   Domain ID:', category.domainId)
    console.log('   Requires Subcategory:', category.requiresSubcategory)
  } else {
    console.log('❌ Category NOT FOUND')
  }

  await prisma.$disconnect()
}

checkCategory()
