import { NextRequest, NextResponse } from 'next/server';


import { prisma } from '@/lib/prisma';
import { getServerUser } from '@/lib/get-server-user'

/**
 * GET /api/business/[businessId]/sales-analytics
 * Comprehensive sales analytics for a business within a date range
 *
 * Query params:
 * - startDate: ISO date string (required)
 * - endDate: ISO date string (required)
 */

// Function to extract emoji from the beginning of a string
function extractEmoji(text: string): string | null {
  // Match common emoji patterns at the start of the string
  const emojiRegex = /^([\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1f926}-\u{1f937}]|[\u{10000}-\u{10FFFF}]|[\u{1f1f2}-\u{1f1f4}]|[\u{1f1e6}-\u{1f1ff}]|[\u{1f600}-\u{1f64f}]|[\u{1f680}-\u{1f6ff}]|[\u{2600}-\u{26ff}]|[\u{2700}-\u{27bf}]|[\u{1f1e6}-\u{1f1ff}]|[\u{1f191}-\u{1f251}]|[\u{1f004}]|[\u{1f0cf}]|[\u{1f170}-\u{1f171}]|[\u{1f17e}-\u{1f17f}]|[\u{1f18e}]|[\u{3030}]|[\u{2b50}]|[\u{2b55}]|[\u{2934}-\u{2935}]|[\u{2b05}-\u{2b07}]|[\u{2b1b}-\u{2b1c}]|[\u{3297}]|[\u{3299}]|[\u{303d}]|[\u{00a9}]|[\u{00ae}]|[\u{2122}]|[\u{23f3}]|[\u{24c2}]|[\u{23e9}-\u{23ef}]|[\u{25b6}]|[\u{23f8}-\u{23fa}])/u;
  const match = text.match(emojiRegex);
  return match ? match[0] : null;
}
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { businessId } = await params;
    const { searchParams } = new URL(request.url);
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');

    const timezone = searchParams.get('timezone') || Intl.DateTimeFormat().resolvedOptions().timeZone;

    if (!startDateStr || !endDateStr) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      );
    }

    // Parse dates with timezone awareness (same approach as /api/universal/orders)
    // startDateStr/endDateStr are in YYYY-MM-DD format (local dates)
    const [sy, sm, sd] = startDateStr.split('-').map(Number);
    const [ey, em, ed] = endDateStr.split('-').map(Number);

    // Convert local midnight to UTC by calculating timezone offset
    const startMidnightUTC = Date.UTC(sy, sm - 1, sd, 0, 0, 0);
    const startTzOffset = new Date(new Date(startMidnightUTC).toLocaleString('en-US', { timeZone: timezone })).getTime()
      - new Date(new Date(startMidnightUTC).toLocaleString('en-US', { timeZone: 'UTC' })).getTime();
    const startDate = new Date(startMidnightUTC - startTzOffset);

    const endMidnightUTC = Date.UTC(ey, em - 1, ed, 0, 0, 0);
    const endTzOffset = new Date(new Date(endMidnightUTC).toLocaleString('en-US', { timeZone: timezone })).getTime()
      - new Date(new Date(endMidnightUTC).toLocaleString('en-US', { timeZone: 'UTC' })).getTime();
    const endDate = new Date(endMidnightUTC - endTzOffset + 24 * 60 * 60 * 1000 - 1); // end of day in timezone

    // Fetch completed orders for the period with relations
    const orders = await prisma.businessOrders.findMany({
      where: {
        businessId: businessId,
        status: 'COMPLETED',
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        business_order_items: {
          include: {
            product_variants: {
              include: {
                business_products: {
                  include: {
                    business_categories: {
                      select: {
                        id: true,
                        name: true,
                        emoji: true,
                        parentId: true,
                        business_categories: {
                          select: {
                            name: true,
                            emoji: true,
                            parentId: true,
                            business_categories: {
                              select: {
                                name: true,
                                emoji: true,
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        employees: {
          select: {
            id: true,
            fullName: true,
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // Filter out EXPENSE_ACCOUNT (meal program subsidy) orders — these are not real cash income
    const regularOrders = orders.filter(order => order.paymentMethod !== 'EXPENSE_ACCOUNT')

    // Calculate summary metrics
    const totalSales = regularOrders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);
    const totalTax = regularOrders.reduce((sum, order) => sum + Number(order.taxAmount || 0), 0);
    const totalOrders = regularOrders.length;
    const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

    // Aggregate by product (units and revenue)
    const productStats: Record<string, {
      productId: string;
      productName: string;
      emoji: string;
      unitsSold: number;
      revenue: number;
    }> = {};

    // Aggregate by category
    const categoryStats: Record<string, {
      categoryId: string;
      categoryName: string;
      categoryPath: string;
      emoji: string;
      revenue: number;
    }> = {};

    // Aggregate by sales rep
    const salesRepStats: Record<string, {
      employeeId: string;
      employeeName: string;
      revenue: number;
      orderCount: number;
    }> = {};

    // Aggregate by date
    const dailySalesMap: Record<string, {
      date: string;
      sales: number;
      orderCount: number;
    }> = {};

    // Process each order
    regularOrders.forEach(order => {
      const orderDate = new Date(order.createdAt).toISOString().split('T')[0];
      const orderRevenue = Number(order.totalAmount || 0);

      // Daily sales
      if (!dailySalesMap[orderDate]) {
        dailySalesMap[orderDate] = {
          date: orderDate,
          sales: 0,
          orderCount: 0
        };
      }
      dailySalesMap[orderDate].sales += orderRevenue;
      dailySalesMap[orderDate].orderCount += 1;

      // Sales rep
      const employeeId = order.employeeId || 'unknown';
      const employeeName = order.employees?.fullName || 'Other';
      if (!salesRepStats[employeeId]) {
        salesRepStats[employeeId] = {
          employeeId,
          employeeName,
          revenue: 0,
          orderCount: 0
        };
      }
      salesRepStats[employeeId].revenue += orderRevenue;
      salesRepStats[employeeId].orderCount += 1;

      // Process order items
      order.business_order_items.forEach(item => {
        const quantity = Number(item.quantity || 1);
        const itemRevenue = Number(item.totalPrice || 0);
        const product = item.product_variants?.business_products;

        console.log(`Processing order item:`, {
          orderId: order.id,
          itemId: item.id,
          productVariantId: item.productVariantId,
          hasVariant: !!item.product_variants,
          hasProduct: !!product,
          hasCategory: !!product?.business_categories,
          quantity,
          itemRevenue
        });

        if (product) {
          const productId = product.id;
          const productName = product.name;
          const category = product.business_categories;

          // Get emoji from product name first, then category, then default
          let emoji = extractEmoji(productName) || category?.emoji || '📦';

          // Product stats
          if (!productStats[productId]) {
            productStats[productId] = {
              productId,
              productName,
              emoji,
              unitsSold: 0,
              revenue: 0
            };
          }
          productStats[productId].unitsSold += quantity;
          productStats[productId].revenue += itemRevenue;

          // Category stats
          if (category) {
            const categoryId = category.id;

            // Build category path (e.g., "Ladies > Dresses")
            // Note: Prisma self-relation is named "business_categories" (the parent), not "parent"
            let categoryPath = category.name;
            let currentEmoji = extractEmoji(category.name) || category.emoji || '📦';

            const parentCat = (category as any).business_categories;
            if (parentCat) {
              const grandParentCat = parentCat.business_categories;
              if (grandParentCat) {
                categoryPath = `${grandParentCat.name} > ${parentCat.name} > ${category.name}`;
                currentEmoji = extractEmoji(grandParentCat.name) || extractEmoji(parentCat.name) || extractEmoji(category.name) || grandParentCat.emoji || parentCat.emoji || category.emoji || '📦';
              } else {
                categoryPath = `${parentCat.name} > ${category.name}`;
                currentEmoji = extractEmoji(parentCat.name) || extractEmoji(category.name) || parentCat.emoji || category.emoji || '📦';
              }
            }

            if (!categoryStats[categoryId]) {
              categoryStats[categoryId] = {
                categoryId,
                categoryName: category.name,
                categoryPath,
                emoji: currentEmoji,
                revenue: 0
              };
            }
            categoryStats[categoryId].revenue += itemRevenue;
          }
        } else if (item.product_variants) {
          // Fallback: if product not linked, use variant data
          const variant = item.product_variants;
          const productId = variant.id;
          const productName = variant.name || `Variant ${variant.id}`;
          let emoji = extractEmoji(productName) || '📦';

          console.log(`Using variant fallback for product: ${productName}`);

          if (!productStats[productId]) {
            productStats[productId] = {
              productId,
              productName,
              emoji,
              unitsSold: 0,
              revenue: 0
            };
          }
          productStats[productId].unitsSold += quantity;
          productStats[productId].revenue += itemRevenue;
        } else if (item.attributes?.productName) {
          // Fallback: use attributes if no variant linked
          const productId = item.attributes.productId || `attr-${item.id}`;
          const productName = item.attributes.productName;
          let emoji = extractEmoji(productName) || '📦';

          console.log(`Using attributes fallback for product: ${productName}`);

          if (!productStats[productId]) {
            productStats[productId] = {
              productId,
              productName,
              emoji,
              unitsSold: 0,
              revenue: 0
            };
          }
          productStats[productId].unitsSold += quantity;
          productStats[productId].revenue += itemRevenue;
        } else {
          console.log(`No product or variant found for order item ${item.id}`);
        }
      });
    });

    // ── Batch-resolve categories for items that had no productVariantId link ──
    // (combos, WiFi tokens, R710 tokens, and any item where variant lookup failed)
    // The restaurant orders API stores productId in item.attributes.productId.
    const noVariantProductIds = new Set<string>();
    regularOrders.forEach(order => {
      order.business_order_items.forEach(item => {
        if (!item.product_variants && item.attributes && (item.attributes as any).productId) {
          noVariantProductIds.add((item.attributes as any).productId as string);
        }
      });
    });

    if (noVariantProductIds.size > 0) {
      const noVariantProducts = await prisma.businessProducts.findMany({
        where: { id: { in: Array.from(noVariantProductIds) } },
        include: {
          business_categories: {
            select: {
              id: true,
              name: true,
              emoji: true,
              parentId: true,
              business_categories: {
                select: {
                  name: true,
                  emoji: true,
                  parentId: true,
                  business_categories: {
                    select: { name: true, emoji: true }
                  }
                }
              }
            }
          }
        }
      });

      const noVariantProductMap = new Map(noVariantProducts.map(p => [p.id, p]));

      // Second pass: fill in category stats for no-variant items
      regularOrders.forEach(order => {
        order.business_order_items.forEach(item => {
          if (!item.product_variants && item.attributes) {
            const attrs = item.attributes as any;
            const productId = attrs.productId as string | undefined;
            if (!productId) return;

            const product = noVariantProductMap.get(productId);
            if (!product) return;

            const itemRevenue = Number(item.totalPrice || 0);
            const category = product.business_categories;

            // Product stats (if not already counted via variant path)
            if (!productStats[productId]) {
              const emoji = extractEmoji(product.name) || category?.emoji || '📦';
              productStats[productId] = {
                productId,
                productName: product.name,
                emoji,
                unitsSold: 0,
                revenue: 0
              };
            }
            productStats[productId].unitsSold += Number(item.quantity || 1);
            productStats[productId].revenue += itemRevenue;

            // Category stats
            if (category) {
              const categoryId = category.id;
              let categoryPath = category.name;
              let currentEmoji = extractEmoji(category.name) || category.emoji || '📦';

              const parentCat = (category as any).business_categories;
              if (parentCat) {
                const grandParentCat = parentCat.business_categories;
                if (grandParentCat) {
                  categoryPath = `${grandParentCat.name} > ${parentCat.name} > ${category.name}`;
                  currentEmoji = extractEmoji(grandParentCat.name) || extractEmoji(parentCat.name) || extractEmoji(category.name) || grandParentCat.emoji || parentCat.emoji || category.emoji || '📦';
                } else {
                  categoryPath = `${parentCat.name} > ${category.name}`;
                  currentEmoji = extractEmoji(parentCat.name) || extractEmoji(category.name) || parentCat.emoji || category.emoji || '📦';
                }
              }

              if (!categoryStats[categoryId]) {
                categoryStats[categoryId] = {
                  categoryId,
                  categoryName: category.name,
                  categoryPath,
                  emoji: currentEmoji,
                  revenue: 0
                };
              }
              categoryStats[categoryId].revenue += itemRevenue;
            }
          }
        });
      });
    }

    // Sort and get top products by units
    const topProductsByUnits = Object.values(productStats)
      .sort((a, b) => b.unitsSold - a.unitsSold)
      .slice(0, 3)
      .map(p => ({
        productId: p.productId,
        productName: p.productName,
        emoji: p.emoji,
        unitsSold: p.unitsSold
      }));

    // Sort and get top products by revenue
    const topProductsByRevenue = Object.values(productStats)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 3)
      .map(p => ({
        productId: p.productId,
        productName: p.productName,
        emoji: p.emoji,
        revenue: Number(p.revenue.toFixed(2))
      }));

    // Sort and get top categories
    const topCategories = Object.values(categoryStats)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 3)
      .map(c => ({
        categoryId: c.categoryId,
        categoryName: c.categoryName,
        categoryPath: c.categoryPath,
        emoji: c.emoji,
        revenue: Number(c.revenue.toFixed(2))
      }));

    // Sort and get top sales reps
    const topSalesReps = Object.values(salesRepStats)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 3)
      .map(s => ({
        employeeId: s.employeeId,
        employeeName: s.employeeName,
        revenue: Number(s.revenue.toFixed(2)),
        orderCount: s.orderCount
      }));

    // Daily sales array (sorted by date)
    const dailySales = Object.values(dailySalesMap)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(d => ({
        date: d.date,
        sales: Number(d.sales.toFixed(2)),
        orderCount: d.orderCount
      }));

    // Product breakdown (top 10 for chart)
    const productBreakdown = Object.values(productStats)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
      .map(p => ({
        productName: p.productName,
        emoji: p.emoji,
        revenue: Number(p.revenue.toFixed(2)),
        percentage: totalSales > 0 ? Number(((p.revenue / totalSales) * 100).toFixed(1)) : 0
      }));

    // Category breakdown (top 10 for chart)
    const categoryBreakdown = Object.values(categoryStats)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
      .map(c => ({
        categoryName: c.categoryName,
        categoryPath: c.categoryPath,
        emoji: c.emoji,
        revenue: Number(c.revenue.toFixed(2)),
        percentage: totalSales > 0 ? Number(((c.revenue / totalSales) * 100).toFixed(1)) : 0
      }));

    // Sales rep breakdown (all reps for pie chart)
    const salesRepBreakdown = Object.values(salesRepStats)
      .sort((a, b) => b.revenue - a.revenue)
      .map(s => ({
        employeeName: s.employeeName,
        revenue: Number(s.revenue.toFixed(2)),
        percentage: totalSales > 0 ? Number(((s.revenue / totalSales) * 100).toFixed(1)) : 0
      }));

    return NextResponse.json({
      success: true,
      summary: {
        totalSales: Number(totalSales.toFixed(2)),
        totalTax: Number(totalTax.toFixed(2)),
        averageOrderValue: Number(averageOrderValue.toFixed(2)),
        totalOrders
      },
      topProducts: {
        byUnits: topProductsByUnits,
        byRevenue: topProductsByRevenue
      },
      topCategories,
      topSalesReps,
      dailySales,
      productBreakdown,
      categoryBreakdown,
      salesRepBreakdown,
      debug: {
        orderCount: regularOrders.length,
        expenseAccountOrdersExcluded: orders.length - regularOrders.length,
        itemCount: regularOrders.reduce((sum, o) => sum + o.business_order_items.length, 0),
        itemsWithVariants: regularOrders.reduce((sum, o) => sum + o.business_order_items.filter(i => i.product_variants).length, 0),
        itemsWithProducts: regularOrders.reduce((sum, o) => sum + o.business_order_items.filter(i => i.product_variants?.business_products).length, 0),
        itemsWithCategories: regularOrders.reduce((sum, o) => sum + o.business_order_items.filter(i => i.product_variants?.business_products?.business_categories).length, 0),
        itemsWithAttributes: regularOrders.reduce((sum, o) => sum + o.business_order_items.filter(i => i.attributes?.productName).length, 0)
      }
    });

  } catch (error) {
    console.error('Error fetching sales analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sales analytics' },
      { status: 500 }
    );
  }
}
