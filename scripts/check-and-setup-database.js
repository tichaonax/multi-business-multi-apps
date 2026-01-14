#!/usr/bin/env node

/**
 * Database Check and Setup
 *
 * This script is run AFTER npm install and Prisma generation to:
 * 1. Load environment variables
 * 2. Check if database is empty (fresh installation check)
 * 3. Create database if it doesn't exist
 */

const path = require('path')
const fs = require('fs')

const ROOT_DIR = path.join(__dirname, '..')

async function checkDatabaseEmpty() {
  try {
    const { PrismaClient } = require('@prisma/client')
    const prisma = new PrismaClient()

    try {
      // Try to query a table - if it exists, database is not empty
      const result = await prisma.$queryRaw`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = 'users'
        ) as table_exists;
      `

      await prisma.$disconnect()

      if (result[0]?.table_exists) {
        return false // Database has tables
      }
      return true // Database is empty
    } catch (error) {
      await prisma.$disconnect()
      return true // Assume empty if query fails
    }
  } catch (error) {
    return true // Assume empty if Prisma client not generated yet
  }
}

async function createDatabaseIfNeeded() {
  try {
    // Load environment variables
    const envLocalPath = path.join(ROOT_DIR, '.env.local')
    const envPath = path.join(ROOT_DIR, '.env')

    require('dotenv').config({ path: envLocalPath })
    require('dotenv').config({ path: envPath })

    const databaseUrl = process.env.DATABASE_URL

    if (!databaseUrl) {
      throw new Error('DATABASE_URL not found in environment variables')
    }

    // Parse the database URL
    const url = new URL(databaseUrl)
    const dbName = url.pathname.slice(1) // Remove leading '/'
    const host = url.hostname
    const port = url.port || 5432
    const username = url.username
    const password = url.password

    // Create connection to postgres (default) database to create target database
    const { Client } = require('pg')
    const adminClient = new Client({
      host,
      port,
      user: username,
      password,
      database: 'postgres' // Connect to default postgres database
    })

    try {
      await adminClient.connect()

      // Check if database exists
      const result = await adminClient.query(
        'SELECT 1 FROM pg_database WHERE datname = $1',
        [dbName]
      )

      if (result.rows.length === 0) {
        console.log(`📦 Creating database '${dbName}'...`)
        await adminClient.query(`CREATE DATABASE "${dbName}"`)
        console.log(`✅ Database '${dbName}' created successfully\n`)
      } else {
        console.log(`✅ Database '${dbName}' already exists\n`)
      }
    } finally {
      await adminClient.end()
    }

    return true
  } catch (error) {
    console.error('❌ Failed to create database:', error.message)
    console.error('\nPlease ensure:')
    console.error('1. PostgreSQL is running')
    console.error('2. Database credentials in .env are correct')
    console.error('3. PostgreSQL user has CREATE DATABASE privileges\n')
    return false
  }
}

async function main() {
  console.log('🔍 Checking if this is a fresh installation...\n')

  const isEmpty = await checkDatabaseEmpty()

  if (!isEmpty) {
    console.log('⚠️  DATABASE NOT EMPTY!')
    console.log('This script is for fresh installations only.')
    console.log('The database already contains tables.\n')
    console.log('If you pulled code updates, use instead:')
    console.log('  npm run setup:update\n')
    console.log('To force fresh installation (⚠️  DELETES ALL DATA):')
    console.log('  npx prisma migrate reset')
    console.log('  npm run setup\n')
    process.exit(1)
  }

  console.log('✅ Database is empty - proceeding with fresh installation\n')

  // Create database if it doesn't exist
  console.log('🗄️  Ensuring database exists...\n')
  const dbCreated = await createDatabaseIfNeeded()
  if (!dbCreated) {
    console.error('❌ Database creation failed. Cannot proceed with installation.\n')
    process.exit(1)
  }

  console.log('✅ Database check and setup complete\n')
}

main().catch(error => {
  console.error('\n❌ Database check failed:', error.message)
  process.exit(1)
})
