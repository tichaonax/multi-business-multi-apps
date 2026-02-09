/**
 * Custom Next.js Server with Socket.io Support
 *
 * This server wraps the Next.js application and adds Socket.io functionality
 * for real-time customer display synchronization across separate devices.
 */

import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import { initSocketServer } from './src/lib/customer-display/socket-server'

const dev = process.env.NODE_ENV !== 'production'
const hostname = '0.0.0.0'
const port = parseInt(process.env.PORT || '8080', 10)

// Initialize Next.js app
const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  // Create HTTP server
  const httpServer = createServer((req, res) => {
    try {
      const parsedUrl = parse(req.url!, true)
      handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('Internal server error')
    }
  })

  // Initialize Socket.io on the HTTP server
  const io = initSocketServer(httpServer)
  console.log('[Server] Socket.io server initialized')

  // Start listening
  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`)
    console.log(`> Socket.io ready for connections`)
  })

  // Graceful shutdown
  const gracefulShutdown = () => {
    console.log('\n[Server] Shutting down gracefully...')
    io.close(() => {
      console.log('[Server] Socket.io server closed')
      httpServer.close(() => {
        console.log('[Server] HTTP server closed')
        process.exit(0)
      })
    })
  }

  process.on('SIGTERM', gracefulShutdown)
  process.on('SIGINT', gracefulShutdown)
})
