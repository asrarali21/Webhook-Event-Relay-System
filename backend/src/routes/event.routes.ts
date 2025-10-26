// Event routes for receiving internal events
import { Router } from 'express';
import { EventController } from '../controllers/event.controller';

const router = Router();

// Middleware for request logging
const requestLogger = (req: any, res: any, next: any) => {
  const startTime = Date.now();
  const originalSend = res.send;
  
  res.send = function(data: any) {
    const duration = Date.now() - startTime;
    console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
    originalSend.call(this, data);
  };
  
  next();
};

// Apply request logging middleware
router.use(requestLogger);

// POST /api/v1/events - Receive internal events from AlgoHire modules
router.post('/', EventController.processEvent);

// GET /api/v1/events/:eventId - Get event details (for debugging/admin)
router.get('/:eventId', EventController.getEventById);

export default router;
