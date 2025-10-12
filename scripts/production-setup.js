#!/usr/bin/env node

/**
 * Production Setup Script
 *
 * This script creates and seeds the entire database with all required reference data
 * for the Multi-Business Management Platform to be production-ready.
 *
 * Usage:
 * node scripts/production-setup.js
 */

const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

// Console colors for better output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
}

function log(message, color = colors.cyan) {
  console.log(`${color}${message}${colors.reset}`)
}

function success(message) {
  log(`✅ ${message}`, colors.green)
}
function warning(message) {
  log(`⚠️ ${message}`, colors.yellow)
}

function error(message) {
  log(`❌ ${message}`, colors.red)
}

function header(message) {
  log(`\n${'='.repeat(60)}`, colors.blue)
  log(`🚀 ${message}`, colors.bright)
  log(`${'='.repeat(60)}`, colors.blue)
}

async function checkDatabaseConnection() {
  try {
    await prisma.$connect()
    success('Database connection established')
    return true
  } catch (err) {
    error('Database connection failed: ' + err.message)
    return false
  }
}

// Helper: check if a model exists on the Prisma client (safe detection)
function modelExists(modelName) {
  try {
    const model = prisma[modelName]
    return model && typeof model.count === 'function'
  } catch (err) {
    return false
  }
}
// Build a list of available Prisma model names (keys on the client that look like model delegates)
function getAvailablePrismaModels() {
  try {
    return Object.keys(prisma).filter(k => {
      try {
        const maybe = prisma[k]
        return maybe && (typeof maybe.count === 'function' || typeof maybe.findFirst === 'function' || typeof maybe.findMany === 'function')
      } catch (e) {
        return false
      }
    })
  } catch (err) {
    return []
  }
}

function toSnakeCase(str) {
  return str.replace(/([A-Z])/g, '_$1').replace(/\./g, '_').toLowerCase().replace(/^_/, '')
}

function toCamelCase(str) {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
}

function resolveModelName(modelName, remap = {}) {
  // User-supplied remap (CLI or programmatic) takes highest precedence
  if (remap && remap[modelName]) return remap[modelName]

  // Default internal remaps for legacy seeder names that no longer match
  // current Prisma model names. We'll try candidates dynamically against the generated client.
  const DEFAULT_MODEL_REMAP = {
    // Legacy seeder names -> actual Prisma camelCase model names (after PascalCase conversion)
    phoneNumberTemplate: 'idFormatTemplates',    // PhoneNumber templates are stored in IdFormatTemplates
    dateFormatTemplate: 'idFormatTemplates',     // Date templates are stored in IdFormatTemplates
    idFormatTemplate: 'idFormatTemplates',       // ID Format Templates (camelCase plural)
    driverLicenseTemplate: 'driverLicenseTemplates', // Driver License Templates (camelCase plural)
    jobTitle: 'jobTitles',                       // Job Titles (camelCase plural)
    compensationType: 'compensationTypes',       // Compensation Types (camelCase plural)
    benefitType: 'benefitTypes',                 // Benefit Types (camelCase plural)
    projectType: 'projectTypes',                 // Project Types (camelCase plural)
    personalCategory: 'expenseCategories',       // Personal categories stored in ExpenseCategories
    expenseCategory: 'expenseCategories',        // Expense Categories (camelCase plural)
    user: 'users'                                // Users (camelCase plural)
  }

  // Start from explicit default remap value if present
  const candidates = []
  if (DEFAULT_MODEL_REMAP[modelName]) candidates.push(DEFAULT_MODEL_REMAP[modelName])
  // also try the original modelName as declared in legacy scripts
  candidates.push(modelName)
  // try common case conversions
  candidates.push(toSnakeCase(modelName))
  candidates.push(toCamelCase(modelName))

  // gather available models from the generated Prisma client
  const available = getAvailablePrismaModels()

  for (const cand of candidates) {
    if (!cand) continue
    if (available.includes(cand) || modelExists(cand)) {
      if (cand !== modelName) {
        log(`Resolved seeder model '${modelName}' -> '${cand}'`, colors.cyan)
      }
      return cand
    }
  }

  // If we couldn't find a candidate, log available models for debugging
  warning(`Could not resolve Prisma model for seeder key '${modelName}'. Tried: ${JSON.stringify(candidates)}.`)
  log(`Available Prisma models: ${available.length > 0 ? available.slice(0, 10).join(', ') + (available.length > 10 ? '...' : '') : 'NONE'}`, colors.yellow)
  warning(`Ensure you ran 'npx prisma generate' and that the model exists in prisma/schema.prisma.`)
  return modelName
}

// Heuristic mapping: convert common foreign-key scalar fields to relation connect shapes
function mapRelationFieldsForCreate(obj) {
  if (!obj || typeof obj !== 'object') return obj
  const out = { ...obj }
  // Map common *_id or camelCase id fields
  // Generic mapping: fields ending with Id or _id -> relation connect
  for (const key of Object.keys(out)) {
    const match = key.match(/^(.*?)(?:Id|_id)$/)
    if (match) {
      const rel = match[1]
      const id = out[key]
      delete out[key]
      if (id !== null && id !== undefined) {
        // convert snake_case to camelCase for relation name
        const relCamel = rel.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
        out[relCamel] = { connect: { id } }
      }
    }
  }
  // Map format -> pattern fallback (some schemas use 'pattern' not 'format')
  if (Object.prototype.hasOwnProperty.call(out, 'format') && !Object.prototype.hasOwnProperty.call(out, 'pattern')) {
    out.pattern = out.format
  }
  // If there is a callingCode and countryCode missing, leave as-is. Other mappings can be added here.
  return out
}

