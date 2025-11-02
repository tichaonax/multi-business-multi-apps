import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

import { randomBytes } from 'crypto';
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const backupType = searchParams.get('type') || 'full';
    const includeAuditLogs = searchParams.get('includeAuditLogs') === 'true';
    const includeDemoData = searchParams.get('includeDemoData') === 'true'; // Demo data excluded by default
    const includeBusinessData = searchParams.get('includeBusinessData') !== 'false'; // Business data included by default
    const businessId = searchParams.get('businessId'); // Optional: backup specific business only

    const backupData: any = {
      metadata: {
        backupType,
        timestamp: new Date().toISOString(),
        version: '1.0',
        source: 'multi-business-multi-apps',
        includeAuditLogs,
        includeDemoData,
        includeBusinessData,
        businessId: businessId || undefined,
        note: businessId 
          ? `Specific business backup (${businessId})`
          : includeDemoData 
            ? 'Demo data included' 
            : 'Demo data excluded (production backup)'
      }
    };

    switch (backupType) {
      case 'full':
        // Full backup with all data (excluding demo by default)
        const businessFilter = includeDemoData ? {} : { isDemo: false };
        
        backupData.businesses = await prisma.businesses.findMany({
          where: businessFilter,
          include: {
            business_memberships: true,
            employees: true,
            other_businesses: true
          }
        });

        const businessIds = backupData.businesses.map((b: any) => b.id);

        backupData.users = await prisma.users.findMany({
          where: includeDemoData ? {} : {
            business_memberships: {
              some: {
                businessId: { in: businessIds }
              }
            }
          },
          include: {
            business_memberships: {
              where: {
                businessId: { in: businessIds }
              },
              include: {
                businesses: true,
                permission_templates: true
              }
            },
            employees: true
          }
        });

        backupData.employees = await prisma.employees.findMany({
          where: {
            primaryBusinessId: { in: businessIds }
          },
          include: {
            job_titles: true,
            compensation_types: true,
            businesses: true,
            employee_contracts_employee_contracts_employeeIdToemployees: true,
            employee_business_assignments: true
          }
        });

        backupData.businessMemberships = await prisma.businessMemberships.findMany({
          where: {
            businessId: { in: businessIds }
          },
          include: {
            users: true,
            businesses: true,
            permission_templates: true
          }
        });

        backupData.employeeContracts = await prisma.employeeContracts.findMany({
          where: {
            primaryBusinessId: { in: businessIds }
          },
          include: {
            employees_employee_contracts_employeeIdToemployees: true,
            businesses_employee_contracts_primaryBusinessIdTobusinesses: true,
            job_titles: true,
            compensation_types: true
          }
        });

        // Business Data - Products, Inventory, Categories, Suppliers, Customers
        // Only include if includeBusinessData is true (default)
        if (includeBusinessData) {
          backupData.businessProducts = await prisma.businessProducts.findMany({
            where: { businessId: { in: businessIds } },
            include: {
              product_variants: true,
              product_images: true,
              product_attributes: true
            }
          });

          backupData.productVariants = await prisma.productVariants.findMany({
            where: {
              business_products: {
                businessId: { in: businessIds }
              }
            }
          });

          backupData.businessStockMovements = await prisma.businessStockMovements.findMany({
            where: { businessId: { in: businessIds } }
          });

          // Get business types for type-based data filtering
          const businessTypes = [...new Set(backupData.businesses.map((b: any) => b.type))];

          backupData.businessCategories = await prisma.businessCategories.findMany({
            where: {
              OR: [
                { businessId: { in: businessIds } },
                { businessId: null, businessType: { in: businessTypes } }
              ]
            }
          });

          backupData.businessSuppliers = await prisma.businessSuppliers.findMany({
            where: {
              OR: [
                { businessId: { in: businessIds } },
                { businessId: null, businessType: { in: businessTypes } }
              ]
            }
          });

          backupData.businessCustomers = await prisma.businessCustomers.findMany({
            where: { businessId: { in: businessIds } }
          });

          backupData.businessBrands = await prisma.businessBrands.findMany({
            where: { businessId: { in: businessIds } }
          });
        }

        // Reference data
        backupData.jobTitles = await prisma.jobTitles.findMany();
        backupData.compensationTypes = await prisma.compensationTypes.findMany();
        backupData.benefit_types = await prisma.benefitTypes.findMany();
        backupData.idFormatTemplates = await prisma.idFormatTemplates.findMany();
        backupData.driverLicenseTemplates = await prisma.driverLicenseTemplates.findMany();
        backupData.permissionTemplates = await prisma.permissionTemplates.findMany();

        if (includeAuditLogs) {
          backupData.auditLogs = await prisma.auditLogs.findMany({
            orderBy: { timestamp: 'desc' },
            take: 10000,
            include: {
              users: {
                select: { id: true, name: true, email: true }
              }
            }
          });
        }
        break;

      case 'demo-only':
        // Demo businesses only backup - include ONLY demo businesses and their data
        const demoBusinessFilter: any = { isDemo: true, isActive: true };
        if (businessId) {
          demoBusinessFilter.id = businessId;
        }
        
        const demoBusinesses = await prisma.businesses.findMany({
          where: demoBusinessFilter,
          include: {
            business_memberships: true,
            employees: true,
            other_businesses: true
          }
        });
        
        if (demoBusinesses.length === 0) {
          return NextResponse.json({ 
            error: businessId ? 'Demo business not found' : 'No demo businesses found' 
          }, { status: 404 });
        }
        
        backupData.businesses = demoBusinesses;
        const demoBusinessIds = demoBusinesses.map((b: any) => b.id);

        // Get all users who are members of demo businesses
        backupData.users = await prisma.users.findMany({
          where: {
            business_memberships: {
              some: {
                businessId: { in: demoBusinessIds }
              }
            }
          },
          include: {
            business_memberships: {
              where: {
                businessId: { in: demoBusinessIds }
              },
              include: {
                businesses: true,
                permission_templates: true
              }
            },
            employees: true
          }
        });

        // Get employees for demo businesses
        backupData.employees = await prisma.employees.findMany({
          where: {
            primaryBusinessId: { in: demoBusinessIds }
          },
          include: {
            job_titles: true,
            compensation_types: true,
            businesses: true,
            employee_contracts_employee_contracts_employeeIdToemployees: true,
            employee_business_assignments: true
          }
        });

        // Get business memberships for demo businesses
        backupData.businessMemberships = await prisma.businessMemberships.findMany({
          where: {
            businessId: { in: demoBusinessIds }
          },
          include: {
            users: true,
            businesses: true,
            permission_templates: true
          }
        });

        // Get business-specific data for demo businesses
        backupData.businessCategories = await prisma.businessCategories.findMany({
          where: {
            OR: [
              { businessId: { in: demoBusinessIds } },
              { businessId: null, businessType: { in: demoBusinesses.map((b: any) => b.type) } }
            ]
          }
        });

        backupData.businessProducts = await prisma.businessProducts.findMany({
          where: { businessId: { in: demoBusinessIds } }
        });

        backupData.productVariants = await prisma.productVariants.findMany({
          where: {
            business_products: {
              businessId: { in: demoBusinessIds }
            }
          }
        });

        backupData.businessStockMovements = await prisma.businessStockMovements.findMany({
          where: { businessId: { in: demoBusinessIds } }
        });

        backupData.businessSuppliers = await prisma.businessSuppliers.findMany({
          where: {
            OR: [
              { businessId: { in: demoBusinessIds } },
              { businessType: { in: demoBusinesses.map((b: any) => b.type) } }
            ]
          }
        });

        backupData.businessCustomers = await prisma.businessCustomers.findMany({
          where: { businessId: { in: demoBusinessIds } }
        });

        // Reference data
        backupData.jobTitles = await prisma.jobTitles.findMany();
        backupData.compensationTypes = await prisma.compensationTypes.findMany();
        backupData.benefit_types = await prisma.benefitTypes.findMany();
        backupData.idFormatTemplates = await prisma.idFormatTemplates.findMany();
        backupData.driverLicenseTemplates = await prisma.driverLicenseTemplates.findMany();
        backupData.permissionTemplates = await prisma.permissionTemplates.findMany();
        break;

      case 'users':
        // Users and permissions only
        const usersBusinessFilter = businessId ? { id: businessId } : (includeDemoData ? {} : { isDemo: false });
        
        if (businessId) {
          // If specific business, get only users who are members
          backupData.users = await prisma.users.findMany({
            where: {
              business_memberships: {
                some: {
                  businessId: businessId
                }
              }
            },
            include: {
              business_memberships: {
                where: { businessId: businessId },
                include: {
                  businesses: true,
                  permission_templates: true
                }
              }
            }
          });

          backupData.business_memberships = await prisma.businessMemberships.findMany({
            where: { businessId: businessId },
            include: {
              users: true,
              businesses: true,
              permission_templates: true
            }
          });
        } else {
          // All users and memberships
          backupData.users = await prisma.users.findMany({
            include: {
              business_memberships: {
                include: {
                  businesses: true,
                  permission_templates: true
                }
              }
            }
          });

          backupData.business_memberships = await prisma.businessMemberships.findMany({
            include: {
              users: true,
              businesses: true,
              permission_templates: true
            }
          });
        }

        backupData.permissionTemplates = await prisma.permissionTemplates.findMany();
        break;

      case 'business-data':
        // Business information and settings (excluding demo by default)
        const businessDataFilter = businessId 
          ? { id: businessId }
          : (includeDemoData ? {} : { isDemo: false });
        
        backupData.businesses = await prisma.businesses.findMany({
          where: businessDataFilter,
          include: {
            business_memberships: true,
            other_businesses: true
          }
        });

        const businessDataIds = backupData.businesses.map((b: any) => b.id);

        backupData.business_memberships = await prisma.businessMemberships.findMany({
          where: {
            businessId: { in: businessDataIds }
          },
          include: {
            users: {
              select: { id: true, name: true, email: true }
            },
            businesses: true,
            permission_templates: true
          }
        });

        // Business products and categories (only for selected/non-demo businesses)
        backupData.businessCategories = await prisma.businessCategories.findMany({
          where: businessId 
            ? { businessId: businessId }
            : (includeDemoData ? {} : {
                OR: [
                  { businessId: { in: businessDataIds } },
                  { businessId: null }
                ]
              })
        });
        backupData.businessBrands = await prisma.businessBrands.findMany({
          where: {
            businessId: { in: businessDataIds }
          }
        });
        backupData.businessProducts = await prisma.businessProducts.findMany({
          where: businessId
            ? { businessId: businessId }
            : (includeDemoData ? {} : {
                OR: [
                  { businessId: { in: businessDataIds } },
                  { businessId: null }
                ]
              })
        });
        backupData.businessCustomers = await prisma.businessCustomers.findMany({
          where: {
            businessId: { in: businessDataIds }
          }
        });
        backupData.businessSuppliers = await prisma.businessSuppliers.findMany({
          where: includeDemoData ? {} : {
            OR: [
              { businessId: { in: businessDataIds } },
              { businessId: null }
            ]
          }
        });
        break;

      case 'employees':
        // Employee data (with optional business filter)
        const employeeBusinessFilter = businessId 
          ? { primaryBusinessId: businessId }
          : (includeDemoData ? {} : {
              businesses: {
                isDemo: false
              }
            });
        
        backupData.employees = await prisma.employees.findMany({
          where: employeeBusinessFilter,
          include: {
            job_titles: true,
            compensation_types: true,
            businesses: true,
            employee_contracts_employee_contracts_employeeIdToemployees: true,
            employee_business_assignments: true,
            employee_benefits: true,
            employee_attendance: true
          }
        });

        const employeeIds = backupData.employees.map((e: any) => e.id);

        backupData.employeeContracts = await prisma.employeeContracts.findMany({
          where: businessId
            ? { primaryBusinessId: businessId }
            : (includeDemoData ? {} : {
                businesses_employee_contracts_primaryBusinessIdTobusinesses: {
                  isDemo: false
                }
              }),
          include: {
            employees_employee_contracts_employeeIdToemployees: true,
            businesses_employee_contracts_primaryBusinessIdTobusinesses: true,
            job_titles: true,
            compensation_types: true,
            contract_benefits: true
          }
        });

        backupData.employeeBusinessAssignments = await prisma.employeeBusinessAssignments.findMany({
          where: { employeeId: { in: employeeIds } }
        });
        backupData.employeeBenefits = await prisma.employeeBenefits.findMany({
          where: { employeeId: { in: employeeIds } }
        });
        backupData.employeeAttendance = await prisma.employeeAttendance.findMany({
          where: { employeeId: { in: employeeIds } }
        });
        backupData.disciplinaryActions = await prisma.disciplinaryActions.findMany({
          where: { employeeId: { in: employeeIds } }
        });
        break;

      case 'reference-data':
        // Reference data only
        backupData.jobTitles = await prisma.jobTitles.findMany();
        backupData.compensationTypes = await prisma.compensationTypes.findMany();
        backupData.benefit_types = await prisma.benefitTypes.findMany();
        backupData.idFormatTemplates = await prisma.idFormatTemplates.findMany();
        backupData.driverLicenseTemplates = await prisma.driverLicenseTemplates.findMany();
        backupData.permissionTemplates = await prisma.permissionTemplates.findMany();
        break;

      default:
        return NextResponse.json({ error: 'Invalid backup type' }, { status: 400 });
    }

    // Generate filename with service name prefix and full timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    
    // Build descriptive filename
    let filenameParts = ['MultiBusinessSyncService-backup', backupType];
    
    // Add flags to filename for clarity
    if (backupType === 'full') {
      if (!includeBusinessData) {
        filenameParts.push('definitions-only');
      }
      if (includeDemoData) {
        filenameParts.push('with-demos');
      }
    }
    
    if (businessId) {
      filenameParts.push('single-business');
    }
    
    filenameParts.push(timestamp);
    const filename = `${filenameParts.join('_')}.json`;

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
              await tx.jobTitles.upsert({
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
              await tx.compensationTypes.upsert({
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

        if (backupData.benefit_types) {
          for (const benefitType of backupData.benefit_types) {
            try {
              await tx.benefitTypes.upsert({
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
              await tx.businesses.upsert({
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
              await tx.users.upsert({
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
        if (backupData.business_memberships) {
          for (const membership of backupData.business_memberships) {
            try {
              await tx.businessMemberships.upsert({
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
            id: randomBytes(12).toString('hex'),
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
              results.restored.business_memberships++;
            } catch (error) {
              results.errors.push(`Business Membership ${membership.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        // Restore employees
        if (backupData.employees) {
          for (const employee of backupData.employees) {
            try {
              await tx.employees.upsert({
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
              await tx.auditLogs.create({
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