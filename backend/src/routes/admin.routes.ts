// Admin routes for webhook management
import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';

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

// Subscription management routes
router.get('/subscriptions', AdminController.getSubscriptions);
router.post('/subscriptions', AdminController.createSubscription);
router.put('/subscriptions/:subscriptionId', AdminController.updateSubscription);
router.delete('/subscriptions/:subscriptionId', AdminController.deleteSubscription);

// Delivery logs and retry routes
router.get('/delivery-logs', AdminController.getDeliveryLogs);
router.post('/delivery-logs/:logId/retry', AdminController.retryFailedDelivery);

// System statistics
router.get('/stats', AdminController.getSystemStats);

export default router;
