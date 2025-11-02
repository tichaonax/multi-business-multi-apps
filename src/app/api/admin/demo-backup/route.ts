import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET - Backup demo businesses
 * Query params:
 * - businessId: specific demo business ID (optional, if omitted backs up all demo businesses)
 * - includeDemoData: include demo-specific data (default: true)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.users?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    const includeDemoData = searchParams.get('includeDemoData') !== 'false';

    // Build query for demo businesses
    const businessFilter: any = {
      isDemo: true,
      isActive: true
    };

    if (businessId) {
      businessFilter.id = businessId;
    }

    // Fetch demo businesses
    const demoBusinesses = await prisma.businesses.findMany({
      where: businessFilter,
      include: {
        business_memberships: {
          include: {
            users: {
              select: {
                id: true,
                email: true,
                name: true,
                role: true
              }
            }
          }
        }
      }
    });

    if (demoBusinesses.length === 0) {
      return NextResponse.json({ error: 'No demo businesses found' }, { status: 404 });
    }

    const demoBusinessIds = demoBusinesses.map(b => b.id);

    const backupData: any = {
      metadata: {
        backupType: 'demo-business',
        timestamp: new Date().toISOString(),
        version: '1.0',
        source: 'multi-business-multi-apps',
        businessCount: demoBusinesses.length,
        businessIds: demoBusinessIds,
        includeDemoData
      },
      businesses: demoBusinesses
    };

    if (includeDemoData) {
      // Backup all data associated with demo businesses
      
      // Products and Inventory
      backupData.businessProducts = await prisma.businessProducts.findMany({
        where: {
          OR: [
            { businessId: { in: demoBusinessIds } },
            { businessId: null } // Include shared products
          ]
        },
        include: {
          products: true,
          product_variants: true,
          businesses: true
        }
      });

      backupData.productVariants = await prisma.productVariants.findMany({
        where: {
          businessProduct: {
            businessId: { in: demoBusinessIds }
          }
        }
      });

      backupData.stockMovements = await prisma.stockMovements.findMany({
        where: {
          variant: {
            businessProduct: {
              businessId: { in: demoBusinessIds }
            }
          }
        }
      });

      // Categories (demo-specific only)
      backupData.businessCategories = await prisma.businessCategories.findMany({
        where: {
          businessId: { in: demoBusinessIds }
        },
        include: {
          businesses: true
        }
      });

      // Suppliers (demo-specific only)
      backupData.businessSuppliers = await prisma.businessSuppliers.findMany({
        where: {
          businessId: { in: demoBusinessIds }
        },
        include: {
          businesses: true
        }
      });

      // Brands
      backupData.businessBrands = await prisma.businessBrands.findMany({
        where: {
          businessId: { in: demoBusinessIds }
        }
      });

      // Customers
      backupData.businessCustomers = await prisma.businessCustomers.findMany({
        where: {
          businessId: { in: demoBusinessIds }
        }
      });

      // Employees
      backupData.employees = await prisma.employees.findMany({
        where: {
          primaryBusinessId: { in: demoBusinessIds }
        },
        include: {
          job_titles: true,
          compensation_types: true,
          employee_business_assignments: true,
          employee_benefits: true,
          employee_attendance: true
        }
      });

      // Employee Contracts
      backupData.employeeContracts = await prisma.employeeContracts.findMany({
        where: {
          primaryBusinessId: { in: demoBusinessIds }
        },
        include: {
          contract_benefits: true
        }
      });

      // Payroll Periods
      backupData.payrollPeriods = await prisma.payrollPeriods.findMany({
        where: {
          businessId: { in: demoBusinessIds }
        }
      });

      // Payroll Records
      backupData.payrollRecords = await prisma.payrollRecords.findMany({
        where: {
          employee: {
            primaryBusinessId: { in: demoBusinessIds }
          }
        }
      });

      // Sales Orders (if applicable)
      backupData.salesOrders = await prisma.salesOrders.findMany({
        where: {
          businessId: { in: demoBusinessIds }
        },
        include: {
          sales_order_items: true
        }
      });

      // Sync Nodes (demo business sync configuration)
      backupData.syncNodes = await prisma.syncNodes.findMany({
        where: {
          businessId: { in: demoBusinessIds }
        }
      });
    }

    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const businessName = demoBusinesses.length === 1 
      ? demoBusinesses[0].name.replace(/[^a-zA-Z0-9]/g, '_') 
      : 'all-demo-businesses';
    const filename = `demo-backup_${businessName}_${timestamp}.json`;

    const response = new NextResponse(JSON.stringify(backupData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

    return response;

  } catch (error) {
    console.error('Demo backup creation failed:', error);
    return NextResponse.json({
      error: 'Demo backup creation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * POST - Restore demo businesses from backup
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.users?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const backupData = await request.json();

    if (!backupData.metadata || backupData.metadata.backupType !== 'demo-business') {
      return NextResponse.json({
        error: 'Invalid backup file - not a demo business backup'
      }, { status: 400 });
    }

    const results = {
      restored: {
        businesses: 0,
        products: 0,
        variants: 0,
        stockMovements: 0,
        categories: 0,
        suppliers: 0,
        brands: 0,
        customers: 0,
        employees: 0,
        contracts: 0,
        payrollRecords: 0,
        salesOrders: 0,
        syncNodes: 0
      },
      errors: [] as string[]
    };

    // Use transaction for data integrity
    await prisma.$transaction(async (tx) => {
      // Restore businesses first
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
                isDemo: true, // Ensure it's marked as demo
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
                isDemo: true, // Ensure it's marked as demo
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

      // Restore categories
      if (backupData.businessCategories) {
        for (const category of backupData.businessCategories) {
          try {
            await tx.businessCategories.upsert({
              where: { id: category.id },
              update: {
                name: category.name,
                emoji: category.emoji,
                description: category.description,
                businessId: category.businessId,
                businessType: category.businessType,
                parentId: category.parentId,
                isActive: category.isActive,
                displayOrder: category.displayOrder
              },
              create: {
                id: category.id,
                name: category.name,
                emoji: category.emoji,
                description: category.description,
                businessId: category.businessId,
                businessType: category.businessType,
                parentId: category.parentId,
                isActive: category.isActive,
                displayOrder: category.displayOrder,
                createdAt: new Date(category.createdAt),
                updatedAt: new Date(category.updatedAt)
              }
            });
            results.restored.categories++;
          } catch (error) {
            results.errors.push(`Category ${category.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      }

      // Restore suppliers
      if (backupData.businessSuppliers) {
        for (const supplier of backupData.businessSuppliers) {
          try {
            await tx.businessSuppliers.upsert({
              where: { id: supplier.id },
              update: {
                name: supplier.name,
                contactPerson: supplier.contactPerson,
                email: supplier.email,
                phone: supplier.phone,
                address: supplier.address,
                businessId: supplier.businessId,
                businessType: supplier.businessType,
                isActive: supplier.isActive
              },
              create: {
                id: supplier.id,
                name: supplier.name,
                contactPerson: supplier.contactPerson,
                email: supplier.email,
                phone: supplier.phone,
                address: supplier.address,
                businessId: supplier.businessId,
                businessType: supplier.businessType,
                isActive: supplier.isActive,
                createdAt: new Date(supplier.createdAt),
                updatedAt: new Date(supplier.updatedAt)
              }
            });
            results.restored.suppliers++;
          } catch (error) {
            results.errors.push(`Supplier ${supplier.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      }

      // Restore brands
      if (backupData.businessBrands) {
        for (const brand of backupData.businessBrands) {
          try {
            await tx.businessBrands.upsert({
              where: { id: brand.id },
              update: {
                name: brand.name,
                description: brand.description,
                businessId: brand.businessId,
                isActive: brand.isActive
              },
              create: {
                id: brand.id,
                name: brand.name,
                description: brand.description,
                businessId: brand.businessId,
                isActive: brand.isActive,
                createdAt: new Date(brand.createdAt),
                updatedAt: new Date(brand.updatedAt)
              }
            });
            results.restored.brands++;
          } catch (error) {
            results.errors.push(`Brand ${brand.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      }

      // Restore products
      if (backupData.businessProducts) {
        for (const product of backupData.businessProducts) {
          try {
            await tx.businessProducts.upsert({
              where: { id: product.id },
              update: {
                name: product.name,
                description: product.description,
                sku: product.sku,
                barcode: product.barcode,
                businessId: product.businessId,
                productId: product.productId,
                categoryId: product.categoryId,
                brandId: product.brandId,
                supplierId: product.supplierId,
                attributes: product.attributes,
                isActive: product.isActive
              },
              create: {
                id: product.id,
                name: product.name,
                description: product.description,
                sku: product.sku,
                barcode: product.barcode,
                businessId: product.businessId,
                productId: product.productId,
                categoryId: product.categoryId,
                brandId: product.brandId,
                supplierId: product.supplierId,
                attributes: product.attributes,
                isActive: product.isActive,
                createdAt: new Date(product.createdAt),
                updatedAt: new Date(product.updatedAt)
              }
            });
            results.restored.products++;
          } catch (error) {
            results.errors.push(`Product ${product.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      }

      // Restore variants
      if (backupData.productVariants) {
        for (const variant of backupData.productVariants) {
          try {
            await tx.productVariants.upsert({
              where: { id: variant.id },
              update: {
                businessProductId: variant.businessProductId,
                sku: variant.sku,
                barcode: variant.barcode,
                size: variant.size,
                color: variant.color,
                attributes: variant.attributes,
                costPrice: variant.costPrice,
                sellingPrice: variant.sellingPrice,
                stockQuantity: variant.stockQuantity,
                reorderLevel: variant.reorderLevel,
                isActive: variant.isActive
              },
              create: {
                id: variant.id,
                businessProductId: variant.businessProductId,
                sku: variant.sku,
                barcode: variant.barcode,
                size: variant.size,
                color: variant.color,
                attributes: variant.attributes,
                costPrice: variant.costPrice,
                sellingPrice: variant.sellingPrice,
                stockQuantity: variant.stockQuantity,
                reorderLevel: variant.reorderLevel,
                isActive: variant.isActive,
                createdAt: new Date(variant.createdAt),
                updatedAt: new Date(variant.updatedAt)
              }
            });
            results.restored.variants++;
          } catch (error) {
            results.errors.push(`Variant ${variant.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      }

      // Restore stock movements
      if (backupData.stockMovements) {
        for (const movement of backupData.stockMovements) {
          try {
            await tx.stockMovements.create({
              data: {
                id: movement.id,
                variantId: movement.variantId,
                type: movement.type,
                quantity: movement.quantity,
                reference: movement.reference,
                notes: movement.notes,
                createdBy: movement.createdBy,
                createdAt: new Date(movement.createdAt),
                updatedAt: new Date(movement.updatedAt)
              }
            });
            results.restored.stockMovements++;
          } catch (error) {
            // Skip duplicate stock movements
            if (!error.message?.includes('Unique constraint')) {
              results.errors.push(`Stock Movement ${movement.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }
      }

      // Restore customers
      if (backupData.businessCustomers) {
        for (const customer of backupData.businessCustomers) {
          try {
            await tx.businessCustomers.upsert({
              where: { id: customer.id },
              update: {
                name: customer.name,
                email: customer.email,
                phone: customer.phone,
                address: customer.address,
                businessId: customer.businessId,
                isActive: customer.isActive
              },
              create: {
                id: customer.id,
                name: customer.name,
                email: customer.email,
                phone: customer.phone,
                address: customer.address,
                businessId: customer.businessId,
                isActive: customer.isActive,
                createdAt: new Date(customer.createdAt),
                updatedAt: new Date(customer.updatedAt)
              }
            });
            results.restored.customers++;
          } catch (error) {
            results.errors.push(`Customer ${customer.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
                primaryBusinessId: employee.primaryBusinessId,
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

      // Restore sync nodes
      if (backupData.syncNodes) {
        for (const node of backupData.syncNodes) {
          try {
            await tx.syncNodes.upsert({
              where: { id: node.id },
              update: {
                businessId: node.businessId,
                nodeUrl: node.nodeUrl,
                isActive: node.isActive,
                lastSyncAt: node.lastSyncAt ? new Date(node.lastSyncAt) : null
              },
              create: {
                id: node.id,
                businessId: node.businessId,
                nodeUrl: node.nodeUrl,
                isActive: node.isActive,
                lastSyncAt: node.lastSyncAt ? new Date(node.lastSyncAt) : null,
                createdAt: new Date(node.createdAt),
                updatedAt: new Date(node.updatedAt)
              }
            });
            results.restored.syncNodes++;
          } catch (error) {
            results.errors.push(`Sync Node ${node.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      }
    });

    return NextResponse.json({
      message: 'Demo business restore completed successfully',
      results
    });

  } catch (error) {
    console.error('Demo restore failed:', error);
    return NextResponse.json({
      error: 'Demo restore failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * DELETE - Delete demo business and all associated data
 * Query params:
 * - businessId: demo business ID to delete (required)
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.users?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');

    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 });
    }

    // Verify it's a demo business
    const business = await prisma.businesses.findUnique({
      where: { id: businessId }
    });

    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    if (!business.isDemo) {
      return NextResponse.json({ 
        error: 'Cannot delete non-demo business through this endpoint' 
      }, { status: 400 });
    }

    // Delete all associated data in transaction
    await prisma.$transaction(async (tx) => {
      // Delete in reverse dependency order
      await tx.stockMovements.deleteMany({
        where: {
          variant: {
            businessProduct: {
              businessId
            }
          }
        }
      });

      await tx.productVariants.deleteMany({
        where: {
          businessProduct: {
            businessId
          }
        }
      });

      await tx.businessProducts.deleteMany({
        where: { businessId }
      });

      await tx.businessCategories.deleteMany({
        where: { businessId }
      });

      await tx.businessSuppliers.deleteMany({
        where: { businessId }
      });

      await tx.businessBrands.deleteMany({
        where: { businessId }
      });

      await tx.businessCustomers.deleteMany({
        where: { businessId }
      });

      await tx.salesOrderItems.deleteMany({
        where: {
          sales_orders: {
            businessId
          }
        }
      });

      await tx.salesOrders.deleteMany({
        where: { businessId }
      });

      await tx.payrollRecords.deleteMany({
        where: {
          employee: {
            primaryBusinessId: businessId
          }
        }
      });

      await tx.payrollPeriods.deleteMany({
        where: { businessId }
      });

      await tx.employeeAttendance.deleteMany({
        where: {
          employees: {
            primaryBusinessId: businessId
          }
        }
      });

      await tx.employeeBenefits.deleteMany({
        where: {
          employees: {
            primaryBusinessId: businessId
          }
        }
      });

      await tx.employeeBusinessAssignments.deleteMany({
        where: { businessId }
      });

      await tx.contractBenefits.deleteMany({
        where: {
          employee_contracts: {
            primaryBusinessId: businessId
          }
        }
      });

      await tx.employeeContracts.deleteMany({
        where: { primaryBusinessId: businessId }
      });

      await tx.employees.deleteMany({
        where: { primaryBusinessId: businessId }
      });

      await tx.businessMemberships.deleteMany({
        where: { businessId }
      });

      await tx.syncNodes.deleteMany({
        where: { businessId }
      });

      await tx.businesses.delete({
        where: { id: businessId }
      });
    });

    return NextResponse.json({
      message: 'Demo business deleted successfully',
      businessId,
      businessName: business.name
    });

  } catch (error) {
    console.error('Demo business deletion failed:', error);
    return NextResponse.json({
      error: 'Demo business deletion failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
