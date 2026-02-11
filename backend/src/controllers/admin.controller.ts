// Admin controller for webhook management operations
import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { WebhookService } from '../services/webhook.service';
import { SecurityUtils } from '../utils/security';



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
