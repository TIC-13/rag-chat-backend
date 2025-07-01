import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { PrismaClient } from '../generated/prisma';

// Initialize Express app and Prisma client
const app: Application = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req: Request, res: Response): void => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Get all reports
app.get('/reports', (req: Request, res: Response): void => {
  prisma.report.findMany({
    orderBy: {
      createdAt: 'desc'
    }
  })
  .then(reports => {
    res.status(200).json({
      success: true,
      data: reports,
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

// Create new report
app.post('/reports', (req: Request, res: Response): void => {
  const { content } = req.body;
  
  if (!content || typeof content !== 'string') {
    res.status(400).json({
      success: false,
      error: 'Content is required and must be a string'
    });
    return;
  }
  
  prisma.report.create({
    data: {
      content: content.trim()
    }
  })
  .then(report => {
    res.status(201).json({
      success: true,
      data: report,
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
});

// 404 handler
app.use((req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Global error handler
app.use((error: Error, req: Request, res: Response, next: NextFunction): void => {
  console.error('Error:', error);
  
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
});

export default app;