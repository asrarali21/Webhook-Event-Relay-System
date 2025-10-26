// Admin controller for webhook management operations
import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { WebhookService } from '../services/webhook.service';
import { SecurityUtils } from '../utils/security';

export class AdminController {
  // Get all webhook subscriptions
  static async getSubscriptions(req: Request, res: Response): Promise<Response> {
    try {
      const { page = 1, limit = 10, eventType, isActive } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const where: any = {};
      if (eventType) where.event_type = eventType;
      if (isActive !== undefined) where.is_active = isActive === 'true';

      const [subscriptions, total] = await Promise.all([
        prisma.subscription.findMany({
          where,
          skip,
          take: Number(limit),
          orderBy: { created_at: 'desc' },
          include: {
            _count: {
              select: { delivery_logs: true }
            }
          }
        }),
        prisma.subscription.count({ where })
      ]);

      return res.status(200).json({
        success: true,
        subscriptions: subscriptions.map(sub => ({
          id: sub.id,
          eventType: sub.event_type,
          targetUrl: sub.target_url,
          isActive: sub.is_active,
          createdAt: sub.created_at,
          updatedAt: sub.updated_at,
          deliveryCount: sub._count.delivery_logs
        })),
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch subscriptions',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  // Create new webhook subscription
  static async createSubscription(req: Request, res: Response): Promise<Response> {
    try {
      const { eventType, targetUrl, description } = req.body;

      // Validate input
      if (!eventType || !targetUrl) {
        return res.status(400).json({
          success: false,
          error: 'eventType and targetUrl are required',
          code: 'VALIDATION_ERROR'
        });
      }

      if (!SecurityUtils.isValidWebhookUrl(targetUrl)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid webhook URL format',
          code: 'INVALID_URL'
        });
      }

      // Check for duplicate subscription
      const existingSubscription = await prisma.subscription.findFirst({
        where: {
          event_type: eventType,
          target_url: targetUrl,
          is_active: true
        }
      });

      if (existingSubscription) {
        return res.status(409).json({
          success: false,
          error: 'Active subscription already exists for this event type and URL',
          code: 'DUPLICATE_SUBSCRIPTION'
        });
      }

      // Generate secret key for HMAC signing
      const secretKey = SecurityUtils.generateSecretKey();

      // Create subscription
      const subscription = await prisma.subscription.create({
        data: {
          event_type: eventType,
          target_url: targetUrl,
          secret_key: secretKey,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        }
      });

      console.log(`✅ Created subscription: ${subscription.id} for event type: ${eventType}`);

      return res.status(201).json({
        success: true,
        message: 'Subscription created successfully',
        subscription: {
          id: subscription.id,
          eventType: subscription.event_type,
          targetUrl: subscription.target_url,
          isActive: subscription.is_active,
          createdAt: subscription.created_at,
          secretKey: subscription.secret_key // Include secret key for client to store
        }
      });
    } catch (error) {
      console.error('Error creating subscription:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to create subscription',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  // Update subscription
  static async updateSubscription(req: Request, res: Response): Promise<Response> {
    try {
      const { subscriptionId } = req.params;
      const { eventType, targetUrl, isActive } = req.body;

      if (!subscriptionId) {
        return res.status(400).json({
          success: false,
          error: 'Subscription ID is required',
          code: 'MISSING_SUBSCRIPTION_ID'
        });
      }

      const updateData: any = { updated_at: new Date() };
      if (eventType !== undefined) updateData.event_type = eventType;
      if (targetUrl !== undefined) {
        if (!SecurityUtils.isValidWebhookUrl(targetUrl)) {
          return res.status(400).json({
            success: false,
            error: 'Invalid webhook URL format',
            code: 'INVALID_URL'
          });
        }
        updateData.target_url = targetUrl;
      }
      if (isActive !== undefined) updateData.is_active = isActive;

      const subscription = await prisma.subscription.update({
        where: { id: subscriptionId },
        data: updateData
      });

      console.log(`✅ Updated subscription: ${subscription.id}`);

      return res.status(200).json({
        success: true,
        message: 'Subscription updated successfully',
        subscription: {
          id: subscription.id,
          eventType: subscription.event_type,
          targetUrl: subscription.target_url,
          isActive: subscription.is_active,
          createdAt: subscription.created_at,
          updatedAt: subscription.updated_at
        }
      });
    } catch (error) {
      console.error('Error updating subscription:', error);
      if (error instanceof Error && error.message.includes('Record to update not found')) {
        return res.status(404).json({
          success: false,
          error: 'Subscription not found',
          code: 'SUBSCRIPTION_NOT_FOUND'
        });
      }
      return res.status(500).json({
        success: false,
        error: 'Failed to update subscription',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  // Delete subscription
  static async deleteSubscription(req: Request, res: Response): Promise<Response> {
    try {
      const { subscriptionId } = req.params;

      if (!subscriptionId) {
        return res.status(400).json({
          success: false,
          error: 'Subscription ID is required',
          code: 'MISSING_SUBSCRIPTION_ID'
        });
      }

      await prisma.subscription.delete({
        where: { id: subscriptionId }
      });

      console.log(`✅ Deleted subscription: ${subscriptionId}`);

      return res.status(200).json({
        success: true,
        message: 'Subscription deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting subscription:', error);
      if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
        return res.status(404).json({
          success: false,
          error: 'Subscription not found',
          code: 'SUBSCRIPTION_NOT_FOUND'
        });
      }
      return res.status(500).json({
        success: false,
        error: 'Failed to delete subscription',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  // Get delivery logs with filtering and pagination
  static async getDeliveryLogs(req: Request, res: Response): Promise<Response> {
    try {
      const { 
        page = 1, 
        limit = 20, 
        eventId, 
        subscriptionId, 
        status, 
        eventType,
        startDate,
        endDate
      } = req.query;

      const skip = (Number(page) - 1) * Number(limit);

      const where: any = {};
      if (eventId) where.event_id = eventId;
      if (subscriptionId) where.subscription_id = subscriptionId;
      if (status) where.status = status;
      if (eventType) {
        where.event = {
          event_type: eventType
        };
      }
      if (startDate || endDate) {
        where.attempted_at = {};
        if (startDate) where.attempted_at.gte = new Date(startDate as string);
        if (endDate) where.attempted_at.lte = new Date(endDate as string);
      }

      const [logs, total] = await Promise.all([
        prisma.deliveryLog.findMany({
          where,
          skip,
          take: Number(limit),
          orderBy: { attempted_at: 'desc' },
          include: {
            event: {
              select: {
                id: true,
                event_type: true,
                received_at: true
              }
            },
            subscription: {
              select: {
                id: true,
                event_type: true,
                target_url: true,
                is_active: true
              }
            }
          }
        }),
        prisma.deliveryLog.count({ where })
      ]);

      return res.status(200).json({
        success: true,
        logs: logs.map(log => ({
          id: log.id,
          status: log.status,
          attemptCount: log.attempt_count,
          attemptedAt: log.attempted_at,
          responseStatusCode: log.response_status_code,
          responseBody: log.response_body,
          errorMessage: log.error_message,
          event: log.event,
          subscription: log.subscription
        })),
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error) {
      console.error('Error fetching delivery logs:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch delivery logs',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  // Retry failed delivery
  static async retryFailedDelivery(req: Request, res: Response): Promise<Response> {
    try {
      const { logId } = req.params;

      if (!logId) {
        return res.status(400).json({
          success: false,
          error: 'Delivery log ID is required',
          code: 'MISSING_LOG_ID'
        });
      }

      // Get the delivery log with related data
      const deliveryLog = await prisma.deliveryLog.findUnique({
        where: { id: logId },
        include: {
          event: true,
          subscription: true
        }
      });

      if (!deliveryLog) {
        return res.status(404).json({
          success: false,
          error: 'Delivery log not found',
          code: 'LOG_NOT_FOUND'
        });
      }

      if (deliveryLog.status === 'success') {
        return res.status(400).json({
          success: false,
          error: 'Cannot retry successful delivery',
          code: 'INVALID_RETRY'
        });
      }

      if (!deliveryLog.subscription.is_active) {
        return res.status(400).json({
          success: false,
          error: 'Cannot retry delivery for inactive subscription',
          code: 'INACTIVE_SUBSCRIPTION'
        });
      }

      // Queue the retry job
      await WebhookService.queueWebhookDelivery(deliveryLog.event_id, deliveryLog.subscription_id);

      console.log(`🔄 Queued retry for delivery log: ${logId}`);

      return res.status(200).json({
        success: true,
        message: 'Retry job queued successfully',
        logId: logId,
        eventId: deliveryLog.event_id,
        subscriptionId: deliveryLog.subscription_id
      });
    } catch (error) {
      console.error('Error retrying failed delivery:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to retry delivery',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  // Get system statistics
  static async getSystemStats(req: Request, res: Response): Promise<Response> {
    try {
      const [
        totalEvents,
        totalSubscriptions,
        activeSubscriptions,
        totalDeliveries,
        successfulDeliveries,
        failedDeliveries,
        pendingDeliveries
      ] = await Promise.all([
        prisma.event.count(),
        prisma.subscription.count(),
        prisma.subscription.count({ where: { is_active: true } }),
        prisma.deliveryLog.count(),
        prisma.deliveryLog.count({ where: { status: 'success' } }),
        prisma.deliveryLog.count({ where: { status: 'failed' } }),
        prisma.deliveryLog.count({ where: { status: 'pending' } })
      ]);

      const successRate = totalDeliveries > 0 ? (successfulDeliveries / totalDeliveries) * 100 : 0;

      return res.status(200).json({
        success: true,
        stats: {
          events: {
            total: totalEvents
          },
          subscriptions: {
            total: totalSubscriptions,
            active: activeSubscriptions,
            inactive: totalSubscriptions - activeSubscriptions
          },
          deliveries: {
            total: totalDeliveries,
            successful: successfulDeliveries,
            failed: failedDeliveries,
            pending: pendingDeliveries,
            successRate: Math.round(successRate * 100) / 100
          },
          queue: {
            pending: 0,
            processing: 0
          }
        }
      });
    } catch (error) {
      console.error('Error fetching system stats:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch system statistics',
        code: 'INTERNAL_ERROR'
      });
    }
  }
}
