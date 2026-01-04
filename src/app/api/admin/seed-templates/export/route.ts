import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasUserPermission } from '@/lib/permission-utils'
import type {
  ExportTemplateOptions,
  ExportTemplateResult,
  SeedDataTemplate,
  ProductSeedItem,
  CategorySeedItem,
  SubcategorySeedItem,
  ExpenseAccountSeedItem,
  WiFiIntegrationSeedItem,
  WiFiTokenConfigSeedItem,
  R710DeviceSeedItem,
  R710WlanSeedItem,
  R710TokenConfigSeedItem,
  PayrollAccountSeedItem
} from '@/types/seed-templates'

/**
 * POST /api/admin/seed-templates/export
 * 
 * Exports products from a business into a seed template format
 * 
 * Body: ExportTemplateOptions
 * Returns: ExportTemplateResult with template data
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const currentUser = session?.user as any
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check permission (admins have full access)
    const isAdmin = currentUser?.role === 'admin' || currentUser?.isAdmin
    if (!isAdmin && !hasUserPermission(session.user, 'canExportSeedTemplates')) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const options: ExportTemplateOptions = await req.json()

    // Validate required fields
    if (!options.sourceBusinessId || !options.name || !options.version) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: sourceBusinessId, name, version' 
        },
        { status: 400 }
      )
    }

    // Verify business exists and get its type
    const business = await prisma.businesses.findUnique({
      where: { id: options.sourceBusinessId },
      select: { 
        id: true, 
        name: true, 
        type: true 
      }
    })

    if (!business) {
      return NextResponse.json(
        { success: false, error: 'Business not found' },
        { status: 404 }
      )
    }

    // Fetch products with filters
    const whereClause: any = {
      businessId: options.sourceBusinessId
    }

    if (options.onlyActive !== false) {
      whereClause.isActive = true
    }

    if (options.updatedAfter) {
      whereClause.updatedAt = { gte: options.updatedAfter }
    }

    if (options.categoryFilter && options.categoryFilter.length > 0) {
      whereClause.category = {
        name: { in: options.categoryFilter }
      }
    }

    const products = await prisma.businessProducts.findMany({
      where: whereClause,
      include: {
        business_categories: {
          include: {
            domain: true
          }
        },
        inventory_subcategory: true,
        business_brands: true,
        product_variants: true
      },
      orderBy: [
        { business_categories: { name: 'asc' } },
        { name: 'asc' }
      ]
    })

    // Filter by SKU pattern if specified
    let filteredProducts = products
    if (options.excludeSkuPattern) {
      const pattern = new RegExp(options.excludeSkuPattern)
      filteredProducts = products.filter(p => !pattern.test(p.sku || ''))
    }

    // Transform products to seed format
    const productSeedItems: ProductSeedItem[] = filteredProducts.map(product => {
      const item: ProductSeedItem = {
        sku: product.sku || '',
        name: product.name,
        description: product.description || undefined,
        categoryName: product.business_categories.name,
        subcategoryName: product.inventory_subcategory?.name,
        domainId: product.business_categories.domainId || undefined,
        
        // Pricing (optionally zero out)
        basePrice: options.zeroPrices ? 0 : Number(product.basePrice),
        costPrice: product.costPrice ? (options.zeroPrices ? 0 : Number(product.costPrice)) : undefined,
        originalPrice: product.originalPrice ? Number(product.originalPrice) : undefined,
        discountPercent: product.discountPercent ? Number(product.discountPercent) : undefined,
        
        // Attributes
        attributes: product.attributes as Record<string, any> || undefined,
        
        // Brand
        brandName: product.business_brands?.name || undefined,
        
        // Business type specific fields
        ...(product.attributes && typeof product.attributes === 'object' ? product.attributes as any : {})
      }

      return item
    })

    // Get unique categories
    const uniqueCategories = Array.from(
      new Map(
        filteredProducts.map(p => [
          p.business_categories.id,
          p.business_categories
        ])
      ).values()
    )

    const categorySeedItems: CategorySeedItem[] = uniqueCategories.map(cat => ({
      name: cat.name,
      emoji: cat.emoji || undefined,
      color: cat.color || undefined,
      description: cat.description || undefined,
      domainId: cat.domainId || undefined,
      displayOrder: cat.displayOrder || undefined,
      businessType: cat.businessType
    }))

    // Get unique subcategories
    const uniqueSubcategories = Array.from(
      new Map(
        filteredProducts
          .filter(p => p.inventory_subcategory)
          .map(p => [
            p.inventory_subcategory!.id,
            {
              subcategory: p.inventory_subcategory!,
              categoryName: p.business_categories.name
            }
          ])
      ).values()
    )

    const subcategorySeedItems: SubcategorySeedItem[] = uniqueSubcategories.map(item => ({
      name: item.subcategory.name,
      categoryName: item.categoryName,
      emoji: item.subcategory.emoji || undefined,
      displayOrder: item.subcategory.displayOrder || undefined
    }))

    // Fetch expense accounts (system-wide, not business-specific)
    const expenseAccounts = await prisma.expenseAccounts.findMany({
      where: { isActive: true },
      orderBy: { accountName: 'asc' }
    })

    const expenseAccountSeedItems: ExpenseAccountSeedItem[] = expenseAccounts.map(account => ({
      accountNumber: account.accountNumber,
      accountName: account.accountName,
      description: account.description || undefined,
      initialBalance: Number(account.balance),
      lowBalanceThreshold: Number(account.lowBalanceThreshold),
      isActive: account.isActive
    }))

    // Fetch WiFi integrations (ESP32 Portal) for this business
    const wifiIntegrations = await prisma.portalIntegrations.findMany({
      where: { businessId: options.sourceBusinessId, isActive: true },
      include: { expense_accounts: true }
    })

    const wifiIntegrationSeedItems: WiFiIntegrationSeedItem[] = wifiIntegrations.map(integration => ({
      portalIpAddress: integration.portalIpAddress,
      portalPort: integration.portalPort,
      apiKey: integration.apiKey,
      isActive: integration.isActive,
      showTokensInPOS: integration.showTokensInPOS,
      expenseAccountNumber: integration.expense_accounts?.accountNumber
    }))

    // Fetch WiFi token configs (ESP32)
    const wifiTokenConfigs = await prisma.tokenConfigurations.findMany({
      where: { isActive: true },
      include: {
        business_token_menu_items: {
          where: { businessId: options.sourceBusinessId }
        }
      },
      orderBy: { displayOrder: 'asc' }
    })

    const wifiTokenConfigSeedItems: WiFiTokenConfigSeedItem[] = wifiTokenConfigs.map(config => ({
      name: config.name,
      description: config.description || undefined,
      durationMinutes: config.durationMinutes,
      bandwidthDownMb: config.bandwidthDownMb,
      bandwidthUpMb: config.bandwidthUpMb,
      basePrice: Number(config.basePrice),
      ssid: config.ssid || undefined,
      isActive: config.isActive,
      displayOrder: config.displayOrder,
      enabledForBusinesses: config.business_token_menu_items.length > 0
        ? config.business_token_menu_items.map(item => item.businessId)
        : undefined
    }))

    // Fetch R710 device registry for this business
    const r710Integrations = await prisma.r710BusinessIntegrations.findMany({
      where: { businessId: options.sourceBusinessId, isActive: true },
      include: { device_registry: true }
    })

    const r710DeviceSeedItems: R710DeviceSeedItem[] = r710Integrations.map(integration => ({
      ipAddress: integration.device_registry.ipAddress,
      adminUsername: integration.device_registry.adminUsername,
      firmwareVersion: integration.device_registry.firmwareVersion || undefined,
      model: integration.device_registry.model,
      description: integration.device_registry.description || undefined,
      isActive: integration.device_registry.isActive
    }))

    // Fetch R710 WLANs for this business
    const r710Wlans = await prisma.r710Wlans.findMany({
      where: { businessId: options.sourceBusinessId, isActive: true },
      include: { device_registry: true }
    })

    const r710WlanSeedItems: R710WlanSeedItem[] = r710Wlans.map(wlan => ({
      wlanId: wlan.wlanId,
      guestServiceId: wlan.guestServiceId,
      ssid: wlan.ssid,
      logoType: wlan.logoType,
      title: wlan.title,
      validDays: wlan.validDays,
      enableFriendlyKey: wlan.enableFriendlyKey,
      enableZeroIt: wlan.enableZeroIt,
      isActive: wlan.isActive,
      deviceIpAddress: wlan.device_registry.ipAddress
    }))

    // Fetch R710 token configs for this business
    const r710TokenConfigs = await prisma.r710TokenConfigs.findMany({
      where: { businessId: options.sourceBusinessId, isActive: true },
      include: { r710_wlans: { include: { device_registry: true } } },
      orderBy: { displayOrder: 'asc' }
    })

    const r710TokenConfigSeedItems: R710TokenConfigSeedItem[] = r710TokenConfigs.map(config => ({
      name: config.name,
      description: config.description || undefined,
      durationValue: config.durationValue,
      durationUnit: config.durationUnit,
      deviceLimit: config.deviceLimit,
      basePrice: Number(config.basePrice),
      autoGenerateThreshold: config.autoGenerateThreshold,
      autoGenerateQuantity: config.autoGenerateQuantity,
      isActive: config.isActive,
      displayOrder: config.displayOrder,
      wlanSsid: config.r710_wlans.ssid,
      deviceIpAddress: config.r710_wlans.device_registry.ipAddress
    }))

    // Fetch payroll accounts for this business
    const payrollAccounts = await prisma.payrollAccounts.findMany({
      where: { businessId: options.sourceBusinessId, isActive: true }
    })

    const payrollAccountSeedItems: PayrollAccountSeedItem[] = payrollAccounts.map(account => ({
      accountNumber: account.accountNumber,
      initialBalance: Number(account.balance),
      isActive: account.isActive
    }))

    // Build template data
    const templateData: SeedDataTemplate = {
      version: options.version,
      businessType: business.type,
      metadata: {
        name: options.name,
        description: options.description,
        exportedAt: new Date().toISOString(),
        exportedBy: session.user.name || session.user.email,
        exportedFrom: business.name,
        totalProducts: productSeedItems.length,
        totalCategories: categorySeedItems.length,
        totalSubcategories: subcategorySeedItems.length,
        totalExpenseAccounts: expenseAccountSeedItems.length,
        totalWiFiIntegrations: wifiIntegrationSeedItems.length,
        totalWiFiTokenConfigs: wifiTokenConfigSeedItems.length,
        totalR710Devices: r710DeviceSeedItems.length,
        totalR710Wlans: r710WlanSeedItems.length,
        totalR710TokenConfigs: r710TokenConfigSeedItems.length,
        totalPayrollAccounts: payrollAccountSeedItems.length
      },
      products: productSeedItems,
      categories: categorySeedItems,
      subcategories: subcategorySeedItems,
      expenseAccounts: expenseAccountSeedItems.length > 0 ? expenseAccountSeedItems : undefined,
      wifiIntegrations: wifiIntegrationSeedItems.length > 0 ? wifiIntegrationSeedItems : undefined,
      wifiTokenConfigs: wifiTokenConfigSeedItems.length > 0 ? wifiTokenConfigSeedItems : undefined,
      r710Devices: r710DeviceSeedItems.length > 0 ? r710DeviceSeedItems : undefined,
      r710Wlans: r710WlanSeedItems.length > 0 ? r710WlanSeedItems : undefined,
      r710TokenConfigs: r710TokenConfigSeedItems.length > 0 ? r710TokenConfigSeedItems : undefined,
      payrollAccounts: payrollAccountSeedItems.length > 0 ? payrollAccountSeedItems : undefined
    }

    // Save to database
    const template = await prisma.seedDataTemplates.create({
      data: {
        name: options.name,
        businessType: business.type,
        version: options.version,
        description: options.description,
        isActive: true,
        isSystemDefault: false,
        productCount: productSeedItems.length,
        categoryCount: categorySeedItems.length,
        templateData: templateData as any,
        createdBy: session.user.id,
        sourceBusinessId: options.sourceBusinessId,
        exportNotes: options.exportNotes
      }
    })

    const result: ExportTemplateResult = {
      success: true,
      templateId: template.id,
      template: templateData,
      stats: {
        products: productSeedItems.length,
        categories: categorySeedItems.length,
        subcategories: subcategorySeedItems.length,
        domains: 0,
        fileSize: JSON.stringify(templateData).length
      },
      message: `Successfully exported ${productSeedItems.length} products`
    }

    return NextResponse.json(result)

  } catch (error: any) {
    console.error('Export template error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to export template',
        stats: { products: 0, categories: 0, subcategories: 0, domains: 0 }
      },
      { status: 500 }
    )
  }
}
