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

      // Validate request body
      const validationResult = EventController.validateEventRequest(req.body);
      if (!validationResult.isValid) {
        return res.status(400).json({
          success: false,
          error: validationResult.error,
          code: 'VALIDATION_ERROR'
        });
      }

      const { eventType, payload } = req.body as EventRequest;

      // Check for duplicate event using idempotency key
      const existingEvent = await prisma.event.findUnique({
        where: { idempotency_key: idempotencyKey }
      });

      if (existingEvent) {
        console.log(`🔄 Duplicate event detected with idempotency key: ${idempotencyKey}`);
        return res.status(202).json({
          success: true,
          message: 'Event already processed (idempotent)',
          eventId: existingEvent.id,
          idempotencyKey: existingEvent.idempotency_key,
          processedAt: existingEvent.received_at
        });
      }

      // Store event in database
      const event = await prisma.event.create({
        data: {
          idempotency_key: idempotencyKey,
          event_type: eventType,
          payload: payload,
          received_at: new Date()
        }
      });

      console.log(`✅ Event stored successfully: ${event.id} (type: ${eventType})`);

      // Queue webhook deliveries for background processing
      
