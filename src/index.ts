require('dotenv').config({debug: true});

import express, { Application, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { PrismaClient, report } from '../generated/prisma';

// Initialize Express app and Prisma client
const app: Application = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

console.log(`Port ${process.env.PORT} defined at .env`);
console.log(`Database URL ${process.env.DATABASE_URL} defined at .env`);

// Rate limiting configurations
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req: Request, res: Response) => {
    console.log(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: '15 minutes'
    });
  }
});

const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // only 10 requests per 15 minutes for POST endpoints
  message: {
    success: false,
    error: 'Too many requests to this endpoint, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    console.log(`Strict rate limit exceeded for IP: ${req.ip} on ${req.path}`);
    res.status(429).json({
      success: false,
      error: 'Too many requests to this endpoint, please try again later.',
      retryAfter: '15 minutes'
    });
  }
});

const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 5,
  delayMs: (hits) => {
    const delay = hits * 500;
    console.log(`Request #${hits} - Adding ${delay}ms delay`);
    return delay;
  }
});

// Middleware setup
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

app.use(morgan('combined'));

// Apply rate limiting
app.use(speedLimiter);
app.use(generalLimiter);

// Body parsing with different size limits for different endpoints
app.use('/reports', express.json({ limit: '1mb' })); // 1MB limit for reports
app.use('/health', express.json({ limit: '1kb' })); // Very small limit for health check
app.use(express.json({ limit: '100kb' })); // Default smaller limit
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms - IP: ${req.ip}`);
  });
  
  next();
});

// Health check endpoint (no additional rate limiting needed)
app.get('/health', (req: Request, res: Response): void => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Get all reports with light rate limiting
app.get('/reports', (req: Request, res: Response): void => {
  prisma.report.findMany({
    orderBy: {
      createdAt: 'desc'
    }
  })
  .then(reports => {
    res.status(200).json({
      success: true,
      data: getReportsWithStringContent(reports),
      count: reports.length
    });
  })
  .catch(error => {
    console.error('Error fetching reports:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch reports'
    });
  });
});

// Create new report with strict rate limiting and validation
app.post('/reports', 
  strictLimiter, // Apply strict rate limiting
  (req: Request, res: Response): void => {
    const { content } = req.body;
    
    prisma.report.create({
      data: {
        content: Buffer.from(content.trim(), "utf-8")
      }
    })
    .then(report => {
      res.status(201).json({
        success: true,
        data: {
          ...report,
          content: content.trim() // Return the sanitized content
        },
        message: 'Report created successfully'
      });
    })
    .catch(error => {
      console.error('Error creating report:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create report'
      });
    });
  }
);

// 404 handler
app.use((req: Request, res: Response): void => {
  console.log(`404 - Route not found: ${req.method} ${req.path} - IP: ${req.ip}`);
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Global error handler
app.use((error: Error, req: Request, res: Response, next: NextFunction): void => {
  console.error('Error:', error);
  
  // Handle specific error types
  if (error.message.includes('request entity too large')) {
    res.status(413).json({
      success: false,
      error: 'Request payload too large'
    });
    return
  }
  
  if (error.message.includes('invalid json')) {
    res.status(400).json({
      success: false,
      error: 'Invalid JSON format'
    });
    return
  }
  
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { details: error.message })
  });
});

// Graceful shutdown
const gracefulShutdown = async (signal: string): Promise<void> => {
  console.log(`Received ${signal}. Shutting down gracefully...`);
  
  try {
    await prisma.$disconnect();
    console.log('Database connection closed.');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
app.listen(PORT, (): void => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🗄️  Database: Connected via Prisma`);
  console.log(`🛡️  Security: Rate limiting and request validation enabled`);
});

function getReportsWithStringContent(reports: report[]) {
  return reports.map(report => ({...report, content: new TextDecoder().decode(report.content)}))
}

export default app;
