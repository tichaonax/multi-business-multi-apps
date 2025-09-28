const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const { exec } = require('child_process')
const { promisify } = require('util')

const execAsync = promisify(exec)

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = process.env.PORT || 8765

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

/**
 * Load environment variables from .env.local
 */
function loadEnvironmentVariables() {
  const path = require('path')
  const fs = require('fs')

  const envLocalPath = path.join(process.cwd(), '.env.local')

  if (fs.existsSync(envLocalPath)) {
    console.log('Loading environment variables from .env.local')
    const envContent = fs.readFileSync(envLocalPath, 'utf8')

    envContent.split('\n').forEach(line => {
      const trimmedLine = line.trim()
      if (trimmedLine && !trimmedLine.startsWith('#') && trimmedLine.includes('=')) {
        const [key, ...valueParts] = trimmedLine.split('=')
        const value = valueParts.join('=').replace(/^"(.*)"$/, '$1')
        process.env[key.trim()] = value.trim()
      }
    })
    console.log('✅ Environment variables loaded from .env.local')
  } else {
    console.warn('⚠️  .env.local file not found, using default environment')
  }
}

/**
 * Run database setup (migrations and seeding)
 */
async function runDatabaseSetup() {
  try {
    console.log('🗄️  Running database migrations...')

    await execAsync('npx prisma migrate deploy', {
      cwd: process.cwd(),
      env: { ...process.env }
    })
    console.log('✅ Database migrations completed successfully')

    console.log('🌱 Running database seeding...')

    await execAsync('npm run seed:migration', {
      cwd: process.cwd(),
      env: { ...process.env }
    })
    console.log('✅ Database seeding completed successfully')

  } catch (error) {
    console.error('⚠️  Database setup warning:', error.message)
    console.log('📖 Database setup had issues but server will continue')
    console.log('   You can run seeding manually: npm run seed:migration')
  }
}

// Load environment variables from .env.local first
loadEnvironmentVariables()

app.prepare()
  .then(async () => {
    // Run database setup before starting server
    await runDatabaseSetup()
  })
  .then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  })
  .once('error', (err) => {
    console.error(err)
    process.exit(1)
  })
  .listen(port, () => {
    console.log(`> Multi-Business Platform ready on http://${hostname}:${port}`)
  })
})