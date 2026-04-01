const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()
p.businessSuppliers.findMany({
  select: { id: true, businessType: true, supplierNumber: true, name: true }
}).then(rows => {
  console.log('Count:', rows.length)
  rows.forEach(s => console.log(s.id, '|', s.businessType, '|', s.supplierNumber, '|', s.name))
  p.$disconnect()
})
