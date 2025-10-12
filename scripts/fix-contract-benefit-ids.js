const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixContractBenefitIds() {
  console.log('🔧 Starting contract benefit ID migration...\n');

  try {
    // Get all contracts with pdfGenerationData
    const contracts = await prisma.employeeContracts.findMany({
      where: {
        pdfGenerationData: { not: null }
      },
      include: {
        contract_benefits: {
          include: {
            benefitType: true
          }
        }
      }
    });

    console.log(`Found ${contracts.length} contracts with PDF generation data\n`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const contract of contracts) {
      const pdfData = contract.pdfGenerationData;

      if (!pdfData || !Array.isArray(pdfData.benefits)) {
        console.log(`⏭️  Skipping contract ${contract.id} - no benefits in pdfGenerationData`);
        skippedCount++;
        continue;
      }

      let needsUpdate = false;
      const updatedBenefits = pdfData.benefits.map(benefit => {
        // If already has benefitTypeId, skip
        if (benefit.benefitTypeId) {
          return benefit;
        }

        // Find matching benefit from contract_benefits relation by name
        const matchingBenefit = contract.contract_benefits.find(
          cb => cb.benefitType.name === benefit.name
        );

        if (matchingBenefit) {
          needsUpdate = true;
          console.log(`  ✓ Adding benefitTypeId to "${benefit.name}": ${matchingBenefit.benefitType.id}`);
          return {
            ...benefit,
            benefitTypeId: matchingBenefit.benefitType.id
          };
        }

        // If no match found, try to find by name in benefitTypes table
        console.log(`  ⚠️  No contract_benefit match for "${benefit.name}", will search benefitTypes...`);
        return benefit;
      });

      // For benefits that still don't have IDs, search benefitTypes table
      const finalBenefits = await Promise.all(
        updatedBenefits.map(async (benefit) => {
          if (benefit.benefitTypeId) {
            return benefit;
          }

          const benefitType = await prisma.benefitType.findFirst({
            where: { name: benefit.name }
          });

          if (benefitType) {
            needsUpdate = true;
            console.log(`  ✓ Found benefitTypeId in benefitTypes for "${benefit.name}": ${benefitType.id}`);
            return {
              ...benefit,
              benefitTypeId: benefitType.id
            };
          }

          console.log(`  ❌ Could not find benefitTypeId for "${benefit.name}"`);
          return benefit;
        })
      );

      if (needsUpdate) {
        await prisma.employeeContracts.update({
          where: { id: contract.id },
          data: {
            pdfGenerationData: {
              ...pdfData,
              benefits: finalBenefits
            }
          }
        });
        console.log(`✅ Updated contract ${contract.id}\n`);
        updatedCount++;
      } else {
        console.log(`⏭️  Skipped contract ${contract.id} - already has all benefitTypeIds\n`);
        skippedCount++;
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`  ✅ Updated: ${updatedCount} contracts`);
    console.log(`  ⏭️  Skipped: ${skippedCount} contracts`);
    console.log(`  📝 Total: ${contracts.length} contracts processed`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

fixContractBenefitIds();
