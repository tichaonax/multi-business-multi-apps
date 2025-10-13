#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

console.log('Available Prisma client models:')
const models = Object.keys(prisma).filter(k => !k.startsWith('_') && !k.startsWith('$')).sort()
console.log(models.join(', '))

console.log('\nChecking specific models:')
console.log('prisma.users:', typeof prisma.users)
console.log('prisma.businessMemberships:', typeof prisma.businessMemberships)
console.log('prisma.idFormatTemplates:', typeof prisma.idFormatTemplates)
console.log('prisma.jobTitles:', typeof prisma.jobTitles)

prisma.$disconnect()
