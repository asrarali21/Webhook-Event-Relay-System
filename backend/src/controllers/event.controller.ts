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
      try {
        await WebhookService.queueWebhookDeliveries(event.id, eventType);
        console.log(`📤 Webhook deliveries queued for event: ${event.id}`);
      } catch (queueError) {
        console.error(`⚠️ Failed to queue webhook deliveries for event ${event.id}:`, queueError);
        // Don't fail the request if queuing fails - event is still stored
      }

      const processingTime = Date.now() - startTime;

      // Return 202 Accepted as per requirements
      return res.status(202).json({
        success: true,
        message: 'Event accepted and queued for processing',
        eventId: event.id,
        eventType: event.event_type,
        idempotencyKey: event.idempotency_key,
        receivedAt: event.received_at,
        processingTimeMs: processingTime
      });

    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error('❌ Error processing event:', error);
      console.error('❌ Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined
      });
      
      // Handle specific database errors
      if (error instanceof Error && error.message.includes('Unique constraint')) {
        return res.status(409).json({
          success: false,
          error: 'Event with this idempotency key already exists',
          code: 'DUPLICATE_IDEMPOTENCY_KEY',
          processingTimeMs: processingTime
        });
      }

      return res.status(500).json({
        success: false,
        error: 'Internal server error while processing event',
        code: 'INTERNAL_ERROR',
        processingTimeMs: processingTime
      });
    }
  }

  // Validate incoming event request
  private static validateEventRequest(body: any): { isValid: boolean; error?: string } {
    if (!body || typeof body !== 'object') {
      return { isValid: false, error: 'Request body must be a valid JSON object' };
    }

    const { eventType, payload } = body;

    // Validate eventType
    if (!eventType || typeof eventType !== 'string') {
      return { isValid: false, error: 'eventType is required and must be a string' };
    }

    if (eventType.trim().length === 0) {
      return { isValid: false, error: 'eventType cannot be empty' };
    }

    // Validate eventType format (alphanumeric with dots and underscores)
    const eventTypeRegex = /^[a-zA-Z0-9._-]+$/;
    if (!eventTypeRegex.test(eventType)) {
      return { isValid: false, error: 'eventType must contain only alphanumeric characters, dots, underscores, and hyphens' };
    }

    // Validate payload
    if (payload === undefined || payload === null) {
      return { isValid: false, error: 'payload is required' };
    }

    if (typeof payload !== 'object') {
      return { isValid: false, error: 'payload must be an object' };
    }

    // Check payload size (prevent extremely large payloads)
    const payloadString = JSON.stringify(payload);
    if (payloadString.length > 1024 * 1024) { // 1MB limit
      return { isValid: false, error: 'payload size exceeds 1MB limit' };
    }

    return { isValid: true };
  }

  // Get event by ID (for debugging/admin purposes)
  static async getEventById(req: Request, res: Response): Promise<Response> {
    try {
      const { eventId } = req.params;

      if (!eventId) {
        return res.status(400).json({
          success: false,
          error: 'Event ID is required',
          code: 'MISSING_EVENT_ID'
        });
      }

      const event = await prisma.event.findUnique({
        where: { id: eventId },
        include: {
          delivery_logs: {
            include: {
              subscription: {
                select: {
                  id: true,
                  event_type: true,
                  target_url: true,
                  is_active: true
                }
              }
            },
            orderBy: {
              attempted_at: 'desc'
            }
          }
        }
      });

      if (!event) {
        return res.status(404).json({
          success: false,
          error: 'Event not found',
          code: 'EVENT_NOT_FOUND'
        });
      }

      return res.status(200).json({
        success: true,
        event: {
          id: event.id,
          eventType: event.event_type,
          idempotencyKey: event.idempotency_key,
          payload: event.payload,
          receivedAt: event.received_at,
          deliveryLogs: event.delivery_logs
        }
      });

    } catch (error) {
      console.error('Error fetching event:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  }
}
