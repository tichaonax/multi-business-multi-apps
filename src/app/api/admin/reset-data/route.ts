import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { message: 'Admin access required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { confirmReset, confirmMessage } = body;

    // Require explicit confirmation
    if (!confirmReset || confirmMessage !== 'I understand this will permanently delete all business and employee data') {
      return NextResponse.json(
        { message: 'Confirmation required. Please confirm you understand this action cannot be undone.' },
        { status: 400 }
      );
    }

    console.log(`🚨 Data reset initiated by ${session.user.name} (${session.user.email})`);

    // Start transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Get counts before deletion for audit trail
      const beforeCounts = {
        businesses: await tx.businesses.count(),
        employees: await tx.employees.count(),
        employeeContracts: await tx.employeeContracts.count(),
        businessMemberships: await tx.businessMemberships.count(),
        auditLogs: await tx.auditLogs.count(),
        users: await tx.users.count(),
        // Reference data that will be reset and recreated
        idFormatTemplates: await tx.idFormatTemplates.count(),
        compensationTypes: await tx.compensationTypes.count(),
        jobTitles: await tx.jobTitles.count(),
        benefitTypes: await tx.benefit_types.count(),
        driverLicenseTemplates: await tx.driverLicenseTemplates.count(),
      };

      console.log(`📊 Before reset: ${beforeCounts.businesses} businesses, ${beforeCounts.employees} employees, ${beforeCounts.employeeContracts} contracts, ${beforeCounts.users} users`);

      // Get sample of data being deleted for audit trail
      const sampleBusinesses = await tx.businesses.findMany({
        take: 5,
        select: {
          id: true,
          name: true,
          type: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' }
      });

      const sampleEmployees = await tx.employees.findMany({
        take: 5,
        select: {
          id: true,
          fullName: true,
          email: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' }
      });

      // Delete in order to respect foreign key constraints
      console.log('🗑️ Deleting all employee contracts...');
      const deletedContracts = await tx.employeeContracts.deleteMany({});
      console.log(`✅ Deleted ${deletedContracts.count} employee contracts`);

      console.log('🗑️ Deleting all employees...');
      const deletedEmployees = await tx.employees.deleteMany({});
      console.log(`✅ Deleted ${deletedEmployees.count} employees`);

      console.log('🗑️ Deleting all business memberships...');
      const deletedMemberships = await tx.businessMemberships.deleteMany({});
      console.log(`✅ Deleted ${deletedMemberships.count} business memberships`);

      console.log('🗑️ Deleting all businesses...');
      const deletedBusinesses = await tx.businesses.deleteMany({});
      console.log(`✅ Deleted ${deletedBusinesses.count} businesses`);

      // Delete reference data that will be recreated by seeding
      console.log('🗑️ Deleting reference data for fresh seeding...');

      const deletedIdTemplates = await tx.idFormatTemplates.deleteMany({});
      console.log(`✅ Deleted ${deletedIdTemplates.count} ID format templates`);

      const deletedCompensationTypes = await tx.compensationTypes.deleteMany({});
      console.log(`✅ Deleted ${deletedCompensationTypes.count} compensation types`);

      const deletedJobTitles = await tx.jobTitles.deleteMany({});
      console.log(`✅ Deleted ${deletedJobTitles.count} job titles`);

      const deletedBenefitTypes = await tx.benefit_types.deleteMany({});
      console.log(`✅ Deleted ${deletedBenefitTypes.count} benefit types`);

      const deletedDriverLicenseTemplates = await tx.driverLicenseTemplates.deleteMany({});
      console.log(`✅ Deleted ${deletedDriverLicenseTemplates.count} driver license templates`);

      // Verify deletion
      const afterCounts = {
        businesses: await tx.businesses.count(),
        employees: await tx.employees.count(),
        employeeContracts: await tx.employeeContracts.count(),
        businessMemberships: await tx.businessMemberships.count(),
        users: await tx.users.count(),
        // Reference data counts after deletion
        idFormatTemplates: await tx.idFormatTemplates.count(),
        compensationTypes: await tx.compensationTypes.count(),
        jobTitles: await tx.jobTitles.count(),
        benefitTypes: await tx.benefit_types.count(),
        driverLicenseTemplates: await tx.driverLicenseTemplates.count(),
      };

      console.log(`📊 After reset: ${afterCounts.businesses} businesses, ${afterCounts.employees} employees, ${afterCounts.employeeContracts} contracts, ${afterCounts.users} users`);

      // Create audit log entry for this critical action
      await createAuditLog({
        userId: session.user.id!,
        action: 'BACKUP_RESTORED' as any, // Using existing audit action
        entityType: 'Backup',
        entityId: 'data-reset-' + Date.now(),
        oldValues: {
          beforeCounts,
          sampleDeletedBusinesses: sampleBusinesses,
          sampleDeletedEmployees: sampleEmployees,
          totalItemsDeleted: beforeCounts.businesses + beforeCounts.employees + beforeCounts.employeeContracts,
        },
        newValues: {
          afterCounts,
          resetTimestamp: new Date().toISOString(),
          resetBy: {
            userId: session.user.id,
            userName: session.user.name,
            userEmail: session.user.email,
          },
          confirmationMessage: confirmMessage,
          dataPreserved: {
            users: afterCounts.users,
            auditLogs: 'preserved',
            accounts: 'preserved',
            sessions: 'preserved',
          }
        },
      });

      return {
        success: true,
        deletedCounts: {
          businesses: deletedBusinesses.count,
          employees: deletedEmployees.count,
          contracts: deletedContracts.count,
          memberships: deletedMemberships.count,
          // Reference data deleted for recreation
          idFormatTemplates: deletedIdTemplates.count,
          compensationTypes: deletedCompensationTypes.count,
          jobTitles: deletedJobTitles.count,
          benefitTypes: deletedBenefitTypes.count,
          driverLicenseTemplates: deletedDriverLicenseTemplates.count,
        },
        beforeCounts,
        afterCounts,
        preservedData: {
          users: afterCounts.users,
          auditLogs: 'All audit logs preserved',
        }
      };
    });

    console.log('✅ Data reset completed successfully');
    console.log('🌱 Now seeding essential reference data...');

    // Automatically seed essential reference data after reset
    let seedResult;
    try {
      const { stdout, stderr } = await execAsync('node scripts/seed-all-employee-data.js', {
        cwd: process.cwd(),
        timeout: 30000 // 30 second timeout
      });

      console.log('🌱 Seed output:', stdout);
      if (stderr) console.warn('🌱 Seed warnings:', stderr);

      seedResult = {
        success: true,
        output: stdout,
        warnings: stderr || null,
        seededData: {
          idTemplates: 5,
          driverLicenseTemplates: 9,
          jobTitles: 29,
          compensationTypes: 15,
          benefitTypes: 28
        }
      };

      console.log('✅ Essential reference data seeded successfully');
    } catch (seedError) {
      console.error('❌ Failed to seed reference data:', seedError);
      seedResult = {
        success: false,
        error: seedError instanceof Error ? seedError.message : 'Unknown seeding error',
        warning: 'Data reset completed but reference data seeding failed. You may need to run seed scripts manually.'
      };
    }

    // Return response with cache invalidation headers
    const response = NextResponse.json({
      message: 'Data reset completed successfully',
      details: result,
      seedResult: seedResult,
      warning: seedResult.success
        ? 'All businesses, employees, contracts, and memberships have been permanently deleted. Users and audit logs have been preserved. Essential reference data has been restored.'
        : 'All businesses, employees, contracts, and memberships have been permanently deleted. Users and audit logs have been preserved. WARNING: Reference data seeding failed - you may need to run seed scripts manually.',
      cacheCleared: true,
    });

    // Set headers to invalidate all caches
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    response.headers.set('Clear-Site-Data', '"cache", "storage"');
    response.headers.set('X-Cache-Invalidate', 'true');
    response.headers.set('X-Data-Reset', 'true');
    response.headers.set('X-Timestamp', Date.now().toString());

    return response;

  } catch (error) {
    console.error('❌ Data reset failed:', error);

    // Log the failed attempt
    try {
      const session = await getServerSession(authOptions);
      if (session?.user) {
        await createAuditLog({
          userId: session.user.id!,
          action: 'BACKUP_RESTORED' as any,
          entityType: 'Backup',
          entityId: 'data-reset-failed-' + Date.now(),
          oldValues: null,
          newValues: {
            error: error instanceof Error ? error.message : 'Unknown error',
            failedAt: new Date().toISOString(),
            attemptedBy: {
              userId: session.user.id,
              userName: session.user.name,
              userEmail: session.user.email,
            }
          },
        });
      }
    } catch (auditError) {
      console.error('Failed to log data reset failure:', auditError);
    }

    return NextResponse.json(
      {
        message: 'Data reset failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        details: 'The data reset operation could not be completed. No data has been deleted.'
      },
      { status: 500 }
    );
  }
}