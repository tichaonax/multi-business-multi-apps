#!/usr/bin/env node

/**
 * Drop and Recreate Database
 * Uses DATABASE_URL from environment to drop and recreate the database
 */

const path = require('path')
const { Client } = require('pg')

const ROOT_DIR = path.join(__dirname, '..')

async function main() {
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

  console.log(`\n🗑️  Dropping database '${dbName}'...`)

  // Connect to postgres (default) database
  const adminClient = new Client({
    host,
    port,
    user: username,
    password,
    database: 'postgres'
  })

  try {
    await adminClient.connect()

    // Terminate all connections to the target database
    await adminClient.query(`
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = $1
      AND pid <> pg_backend_pid()
    `, [dbName])

    // Drop the database
    await adminClient.query(`DROP DATABASE IF EXISTS "${dbName}"`)
    console.log(`✅ Database '${dbName}' dropped successfully`)

    // Create fresh database
    console.log(`\n📦 Creating fresh database '${dbName}'...`)
    await adminClient.query(`CREATE DATABASE "${dbName}"`)
    console.log(`✅ Database '${dbName}' created successfully\n`)

  } finally {
    await adminClient.end()
  }
}

main().catch(error => {
  console.error('\n❌ Error:', error.message)
  process.exit(1)
})
