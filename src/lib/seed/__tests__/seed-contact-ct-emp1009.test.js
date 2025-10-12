/**
 * @jest-environment node
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

describe('Seeded CT-EMP1009 data', () => {
  afterAll(async () => {
    await prisma.$disconnect()
  })

  test('employee EMP1009 has realistic contact info and contract has pdfGenerationData.benefits', async () => {
    const employee = await prisma.employees.findUnique({
      where: { employeeNumber: 'EMP1009' }
    })

    expect(employee).toBeTruthy()
    expect(employee.email).toBe('michael.davis@techcorp.com')
    expect(employee.phone).toBe('+263-78-545-3103')
    expect(employee.address).toBe('789 Pine St, City, State 12345')

    const contract = await prisma.employeeContracts.findFirst({
      where: { contractNumber: 'CT-EMP1009' },
      select: { pdfGenerationData: true, baseSalary: true, startDate: true }
    })

    expect(contract).toBeTruthy()
    expect(contract.pdfGenerationData).toBeTruthy()
  expect(Array.isArray(contract.pdfGenerationData.benefits)).toBe(true)
  expect(contract.pdfGenerationData.benefits.length).toBeGreaterThanOrEqual(1)
  // Additional contract assertions
  expect(contract.baseSalary).toBeTruthy()
  // baseSalary stored as Decimal -> toNumber conversion, Prisma may return Decimal object; coerce to string/number for assert
  const baseSalaryNum = Number(contract.baseSalary.toString ? contract.baseSalary.toString() : contract.baseSalary)
  expect(baseSalaryNum).toBeCloseTo(800, 2)
  expect(new Date(contract.startDate).toISOString().startsWith('2025-09-29')).toBe(true)
  // Assert pdfGenerationData includes contact fields used by the PDF renderer
  expect(contract.pdfGenerationData.address).toBe('789 Pine St, City, State 12345')
  expect(contract.pdfGenerationData.phone).toBe('+263-78-545-3103')
  expect(contract.pdfGenerationData.email).toBe('michael.davis@techcorp.com')
    // spot-check one benefit shape
    const b = contract.pdfGenerationData.benefits[0]
    expect(b).toMatchObject({ name: expect.any(String), amount: expect.any(Number) })
  }, 20000)
})
