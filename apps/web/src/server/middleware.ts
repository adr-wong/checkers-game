import { Context, Next } from 'hono'

// CORS middleware configuration
const allowedOrigins = ['http://localhost:3000', 'http://localhost:5173']
const corsMiddleware = async (c: Context, next: Next) => {
  const origin = c.req.header('Origin')
  
  if (origin && allowedOrigins.includes(origin)) {
    c.header('Access-Control-Allow-Origin', origin)
    c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    c.header('Access-Control-Allow-Credentials', 'true')
  }
  
  // Handle preflight requests
  if (c.req.method === 'OPTIONS') {
    return c.newResponse(null, 204)
  }
  
  await next()
}

// Request logging middleware
const loggingMiddleware = async (c: Context, next: Next) => {
  const start = Date.now()
  
  await next()
  
  const duration = Date.now() - start
  console.log(`[${c.req.method}] ${c.req.path} - ${c.res.status} (${duration}ms)`)
}

// Error handling middleware
const errorHandlingMiddleware = async (c: Context, next: Next) => {
  try {
    await next()
  } catch (err) {
    console.error('Error:', err)
    
    if (err instanceof Error) {
      return c.json(
        { error: err.message || 'Internal Server Error' },
        err.name === 'ValidationError' ? 400 : 500
      )
    }
    
    return c.json({ error: 'Internal Server Error' }, 500)
  }
}

export { corsMiddleware, loggingMiddleware, errorHandlingMiddleware }
