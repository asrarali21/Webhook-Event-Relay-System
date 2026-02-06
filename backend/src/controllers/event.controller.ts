// Event controller for handling event-related operations
import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { WebhookService } from '../services/webhook.service';
import { SecurityUtils } from '../utils/security';

export interface EventRequest {
  eventType: string;
  payload: any;
  idempotencyKey?: string;
}

export class EventController {
  // Process incoming events from internal AlgoHire modules
  static async processEvent(req: Request, res: Response): Promise<Response> {
    const startTime = Date.now();
    console.log('🎯 EventController.processEvent called');
    
    try {
      // Extract idempotency key from header (required by problem statement)
      const idempotencyKey = req.headers['x-idempotency-key'] as string;
      
      if (!idempotencyKey) {
        return res.status(400).json({
          success: false,
          error: 'Missing required header: x-idempotency-key',
          code: 'MISSING_IDEMPOTENCY_KEY'
        });
      }


      console.log(`✅ Event stored successfully: ${event.id} (type: ${eventType})`);

      // Queue webhook deliveries for background processing
      
