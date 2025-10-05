const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const idOrName = process.argv[2]
  if (!idOrName) {
    console.error('Usage: node scripts/find-construction-project.js <id-or-name-fragment>')
    process.exit(1)
  }

  console.log('Searching for ConstructionProject with id or name like:', idOrName)

  // Try exact id on constructionProject
  const byId = await prisma.constructionProject.findUnique({ where: { id: idOrName } })
  if (byId) {
    console.log('Found constructionProject by id:')
    console.log(JSON.stringify(byId, null, 2))
  } else {
    console.log('No constructionProject found with that id')
  }

  // Try name fragment search
  const byName = await prisma.constructionProject.findMany({ where: { name: { contains: idOrName, mode: 'insensitive' } }, take: 20 })
  console.log(`Found ${byName.length} constructionProjects matching name fragment:`)
  console.log(JSON.stringify(byName.map(p => ({ id: p.id, name: p.name, createdBy: p.createdBy })), null, 2))

  // Also check generic Project table in case the record is there
  const projectById = await prisma.project.findUnique({ where: { id: idOrName } }).catch(() => null)
  if (projectById) {
    console.log('Found Project (non-construction) by id:')
    console.log(JSON.stringify(projectById, null, 2))
  } else {
    console.log('No Project found with that id')
  }

  const projectByName = await prisma.project.findMany({ where: { name: { contains: idOrName, mode: 'insensitive' } }, take: 20 })
  console.log(`Found ${projectByName.length} Project(s) matching name fragment:`)
  console.log(JSON.stringify(projectByName.map(p => ({ id: p.id, name: p.name, createdBy: p.createdBy })), null, 2))
}

main()
  .catch(e => {
    console.error('Error running query:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
