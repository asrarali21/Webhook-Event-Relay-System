

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