function mapRelationFieldsForUpdate(obj) {
  if (!obj || typeof obj !== 'object') return obj
  const out = { ...obj }
  for (const key of Object.keys(out)) {
    const match = key.match(/^(.*?)(?:Id|_id)$/)
    if (match) {
      const rel = match[1]
      const id = out[key]
      delete out[key]
      if (id !== null && id !== undefined) {
        const relCamel = rel.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
        out[relCamel] = { connect: { id } }
      }
    }
  }
  if (Object.prototype.hasOwnProperty.call(out, 'format') && !Object.prototype.hasOwnProperty.call(out, 'pattern')) {
    out.pattern = out.format
  }
  return out
}

// Safe upsert helper which respects dryRun and missing models
async function safeUpsert(modelName, where, update, create, options = {}) {
  const { dryRun = false, remap = {} } = options
  const resolved = resolveModelName(modelName, remap)
  if (!modelExists(resolved)) {
    warning(`Model not found on Prisma client: ${resolved} — skipping seeder for ${modelName}`)
    return null
  }

  if (dryRun) {
    log(`(dry-run) Would upsert into ${resolved} where=${JSON.stringify(where)} create=${JSON.stringify(create)}`)
    return null
  }

  // Iterative retry loop — handles unknown args and unique-constraint races by progressively
  // cleaning the input and trying alternative operations. Limits retries to avoid infinite loops.
  const maxRetries = 6
  let attempt = 0
  // Make shallow clones so we can safely mutate during retries without affecting caller
  let whereObj = where ? { ...where } : {}
  let updateObj = update ? { ...update } : {}
  let createObj = create ? { ...create } : {}

  while (attempt < maxRetries) {
    attempt += 1
    try {
      // Apply heuristic mappings to match current Prisma schema shapes
      createObj = mapRelationFieldsForCreate(createObj)
      updateObj = mapRelationFieldsForUpdate(updateObj)

      // If where lacks id but create provides one, prefer id-based where for Prisma WhereUniqueInput
      if (whereObj && !whereObj.id && createObj && createObj.id) {
        whereObj = { id: createObj.id }
      }

      return await prisma[resolved].upsert({ where: whereObj, update: updateObj, create: createObj })
    } catch (err) {
      const msg = (err && err.message) ? err.message : ''

      // 1) Strip unknown argument errors iteratively (e.g. `format`, `userId`)
      const unknownArgRegex = /Unknown argument `([^`]+)`/g
      let m
      let strippedAny = false
      while ((m = unknownArgRegex.exec(msg)) !== null) {
        const key = m[1]
        if (createObj && Object.prototype.hasOwnProperty.call(createObj, key)) {
          delete createObj[key]
          strippedAny = true
        }
        if (updateObj && Object.prototype.hasOwnProperty.call(updateObj, key)) {
          delete updateObj[key]
          strippedAny = true
        }
      }
      if (strippedAny) {
        // try again in next loop iteration
        continue
      }

      // 2) Missing required scalar or validation field — try auto-filling common ones
      if (createObj && msg.includes('Argument') && msg.includes('is missing')) {
        if (createObj.validationRegex && !createObj.pattern) createObj.pattern = createObj.validationRegex
        else if (createObj.format && !createObj.pattern) createObj.pattern = createObj.format
        // retry
        continue
      }

      // 3) Unique constraint failures or where-shape requirements — try to find existing by common natural keys
      if (msg.includes('Unique constraint failed') || msg.includes('needs at least one of') || msg.includes('requires')) {
        try {
          const naturalKeys = ['name', 'title', 'code', 'slug', 'key', 'email']
          for (const key of naturalKeys) {
            if (createObj && Object.prototype.hasOwnProperty.call(createObj, key)) {
              const whereSearch = {}
              whereSearch[key] = createObj[key]
              const existing = await prisma[resolved].findFirst({ where: whereSearch })
              if (existing && existing.id) {
                // Perform update using found id and return
                await prisma[resolved].update({ where: { id: existing.id }, data: updateObj })
                return existing
              }
            }
          }

          // If nothing found and createObj exists, try create (cleaned)
          if (createObj) {
            return await prisma[resolved].create({ data: createObj })
          }
        } catch (err2) {
          // continue to rethrow below if we can't recover
        }
      }

      // No recoverable pattern found — rethrow the original error
      throw err
    }
  }
  // Exhausted retries
  throw new Error(`safeUpsert: exceeded retry limit for model ${modelName}`)
}

async function safeCount(modelName, remap = {}) {
  const resolved = resolveModelName(modelName, remap)
  if (!modelExists(resolved)) {
    throw new Error(`Model not found: ${resolved}`)
  }
  return prisma[resolved].count()
}

async function seedIdFormatTemplates(options = {}) {
  log('\n📝 Seeding ID Format Templates...')

  const templates = [
    {
      id: 'zw-national-id',
      name: 'Zimbabwe National ID',
      countryCode: 'ZW',
      format: '##-######A##',
      example: '63-123456A78',
      description: 'Zimbabwe National ID format: DD-DDDDDDADD where D=digit, A=letter',
      validationRegex: '^\\d{2}-\\d{6}[A-Z]\\d{2}$',
      pattern: '^\\d{2}-\\d{6}[A-Z]\\d{2}$',
      isActive: true
    },
    {
      id: 'za-id-number',
      name: 'South Africa ID Number',
      countryCode: 'ZA',
      format: '############',
      example: '8001015009087',
      description: 'South African ID Number: 13 digits',
      validationRegex: '^\\d{13}$',
      pattern: '^\\d{13}$',
      isActive: true
    },
    {
      id: 'bw-omang',
      name: 'Botswana Omang',
      countryCode: 'BW',
      format: '#########',
      example: '123456789',
      description: 'Botswana Omang ID: 9 digits',
      validationRegex: '^\\d{9}$',
      pattern: '^\\d{9}$',
      isActive: true
    },
    {
      id: 'ke-national-id',
      name: 'Kenya National ID',
      countryCode: 'KE',
      format: '########',
      example: '12345678',
      description: 'Kenya National ID: 8 digits',
      validationRegex: '^\\d{8}$',
      pattern: '^\\d{8}$',
      isActive: true
    },
    {
      id: 'zm-nrc',
      name: 'Zambia NRC',
      countryCode: 'ZM',
      format: '######/##/#',
      example: '123456/78/1',
      description: 'Zambia NRC format: DDDDDD/DD/D',
      validationRegex: '^\\d{6}/\\d{2}/\\d$',
      pattern: '^\\d{6}/\\d{2}/\\d$',
      isActive: true
    }
  ]

  for (const template of templates) {
    try {
      await safeUpsert('idFormatTemplate', { id: template.id }, template, template, options)
      success(`  ✓ ${template.name} (${template.countryCode})`)
    } catch (err) {
      error(`  ✗ Failed to create ${template.name}: ${err.message}`)
    }
  }
}

async function seedPhoneNumberTemplates(options = {}) {
  log('\n📞 Seeding Phone Number Templates...')

  const templates = [
    {
      id: 'zw-phone',
      name: 'Zimbabwe',
      countryCode: 'ZW',
      callingCode: '+263',
      format: '## ### ####',
      example: '77 123 4567',
      description: 'Zimbabwe mobile format: CC NNN NNNN',
      validationRegex: '^\\d{2}\\s\\d{3}\\s\\d{4}$',
      isActive: true
    },
    {
      id: 'za-phone',
      name: 'South Africa',
      countryCode: 'ZA',
      callingCode: '+27',
      format: '## ### ####',
      example: '82 123 4567',
      description: 'South Africa mobile format: CC NNN NNNN',
      validationRegex: '^\\d{2}\\s\\d{3}\\s\\d{4}$',
      isActive: true
    },
    {
      id: 'bw-phone',
      name: 'Botswana',
      countryCode: 'BW',
      callingCode: '+267',
      format: '## ### ###',
      example: '77 123 456',
      description: 'Botswana mobile format: CC NNN NNN',
      validationRegex: '^\\d{2}\\s\\d{3}\\s\\d{3}$',
      isActive: true
    },
    {
      id: 'ke-phone',
      name: 'Kenya',
      countryCode: 'KE',
      callingCode: '+254',
      format: '### ### ###',
      example: '712 345 678',
      description: 'Kenya mobile format: CCC NNN NNN',
      validationRegex: '^\\d{3}\\s\\d{3}\\s\\d{3}$',
      isActive: true
    },
    {
      id: 'zm-phone',
      name: 'Zambia',
      countryCode: 'ZM',
      callingCode: '+260',
      format: '## ### ####',
      example: '97 123 4567',
      description: 'Zambia mobile format: CC NNN NNNN',
      validationRegex: '^\\d{2}\\s\\d{3}\\s\\d{4}$',
      isActive: true
    },
    {
      id: 'uk-phone',
      name: 'United Kingdom',
      countryCode: 'GB',
      callingCode: '+44',
      format: '#### ### ###',
      example: '7712 345 678',
      description: 'UK mobile format: CCCC NNN NNN',
      validationRegex: '^\\d{4}\\s\\d{3}\\s\\d{3}$',
      isActive: true
    },
    {
      id: 'us-phone',
      name: 'United States',
      countryCode: 'US',
      callingCode: '+1',
      format: '(###) ###-####',
      example: '(555) 123-4567',
      description: 'US phone format: (AAA) NNN-NNNN',
      validationRegex: '^\\(\\d{3}\\)\\s\\d{3}-\\d{4}$',
      isActive: true
    }
  ]

  for (const template of templates) {
    try {
      await safeUpsert('phoneNumberTemplate', { id: template.id }, template, template, options)
      success(`  ✓ ${template.name} (${template.callingCode})`)
    } catch (err) {
      error(`  ✗ Failed to create ${template.name}: ${err.message}`)
    }
  }
}

async function seedDateFormatTemplates(options = {}) {
  log('\n📅 Seeding Date Format Templates...')

  const templates = [
    {
      id: 'dd-mm-yyyy',
      name: 'DD/MM/YYYY',
      format: 'DD/MM/YYYY',
      example: '25/12/2024',
      description: 'European date format (Zimbabwe, UK, Australia)',
      countries: ['ZW', 'GB', 'AU'],
      isActive: true
    },
    {
      id: 'mm-dd-yyyy',
      name: 'MM/DD/YYYY',
      format: 'MM/DD/YYYY',
      example: '12/25/2024',
      description: 'US date format',
      countries: ['US'],
      isActive: true
    },
    {
      id: 'yyyy-mm-dd',
      name: 'YYYY-MM-DD',
      format: 'YYYY-MM-DD',
      example: '2024-12-25',
      description: 'ISO 8601 standard format',
      countries: ['ISO'],
      isActive: true
    },
    {
      id: 'dd-mm-yyyy-dash',
      name: 'DD-MM-YYYY',
      format: 'DD-MM-YYYY',
      example: '25-12-2024',
      description: 'European format with dashes (South Africa)',
      countries: ['ZA'],
      isActive: true
    },
    {
      id: 'dd-dot-mm-dot-yyyy',
      name: 'DD.MM.YYYY',
      format: 'DD.MM.YYYY',
      example: '25.12.2024',
      description: 'European format with dots (Germany, Netherlands)',
      countries: ['DE', 'NL'],
      isActive: true
    }
  ]

  for (const template of templates) {
    try {
      await safeUpsert('dateFormatTemplate', { id: template.id }, template, template, options)
      success(`  ✓ ${template.name} (${template.example})`)
    } catch (err) {
      error(`  ✗ Failed to create ${template.name}: ${err.message}`)
    }
  }
}

async function seedDriverLicenseTemplates(options = {}) {
  log('\n🚗 Seeding Driver License Templates...')

  const templates = [
    {
      id: 'zw-driver-license',
      name: 'Zimbabwe Driver License',
      countryCode: 'ZW',
      format: '########',
      example: '12345678',
      description: 'Zimbabwe driver license: 8 digits',
      validationRegex: '^\\d{8}$',
      pattern: '^\\d{8}$',
      isActive: true
    },
    {
      id: 'za-driver-license',
      name: 'South Africa Driver License',
      countryCode: 'ZA',
      format: '##########',
      example: '1234567890',
      description: 'South Africa driver license: 10 digits',
      validationRegex: '^\\d{10}$',
      pattern: '^\\d{10}$',
      isActive: true
    },
    {
      id: 'bw-driver-license',
      name: 'Botswana Driver License',
      countryCode: 'BW',
      format: 'B#######',
      example: 'B1234567',
      description: 'Botswana driver license: B + 7 digits',
      validationRegex: '^B\\d{7}$',
      pattern: '^B\\d{7}$',
      isActive: true
    },
    {
      id: 'us-driver-license',
      name: 'US Driver License',
      countryCode: 'US',
      format: 'Varies by state',
      example: 'D123456789',
      description: 'US driver license format varies by state',
      validationRegex: '^[A-Z0-9]{8,15}$',
      pattern: '^[A-Z0-9]{8,15}$',
      isActive: true
    }
  ]

  for (const template of templates) {
    try {
      await safeUpsert('driverLicenseTemplate', { id: template.id }, template, template, options)
      success(`  ✓ ${template.name}`)
    } catch (err) {
      error(`  ✗ Failed to create ${template.name}: ${err.message}`)
    }
  }
}

async function seedJobTitles(options = {}) {
  log('\n👔 Seeding Job Titles...')

  const jobTitles = [
    // Executive Roles
    { title: 'Chief Executive Officer', description: 'Overall company leadership and strategy', department: 'Executive', level: 'Executive' },
    { title: 'Managing Director', description: 'Day-to-day operations management', department: 'Executive', level: 'Executive' },
    { title: 'General Manager', description: 'General business operations oversight', department: 'Management', level: 'Senior' },

    // Construction Roles
    { title: 'Site Supervisor', description: 'Construction site management and safety oversight', department: 'Construction', level: 'Senior' },
    { title: 'Project Manager', description: 'Construction project planning and execution', department: 'Construction', level: 'Senior' },
    { title: 'Civil Engineer', description: 'Engineering design and technical oversight', department: 'Engineering', level: 'Professional' },
    { title: 'Quantity Surveyor', description: 'Cost estimation and project budgeting', department: 'Engineering', level: 'Professional' },
    { title: 'Foreman', description: 'Direct supervision of construction workers', department: 'Construction', level: 'Supervisory' },
    { title: 'Mason', description: 'Brick and stone work specialist', department: 'Construction', level: 'Skilled' },
    { title: 'Carpenter', description: 'Wood work and framing specialist', department: 'Construction', level: 'Skilled' },
    { title: 'Electrician', description: 'Electrical installation and maintenance', department: 'Construction', level: 'Skilled' },
    { title: 'Plumber', description: 'Plumbing installation and repairs', department: 'Construction', level: 'Skilled' },
    { title: 'Welder', description: 'Metal joining and fabrication', department: 'Construction', level: 'Skilled' },
    { title: 'General Laborer', description: 'General construction support tasks', department: 'Construction', level: 'Entry' },

    // Business Operations
    { title: 'Operations Manager', description: 'Daily business operations management', department: 'Operations', level: 'Senior' },
    { title: 'Human Resources Manager', description: 'Employee relations and HR policies', department: 'HR', level: 'Senior' },
    { title: 'Accountant', description: 'Financial record keeping and reporting', department: 'Finance', level: 'Professional' },
    { title: 'Bookkeeper', description: 'Daily financial transaction recording', department: 'Finance', level: 'Professional' },
    { title: 'Administrative Assistant', description: 'General office administration support', department: 'Administration', level: 'Support' },
    { title: 'Secretary', description: 'Executive support and communication', department: 'Administration', level: 'Support' },
    { title: 'Receptionist', description: 'Front desk and visitor management', department: 'Administration', level: 'Support' },

    // Sales and Marketing
    { title: 'Sales Manager', description: 'Sales team leadership and strategy', department: 'Sales', level: 'Senior' },
    { title: 'Sales Representative', description: 'Customer acquisition and relationship management', department: 'Sales', level: 'Professional' },
    { title: 'Marketing Coordinator', description: 'Marketing campaigns and brand promotion', department: 'Marketing', level: 'Professional' },

    // Technical Roles
    { title: 'IT Specialist', description: 'Information technology support and maintenance', department: 'IT', level: 'Professional' },
    { title: 'Quality Control Inspector', description: 'Quality assurance and compliance checking', department: 'Quality', level: 'Professional' },
    { title: 'Safety Officer', description: 'Workplace safety and compliance management', department: 'Safety', level: 'Professional' },

    // Service Roles
    { title: 'Driver', description: 'Vehicle operation and transportation services', department: 'Logistics', level: 'Skilled' },
    { title: 'Security Guard', description: 'Property and personnel security', department: 'Security', level: 'Entry' }
  ]

  for (const jobTitle of jobTitles) {
    try {
      await safeUpsert(
        'jobTitle',
        { title: jobTitle.title },
        jobTitle,
        {
          id: `job-${jobTitle.title.toLowerCase().replace(/\s+/g, '-')}`,
          ...jobTitle,
          responsibilities: [],
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        options
      )
      success(`  ✓ ${jobTitle.title}`)
    } catch (err) {
      error(`  ✗ Failed to create ${jobTitle.title}: ${err.message}`)
    }
  }
}

async function seedCompensationTypes(options = {}) {
  log('\n💰 Seeding Compensation Types...')

  const compensationTypes = [
    {
      id: 'hourly-minimum',
      name: 'Hourly - Minimum Wage',
      type: 'hourly',
      baseAmount: 2.50,
      commissionPercentage: null,
      isActive: true
    },
    {
      id: 'hourly-skilled',
      name: 'Hourly - Skilled Worker',
      type: 'hourly',
      baseAmount: 5.00,
      commissionPercentage: null,
      isActive: true
    },
    {
      id: 'hourly-professional',
      name: 'Hourly - Professional',
      type: 'hourly',
      baseAmount: 15.00,
      commissionPercentage: null,
      isActive: true
    },
    {
      id: 'monthly-entry',
      name: 'Monthly Salary - Entry Level',
      type: 'monthly',
      baseAmount: 400.00,
      commissionPercentage: null,
      isActive: true
    },
    {
      id: 'monthly-skilled',
      name: 'Monthly Salary - Skilled',
      type: 'monthly',
      baseAmount: 800.00,
      commissionPercentage: null,
      isActive: true
    },
    {
      id: 'monthly-professional',
      name: 'Monthly Salary - Professional',
      type: 'monthly',
      baseAmount: 1500.00,
      commissionPercentage: null,
      isActive: true
    },
    {
      id: 'monthly-management',
      name: 'Monthly Salary - Management',
      type: 'monthly',
      baseAmount: 2500.00,
      commissionPercentage: null,
      isActive: true
    },
    {
      id: 'monthly-executive',
      name: 'Monthly Salary - Executive',
      type: 'monthly',
      baseAmount: 5000.00,
      commissionPercentage: null,
      isActive: true
    },
    {
      id: 'commission-only',
      name: 'Commission Only',
      type: 'commission',
      baseAmount: 0.00,
      commissionPercentage: 10.00,
      isActive: true
    },
    {
      id: 'base-plus-commission-low',
      name: 'Base + Commission (Low Base)',
      type: 'base_plus_commission',
      baseAmount: 300.00,
      commissionPercentage: 5.00,
      isActive: true
    },
    {
      id: 'base-plus-commission-high',
      name: 'Base + Commission (High Base)',
      type: 'base_plus_commission',
      baseAmount: 800.00,
      commissionPercentage: 3.00,
      isActive: true
    },
    {
      id: 'project-based',
      name: 'Project-Based Payment',
      type: 'project',
      baseAmount: 1000.00,
      commissionPercentage: null,
      isActive: true
    },
    {
      id: 'piece-work',
      name: 'Piece Work / Per Unit',
      type: 'piece_work',
      baseAmount: 5.00,
      commissionPercentage: null,
      isActive: true
    },
    {
      id: 'contract-fixed',
      name: 'Fixed Contract Amount',
      type: 'contract',
      baseAmount: 2000.00,
      commissionPercentage: null,
      isActive: true
    },
    {
      id: 'performance-bonus',
      name: 'Base + Performance Bonus',
      type: 'performance',
      baseAmount: 1200.00,
      commissionPercentage: 2.00,
      isActive: true
    }
  ]

  for (const compensation of compensationTypes) {
    try {
      await safeUpsert('compensationType', { id: compensation.id }, compensation, {
        ...compensation,
        createdAt: new Date(),
        updatedAt: new Date()
      }, options)
      success(`  ✓ ${compensation.name}`)
    } catch (err) {
      error(`  ✗ Failed to create ${compensation.name}: ${err.message}`)
    }
  }
}

async function seedBenefitTypes(options = {}) {
  log('\n🏥 Seeding Benefit Types...')

  const benefitTypes = [
    // Health and Medical
    { name: 'Health Insurance', type: 'health', defaultAmount: 50.00, isPercentage: false },
    { name: 'Medical Aid Contribution', type: 'health', defaultAmount: 80.00, isPercentage: false },
    { name: 'Dental Insurance', type: 'health', defaultAmount: 25.00, isPercentage: false },
    { name: 'Vision Insurance', type: 'health', defaultAmount: 15.00, isPercentage: false },

    // Retirement and Savings
    { name: 'Pension Fund Contribution', type: 'retirement', defaultAmount: 8.00, isPercentage: true },
    { name: 'Provident Fund', type: 'retirement', defaultAmount: 10.00, isPercentage: true },
    { name: 'Retirement Savings Plan', type: 'retirement', defaultAmount: 5.00, isPercentage: true },

    // Leave and Time Off
    { name: 'Annual Leave', type: 'leave', defaultAmount: 21.00, isPercentage: false },
    { name: 'Sick Leave', type: 'leave', defaultAmount: 12.00, isPercentage: false },
    { name: 'Maternity Leave', type: 'leave', defaultAmount: 90.00, isPercentage: false },
    { name: 'Paternity Leave', type: 'leave', defaultAmount: 10.00, isPercentage: false },
    { name: 'Study Leave', type: 'leave', defaultAmount: 5.00, isPercentage: false },

    // Financial Allowances
    { name: 'Transport Allowance', type: 'allowance', defaultAmount: 100.00, isPercentage: false },
    { name: 'Housing Allowance', type: 'allowance', defaultAmount: 200.00, isPercentage: false },
    { name: 'Lunch Allowance', type: 'allowance', defaultAmount: 3.00, isPercentage: false },
    { name: 'Communication Allowance', type: 'allowance', defaultAmount: 30.00, isPercentage: false },
    { name: 'Uniform Allowance', type: 'allowance', defaultAmount: 50.00, isPercentage: false },

    // Performance and Incentives
    { name: 'Performance Bonus', type: 'bonus', defaultAmount: 5.00, isPercentage: true },
    { name: '13th Cheque Bonus', type: 'bonus', defaultAmount: 8.33, isPercentage: true },
    { name: 'Holiday Bonus', type: 'bonus', defaultAmount: 100.00, isPercentage: false },
    { name: 'Sales Commission', type: 'commission', defaultAmount: 2.00, isPercentage: true },

    // Professional Development
    { name: 'Training Budget', type: 'development', defaultAmount: 200.00, isPercentage: false },
    { name: 'Professional Membership', type: 'development', defaultAmount: 100.00, isPercentage: false },
    { name: 'Conference Attendance', type: 'development', defaultAmount: 300.00, isPercentage: false },

    // Insurance and Protection
    { name: 'Life Insurance', type: 'insurance', defaultAmount: 2.00, isPercentage: true },
    { name: 'Disability Insurance', type: 'insurance', defaultAmount: 1.00, isPercentage: true },
    { name: 'Workers Compensation', type: 'insurance', defaultAmount: 0.50, isPercentage: true },

    // Other Benefits
    { name: 'Company Vehicle', type: 'other', defaultAmount: 300.00, isPercentage: false },
    { name: 'Fuel Allowance', type: 'other', defaultAmount: 150.00, isPercentage: false }
  ]

  for (const benefit of benefitTypes) {
    try {
      await safeUpsert('benefitType', { name: benefit.name }, benefit, {
        id: `benefit-${benefit.name.toLowerCase().replace(/\s+/g, '-')}`,
        ...benefit,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }, options)
      success(`  ✓ ${benefit.name}`)
    } catch (err) {
      error(`  ✗ Failed to create ${benefit.name}: ${err.message}`)
    }
  }
}

async function seedProjectTypes(options = {}) {
  log('\n🏗️ Seeding Project Types...')

  const projectTypes = [
    // Construction Project Types
    {
      id: 'residential-construction',
      name: 'Residential Construction',
      description: 'Houses, apartments, and residential buildings',
      businessType: 'construction',
      isSystem: true,
      isActive: true
    },
    {
      id: 'commercial-construction',
      name: 'Commercial Construction',
      description: 'Office buildings, retail spaces, warehouses',
      businessType: 'construction',
      isSystem: true,
      isActive: true
    },
    {
      id: 'infrastructure',
      name: 'Infrastructure Projects',
      description: 'Roads, bridges, utilities, public works',
      businessType: 'construction',
      isSystem: true,
      isActive: true
    },
    {
      id: 'renovation-construction',
      name: 'Renovation & Remodeling',
      description: 'Building renovations and improvements',
      businessType: 'construction',
      isSystem: true,
      isActive: true
    },

    // Restaurant Project Types
    {
      id: 'menu-development',
      name: 'Menu Development',
      description: 'New menu creation and testing',
      businessType: 'restaurant',
      isSystem: true,
      isActive: true
    },
    {
      id: 'restaurant-renovation',
      name: 'Restaurant Renovation',
      description: 'Kitchen and dining area improvements',
      businessType: 'restaurant',
      isSystem: true,
      isActive: true
    },
    {
      id: 'catering-events',
      name: 'Catering Events',
      description: 'Special event catering projects',
      businessType: 'restaurant',
      isSystem: true,
      isActive: true
    },
    {
      id: 'staff-training',
      name: 'Staff Training Program',
      description: 'Employee training and development',
      businessType: 'restaurant',
      isSystem: true,
      isActive: true
    },

    // Grocery Project Types
    {
      id: 'store-expansion',
      name: 'Store Expansion',
      description: 'Expanding grocery store space or locations',
      businessType: 'grocery',
      isSystem: true,
      isActive: true
    },
    {
      id: 'inventory-system',
      name: 'Inventory System Upgrade',
      description: 'Improving inventory management systems',
      businessType: 'grocery',
      isSystem: true,
      isActive: true
    },
    {
      id: 'product-launch',
      name: 'New Product Launch',
      description: 'Introducing new product lines',
      businessType: 'grocery',
      isSystem: true,
      isActive: true
    },

    // Clothing Project Types
    {
      id: 'fashion-collection',
      name: 'Fashion Collection',
      description: 'Seasonal clothing collection development',
      businessType: 'clothing',
      isSystem: true,
      isActive: true
    },
    {
      id: 'store-layout',
      name: 'Store Layout Redesign',
      description: 'Improving store layout and displays',
      businessType: 'clothing',
      isSystem: true,
      isActive: true
    },
    {
      id: 'brand-campaign',
      name: 'Brand Marketing Campaign',
      description: 'Marketing and promotional campaigns',
      businessType: 'clothing',
      isSystem: true,
      isActive: true
    },

    // Hardware Project Types
    {
      id: 'tool-inventory',
      name: 'Tool Inventory Expansion',
      description: 'Expanding tool and equipment inventory',
      businessType: 'hardware',
      isSystem: true,
      isActive: true
    },
    {
      id: 'contractor-program',
      name: 'Contractor Partnership Program',
      description: 'Developing contractor relationships',
      businessType: 'hardware',
      isSystem: true,
      isActive: true
    },
    {
      id: 'workshop-setup',
      name: 'Workshop Setup',
      description: 'Setting up customer workshop areas',
      businessType: 'hardware',
      isSystem: true,
      isActive: true
    },

    // Personal Project Types
    {
      id: 'home-improvement',
      name: 'Home Improvement',
      description: 'Personal home renovation projects',
      businessType: 'personal',
      isSystem: true,
      isActive: true
    },
    {
      id: 'financial-planning',
      name: 'Financial Planning',
      description: 'Personal financial planning projects',
      businessType: 'personal',
      isSystem: true,
      isActive: true
    },
    {
      id: 'education-training',
      name: 'Education & Training',
      description: 'Personal education and skill development',
      businessType: 'personal',
      isSystem: true,
      isActive: true
    },
    {
      id: 'health-wellness',
      name: 'Health & Wellness',
      description: 'Personal health and wellness goals',
      businessType: 'personal',
      isSystem: true,
      isActive: true
    }
  ]

  for (const projectType of projectTypes) {
    try {
      await safeUpsert('projectType', { id: projectType.id }, projectType, {
        ...projectType,
        createdAt: new Date(),
        updatedAt: new Date()
      }, options)
      success(`  ✓ ${projectType.name} (${projectType.businessType})`)
    } catch (err) {
      error(`  ✗ Failed to create ${projectType.name}: ${err.message}`)
    }
  }
}

async function seedDefaultPersonalCategories(options = {}) {
  log('\n📂 Seeding Default Personal Finance Categories...')

  const categories = [
    { name: 'Food & Groceries', emoji: '🛒', color: '#10B981' },
    { name: 'Transportation', emoji: '🚗', color: '#3B82F6' },
    { name: 'Housing & Utilities', emoji: '🏠', color: '#F59E0B' },
    { name: 'Healthcare', emoji: '🏥', color: '#EF4444' },
    { name: 'Entertainment', emoji: '🎬', color: '#8B5CF6' },
    { name: 'Education', emoji: '📚', color: '#06B6D4' },
    { name: 'Clothing', emoji: '👕', color: '#EC4899' },
    { name: 'Personal Care', emoji: '💄', color: '#84CC16' },
    { name: 'Insurance', emoji: '🛡️', color: '#6B7280' },
    { name: 'Savings', emoji: '💰', color: '#14B8A6' },
    { name: 'Debt Payments', emoji: '💳', color: '#F97316' },
    { name: 'Gifts & Donations', emoji: '🎁', color: '#FB7185' },
    { name: 'Business Expenses', emoji: '💼', color: '#64748B' },
    { name: 'Miscellaneous', emoji: '📝', color: '#9CA3AF' }
  ]

  for (const category of categories) {
    try {
      await safeUpsert('personalCategory', { name: category.name }, category, {
        id: `category-${category.name.toLowerCase().replace(/\s+/g, '-').replace(/&/g, 'and')}`,
        ...category,
        userId: null, // System default categories
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }, options)
      success(`  ✓ ${category.emoji} ${category.name}`)
    } catch (err) {
      error(`  ✗ Failed to create ${category.name}: ${err.message}`)
    }
  }
}

async function createSystemAdmin(options = {}) {
  log('\n👤 Creating System Administrator Account...')

  const adminEmail = 'admin@business.local'
  const adminPassword = 'admin123'

  try {
    if (options.dryRun) {
      log('(dry-run) Would create system administrator account: admin@business.local')
      return
    }
    // Check if admin already exists (model Users -> prisma.users)
    const existingAdmin = await prisma.users.findUnique({
      where: { email: adminEmail }
    })

    if (existingAdmin) {
      warning(`Admin user already exists: ${adminEmail}`)
      return
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(adminPassword, 12)

    // Build admin payload
    const adminPayload = {
      id: 'system-admin-001',
      email: adminEmail,
      name: 'System Administrator',
      passwordHash: hashedPassword,
      role: 'admin',
      isActive: true,
      permissions: {
        canManageUsers: true,
        canManageBusinesses: true,
        canAccessReports: true,
        canManageSystem: true,
        canViewAuditLogs: true,
        canManagePermissions: true,
        canAccessAllBusinesses: true,
        canCreateProjects: true,
        canAddPersonalExpenses: true,
        canManagePersonalCategories: true,
        canManagePersonalContractors: true,
        canViewPersonalReports: true,
        canManagePersonalBudgets: true,
        canManagePersonalLoans: true,
        construction: { canView: true, canCreate: true, canEdit: true, canDelete: true, canManageProjects: true, canManageContractors: true, canViewReports: true, canCreateProjects: true },
        restaurant: { canView: true, canCreate: true, canEdit: true, canDelete: true, canManageMenu: true, canManageOrders: true, canViewReports: true, canCreateProjects: true },
        grocery: { canView: true, canCreate: true, canEdit: true, canDelete: true, canManageInventory: true, canManageProducts: true, canViewReports: true, canCreateProjects: true },
        clothing: { canView: true, canCreate: true, canEdit: true, canDelete: true, canManageInventory: true, canManageProducts: true, canViewReports: true, canCreateProjects: true },
        hardware: { canView: true, canCreate: true, canEdit: true, canDelete: true, canManageInventory: true, canManageTools: true, canViewReports: true, canCreateProjects: true }
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }

    try {
      await safeUpsert('user', { email: adminEmail }, { ...adminPayload }, adminPayload, options)
      success(`System administrator upserted successfully`)
      log(`  📧 Email: ${adminEmail}`)
      log(`  🔑 Password: ${adminPassword}`)
      warning(`⚠️  Please change the default password after first login!`)
    } catch (err) {
      error(`Failed to upsert system administrator: ${err.message}`)
    }

  } catch (err) {
    error(`Failed to create system administrator: ${err.message}`)
  }
}

async function verifySetup(options = {}) {
  log('\n🔍 Verifying Production Setup...')

  const checks = [
    { name: 'ID Format Templates', model: 'idFormatTemplate', expectedMin: 5 },
    { name: 'Phone Number Templates', model: 'phoneNumberTemplate', expectedMin: 5 },
    { name: 'Date Format Templates', model: 'dateFormatTemplate', expectedMin: 5 },
    { name: 'Driver License Templates', model: 'driverLicenseTemplate', expectedMin: 3 },
    { name: 'Job Titles', model: 'jobTitle', expectedMin: 25 },
    { name: 'Compensation Types', model: 'compensationType', expectedMin: 10 },
    { name: 'Benefit Types', model: 'benefitType', expectedMin: 20 },
    { name: 'Project Types', model: 'projectType', expectedMin: 15 },
    { name: 'Personal Categories', model: 'personalCategory', expectedMin: 10 },
    { name: 'System Users', model: 'user', expectedMin: 1 }
  ]

  let allPassed = true

  for (const check of checks) {
    try {
      const count = await safeCount(check.model, options.remap)
      if (count >= check.expectedMin) {
        success(`  ✓ ${check.name}: ${count} records`)
      } else {
        error(`  ✗ ${check.name}: ${count} records (expected at least ${check.expectedMin})`)
        allPassed = false
      }
    } catch (err) {
      // Missing model or other issue — if ignoreMissingModels is set, treat as warning only
      if (options.ignoreMissingModels) {
        warning(`  ⚠ ${check.name}: ${err.message}`)
      } else {
        warning(`  ⚠ ${check.name}: ${err.message}`)
        allPassed = false
      }
    }
  }

  return allPassed
}

async function runProductionSetup(options = { createAdmin: true, dryRun: false, remap: {} }) {
  header('Multi-Business Management Platform - Production Setup')

  log('Starting production database setup and seeding...')

  // Check database connection unless this is a dry-run
  if (!options.dryRun) {
    if (!await checkDatabaseConnection()) {
      error('Cannot proceed without database connection')
      return false
    }
  } else {
    log('(dry-run) Skipping database connection check')
  }

  try {
    // Seed all reference data (pass options through to allow dry-run and remap)
    await seedIdFormatTemplates(options)
    await seedPhoneNumberTemplates(options)
    await seedDateFormatTemplates(options)
    await seedDriverLicenseTemplates(options)
    await seedJobTitles(options)
    await seedCompensationTypes(options)
    await seedBenefitTypes(options)
    await seedProjectTypes(options)
    await seedDefaultPersonalCategories(options)

    // NOTE: Contract seeding (CT-EMP1009) removed - this is test data, not production reference data
    // Test data seeding should be on-demand via separate scripts, not part of production setup

    // Create system admin (optional)
    if (options.createAdmin !== false) {
      await createSystemAdmin(options)
    }

    // Verify setup (skip during dry-run since we did not connect to DB)
    let setupValid = true
    if (options.dryRun) {
      log('(dry-run) Skipping verification step')
      setupValid = false
    } else {
      try {
        setupValid = await verifySetup(options)
      } catch (err) {
        // If verifySetup throws due to missing models, log and continue
        warning('Verification step failed: ' + err.message)
        setupValid = false
      }
    }

    if (setupValid) {
      header('🎉 Production Setup Completed Successfully!')
      success('Your Multi-Business Management Platform is ready for production use!')
      log('\nNext Steps:')
      log('1. Start the application: npm run dev (development) or npm run build && npm start (production)')
      log('2. Login with admin credentials: admin@business.local / admin123')
      log('3. Change the default admin password')
      log('4. Create your first business and users')
      log('5. Configure system settings and preferences')
      return true
    } else {
      // If caller asked to ignore missing models, treat verification warnings as non-fatal and return success
      if (options.ignoreMissingModels) {
        warning('Setup completed with warnings but --ignore-missing-models specified; treating as success')
        return true
      }
      error('Setup completed with some issues. Please review the errors above.')
      return false
    }

  } catch (err) {
    error(`Production setup failed: ${err.message}`)
    console.error(err)
    return false
  } finally {
    await prisma.$disconnect()
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  error(`Unhandled Rejection at: ${promise}, reason: ${reason}`)
  process.exit(1)
})

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  error(`Uncaught Exception: ${err.message}`)
  console.error(err)
  process.exit(1)
})

// Run the setup when executed directly
if (require.main === module) {
  ;(async () => {
    // Simple CLI flags: --dry-run and --remap '{"phoneNumberTemplate":"phoneTemplate"}'
    const argv = process.argv.slice(2)
    const options = { createAdmin: true, dryRun: false, remap: {} }

    if (argv.includes('--no-admin')) options.createAdmin = false
    if (argv.includes('--dry-run')) options.dryRun = true

    const remapIndex = argv.findIndex(a => a === '--remap')
    if (remapIndex !== -1 && argv[remapIndex + 1]) {
      try {
        options.remap = JSON.parse(argv[remapIndex + 1])
        log('Using remap: ' + JSON.stringify(options.remap))
      } catch (err) {
        error('Failed to parse --remap JSON: ' + err.message)
        process.exit(2)
      }
    }

    if (argv.includes('--ignore-missing-models')) options.ignoreMissingModels = true

    const ok = await runProductionSetup(options)
    process.exit(ok ? 0 : 1)
  })()
}

// Export for programmatic use (and individual seed functions for backwards compatibility)
module.exports = {
  runProductionSetup,
  // Individual seeder exports (used by legacy scripts like seed-all-employee-data.js)
  seedIdFormatTemplates,
  seedPhoneNumberTemplates,
  seedDateFormatTemplates,
  seedDriverLicenseTemplates,
  seedJobTitles,
  seedCompensationTypes,
  seedBenefitTypes,
  seedProjectTypes,
  seedDefaultPersonalCategories,
  createSystemAdmin,
  verifySetup
}