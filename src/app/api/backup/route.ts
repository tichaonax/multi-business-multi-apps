import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const backupType = searchParams.get('type') || 'full';
    const includeAuditLogs = searchParams.get('includeAuditLogs') === 'true';

    const backupData: any = {
      metadata: {
        backupType,
        timestamp: new Date().toISOString(),
        version: '1.0',
        source: 'multi-business-multi-apps',
        includeAuditLogs
      }
    };

    switch (backupType) {
      case 'full':
        // Full backup with all data
        backupData.users = await prisma.users.findMany({
          include: {
            businessMemberships: {
              include: {
                business: true,
                permissionTemplate: true
              }
            },
            employee: true
          }
        });

        backupData.businesses = await prisma.businesses.findMany({
          include: {
            businessMemberships: true,
            employees: true,
            childBusinesses: true
          }
        });

        backupData.employees = await prisma.employees.findMany({
          include: {
            jobTitles: true,
            compensationTypes: true,
            business: true,
            employeeContracts: true,
            employeeBusinessAssignments: true
          }
        });

        backupData.businessMemberships = await prisma.businessMemberships.findMany({
          include: {
            user: true,
            business: true,
            permissionTemplate: true
          }
        });

        backupData.employeeContracts = await prisma.employeeContracts.findMany({
          include: {
            employee: true,
            business: true,
            jobTitle: true,
            compensationType: true
          }
        });

        // Reference data
        backupData.jobTitles = await prisma.jobTitles.findMany();
        backupData.compensationTypes = await prisma.compensationTypes.findMany();
        backupData.benefitTypes = await prisma.benefitTypes.findMany();
        backupData.idFormatTemplates = await prisma.idFormatTemplates.findMany();
        backupData.driverLicenseTemplates = await prisma.driverLicenseTemplates.findMany();
        backupData.permissionTemplates = await prisma.permissionTemplates.findMany();

        if (includeAuditLogs) {
          backupData.auditLogs = await prisma.auditLogs.findMany({
            orderBy: { timestamp: 'desc' },
            take: 10000,
            include: {
              user: {
                select: { id: true, name: true, email: true }
              }
            }
          });
        }
        break;

      case 'users':
        // Users and permissions only
        backupData.users = await prisma.users.findMany({
          include: {
            businessMemberships: {
              include: {
                business: true,
                permissionTemplate: true
              }
            }
          }
        });

        backupData.businessMemberships = await prisma.businessMemberships.findMany({
          include: {
            user: true,
            business: true,
            permissionTemplate: true
          }
        });

        backupData.permissionTemplates = await prisma.permissionTemplates.findMany();
        break;

      case 'business-data':
        // Business information and settings
        backupData.businesses = await prisma.businesses.findMany({
          include: {
            businessMemberships: true,
            childBusinesses: true
          }
        });

        backupData.businessMemberships = await prisma.businessMemberships.findMany({
          include: {
            user: {
              select: { id: true, name: true, email: true }
            },
            business: true,
            permissionTemplate: true
          }
        });

        // Business products and categories
        backupData.businessCategories = await prisma.businessCategories.findMany();
        backupData.businessBrands = await prisma.businessBrands.findMany();
        backupData.businessProducts = await prisma.businessProducts.findMany();
        backupData.businessCustomers = await prisma.businessCustomers.findMany();
        backupData.businessSuppliers = await prisma.businessSuppliers.findMany();
        break;

      case 'employees':
        // Employee data
        backupData.employees = await prisma.employees.findMany({
          include: {
            jobTitles: true,
            compensationTypes: true,
            business: true,
            employeeContracts: true,
            employeeBusinessAssignments: true,
            employeeBenefits: true,
            employeeAttendance: true
          }
        });

        backupData.employeeContracts = await prisma.employeeContracts.findMany({
          include: {
            employee: true,
            business: true,
            jobTitle: true,
            compensationType: true,
            contractBenefits: true
          }
        });

        backupData.employeeBusinessAssignments = await prisma.employeeBusinessAssignments.findMany();
        backupData.employeeBenefits = await prisma.employeeBenefits.findMany();
        backupData.employeeAttendance = await prisma.employeeAttendance.findMany();
        backupData.disciplinaryActions = await prisma.disciplinaryActions.findMany();
        break;

      case 'reference-data':
        // Reference data only
        backupData.jobTitles = await prisma.jobTitles.findMany();
        backupData.compensationTypes = await prisma.compensationTypes.findMany();
        backupData.benefitTypes = await prisma.benefitTypes.findMany();
        backupData.idFormatTemplates = await prisma.idFormatTemplates.findMany();
        backupData.driverLicenseTemplates = await prisma.driverLicenseTemplates.findMany();
        backupData.permissionTemplates = await prisma.permissionTemplates.findMany();
        break;

      default:
        return NextResponse.json({ error: 'Invalid backup type' }, { status: 400 });
    }

    // Generate filename with app name prefix
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `multi-business-multi-apps-backup_${backupType}_${timestamp}.json`;

    const response = new NextResponse(JSON.stringify(backupData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

    return response;

  } catch (error) {
    console.error('Backup creation failed:', error);
    return NextResponse.json({
      error: 'Backup creation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const backupData = await request.json();

    if (!backupData.metadata) {
      return NextResponse.json({
        error: 'Invalid backup file - missing metadata'
      }, { status: 400 });
    }

    const results = {
      restored: {
        users: 0,
        businesses: 0,
        employees: 0,
        businessMemberships: 0,
        auditLogs: 0,
        referenceData: 0
      },
      errors: [] as string[]
    };

    // Use transaction for data integrity
    await prisma.$transaction(async (tx) => {
      try {
        // Restore reference data first (dependencies)
        if (backupData.jobTitles) {
          for (const jobTitle of backupData.jobTitles) {
            try {
              await tx.jobTitle.upsert({
                where: { id: jobTitle.id },
                update: {
                  title: jobTitle.title,
                  description: jobTitle.description,
                  responsibilities: jobTitle.responsibilities,
                  department: jobTitle.department,
                  level: jobTitle.level,
                  isActive: jobTitle.isActive
                },
                create: {
                  id: jobTitle.id,
                  title: jobTitle.title,
                  description: jobTitle.description,
                  responsibilities: jobTitle.responsibilities,
                  department: jobTitle.department,
                  level: jobTitle.level,
                  isActive: jobTitle.isActive,
                  createdAt: new Date(jobTitle.createdAt),
                  updatedAt: new Date(jobTitle.updatedAt)
                }
              });
              results.restored.referenceData++;
            } catch (error) {
              results.errors.push(`Job Title ${jobTitle.title}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        if (backupData.compensationTypes) {
          for (const compensationType of backupData.compensationTypes) {
            try {
              await tx.compensationType.upsert({
                where: { id: compensationType.id },
                update: {
                  name: compensationType.name,
                  type: compensationType.type,
                  description: compensationType.description,
                  baseAmount: compensationType.baseAmount,
                  commissionPercentage: compensationType.commissionPercentage,
                  frequency: compensationType.frequency,
                  isActive: compensationType.isActive
                },
                create: {
                  id: compensationType.id,
                  name: compensationType.name,
                  type: compensationType.type,
                  description: compensationType.description,
                  baseAmount: compensationType.baseAmount,
                  commissionPercentage: compensationType.commissionPercentage,
                  frequency: compensationType.frequency,
                  isActive: compensationType.isActive,
                  createdAt: new Date(compensationType.createdAt),
                  updatedAt: new Date(compensationType.updatedAt)
                }
              });
              results.restored.referenceData++;
            } catch (error) {
              results.errors.push(`Compensation Type ${compensationType.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        if (backupData.benefitTypes) {
          for (const benefitType of backupData.benefitTypes) {
            try {
              await tx.benefitType.upsert({
                where: { id: benefitType.id },
                update: {
                  name: benefitType.name,
                  description: benefitType.description,
                  type: benefitType.type,
                  defaultAmount: benefitType.defaultAmount,
                  isPercentage: benefitType.isPercentage,
                  isActive: benefitType.isActive
                },
                create: {
                  id: benefitType.id,
                  name: benefitType.name,
                  description: benefitType.description,
                  type: benefitType.type,
                  defaultAmount: benefitType.defaultAmount,
                  isPercentage: benefitType.isPercentage,
                  isActive: benefitType.isActive,
                  createdAt: new Date(benefitType.createdAt),
                  updatedAt: new Date(benefitType.updatedAt)
                }
              });
              results.restored.referenceData++;
            } catch (error) {
              results.errors.push(`Benefit Type ${benefitType.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        // Restore businesses
        if (backupData.businesses) {
          for (const business of backupData.businesses) {
            try {
              await tx.business.upsert({
                where: { id: business.id },
                update: {
                  name: business.name,
                  type: business.type,
                  description: business.description,
                  isActive: business.isActive,
                  settings: business.settings,
                  umbrellaBusinessId: business.umbrellaBusinessId,
                  isUmbrellaBusiness: business.isUmbrellaBusiness
                },
                create: {
                  id: business.id,
                  name: business.name,
                  type: business.type,
                  description: business.description,
                  isActive: business.isActive,
                  settings: business.settings,
                  createdBy: business.createdBy,
                  umbrellaBusinessId: business.umbrellaBusinessId,
                  isUmbrellaBusiness: business.isUmbrellaBusiness,
                  createdAt: new Date(business.createdAt),
                  updatedAt: new Date(business.updatedAt)
                }
              });
              results.restored.businesses++;
            } catch (error) {
              results.errors.push(`Business ${business.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        // Restore users
        if (backupData.users) {
          for (const user of backupData.users) {
            try {
              await tx.user.upsert({
                where: { id: user.id },
                update: {
                  email: user.email,
                  name: user.name,
                  role: user.role,
                  permissions: user.permissions,
                  isActive: user.isActive,
                  passwordResetRequired: user.passwordResetRequired
                },
                create: {
                  id: user.id,
                  email: user.email,
                  passwordHash: user.passwordHash,
                  name: user.name,
                  role: user.role,
                  permissions: user.permissions,
                  isActive: user.isActive,
                  passwordResetRequired: user.passwordResetRequired,
                  createdAt: new Date(user.createdAt),
                  updatedAt: new Date(user.updatedAt)
                }
              });
              results.restored.users++;
            } catch (error) {
              results.errors.push(`User ${user.email}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        // Restore business memberships
        if (backupData.businessMemberships) {
          for (const membership of backupData.businessMemberships) {
            try {
              await tx.businessMembership.upsert({
                where: {
                  userId_businessId: {
                    userId: membership.userId,
                    businessId: membership.businessId
                  }
                },
                update: {
                  role: membership.role,
                  permissions: membership.permissions,
                  isActive: membership.isActive,
                  templateId: membership.templateId
                },
                create: {
                  id: membership.id,
                  userId: membership.userId,
                  businessId: membership.businessId,
                  role: membership.role,
                  permissions: membership.permissions,
                  isActive: membership.isActive,
                  invitedBy: membership.invitedBy,
                  templateId: membership.templateId,
                  joinedAt: new Date(membership.joinedAt)
                }
              });
              results.restored.businessMemberships++;
            } catch (error) {
              results.errors.push(`Business Membership ${membership.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        // Restore employees
        if (backupData.employees) {
          for (const employee of backupData.employees) {
            try {
              await tx.employee.upsert({
                where: { id: employee.id },
                update: {
                  employeeNumber: employee.employeeNumber,
                  firstName: employee.firstName,
                  lastName: employee.lastName,
                  fullName: employee.fullName,
                  email: employee.email,
                  phone: employee.phone,
                  nationalId: employee.nationalId,
                  isActive: employee.isActive,
                  employmentStatus: employee.employmentStatus
                },
                create: {
                  id: employee.id,
                  employeeNumber: employee.employeeNumber,
                  firstName: employee.firstName,
                  lastName: employee.lastName,
                  fullName: employee.fullName,
                  email: employee.email,
                  phone: employee.phone,
                  nationalId: employee.nationalId,
                  hireDate: new Date(employee.hireDate),
                  jobTitleId: employee.jobTitleId,
                  compensationTypeId: employee.compensationTypeId,
                  primaryBusinessId: employee.primaryBusinessId,
                  isActive: employee.isActive,
                  employmentStatus: employee.employmentStatus,
                  createdAt: new Date(employee.createdAt),
                  updatedAt: new Date(employee.updatedAt)
                }
              });
              results.restored.employees++;
            } catch (error) {
              results.errors.push(`Employee ${employee.fullName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        // Restore audit logs if included
        if (backupData.auditLogs) {
          for (const auditLog of backupData.auditLogs) {
            try {
              await tx.auditLog.create({
                data: {
                  id: auditLog.id,
                  userId: auditLog.userId,
                  action: auditLog.action,
                  entityType: auditLog.entityType,
                  entityId: auditLog.entityId,
                  timestamp: new Date(auditLog.timestamp),
                  oldValues: auditLog.oldValues,
                  newValues: auditLog.newValues,
                  metadata: auditLog.metadata,
                  tableName: auditLog.tableName,
                  recordId: auditLog.recordId,
                  changes: auditLog.changes,
                  details: auditLog.details
                }
              });
              results.restored.auditLogs++;
            } catch (error) {
              results.errors.push(`Audit Log ${auditLog.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

      } catch (error) {
        throw error;
      }
    });

    return NextResponse.json({
      message: 'Restore completed successfully',
      results
    });

  } catch (error) {
    console.error('Restore failed:', error);
    return NextResponse.json({
      error: 'Restore failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}