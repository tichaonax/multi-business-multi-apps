const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkIdTemplate() {
  try {
    console.log('\n=== Checking Zimbabwe National ID Template ===\n')

    const template = await prisma.idFormatTemplates.findUnique({
      where: { id: 'zw-national-id' }
    })

    if (!template) {
      console.log('❌ Template not found: zw-national-id')
      return
    }

    console.log('Template Details:')
    console.log(`  ID: ${template.id}`)
    console.log(`  Name: ${template.name}`)
    console.log(`  Country: ${template.country}`)
    console.log(`  Pattern: ${template.pattern}`)
    console.log(`  Example: ${template.example}`)
    console.log(`  Description: ${template.description}`)

    // Test the pattern
    const testId = '63-123456A78'
    console.log(`\nTesting ID: "${testId}"`)

    try {
      const regex = new RegExp(template.pattern)
      console.log(`  Regex created: ${regex}`)
      const matches = regex.test(testId)
      console.log(`  Test result: ${matches ? '✅ PASS' : '❌ FAIL'}`)

      if (!matches) {
        console.log('\n🔍 Debugging:')
        console.log(`  Pattern string: "${template.pattern}"`)
        console.log(`  Pattern length: ${template.pattern.length}`)
        console.log(`  Test ID: "${testId}"`)
        console.log(`  Test ID length: ${testId.length}`)

        // Try to match step by step
        console.log('\n  Character-by-character comparison:')
        for (let i = 0; i < Math.max(template.pattern.length, testId.length); i++) {
          console.log(`    [${i}] Pattern: "${template.pattern[i] || 'END'}" | ID: "${testId[i] || 'END'}"`)
        }

        // Test without anchors
        const patternWithoutAnchors = template.pattern.replace(/^\^/, '').replace(/\$$/, '')
        const regexNoAnchors = new RegExp(patternWithoutAnchors)
        console.log(`\n  Testing without anchors (^$):`)
        console.log(`    Pattern: ${patternWithoutAnchors}`)
        console.log(`    Result: ${regexNoAnchors.test(testId) ? '✅ PASS' : '❌ FAIL'}`)
      }
    } catch (error) {
      console.log(`  ❌ Regex error: ${error.message}`)
    }

    // Test the example from the template
    console.log(`\nTesting template example: "${template.example}"`)
    try {
      const regex = new RegExp(template.pattern)
      const exampleMatches = regex.test(template.example)
      console.log(`  Result: ${exampleMatches ? '✅ PASS' : '❌ FAIL'}`)
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`)
    }

    console.log('\n')

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkIdTemplate()
