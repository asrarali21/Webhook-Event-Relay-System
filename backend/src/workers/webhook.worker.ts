 // Queue individual webhook delivery job
  private static async queueIndividualDelivery(eventId: string, subscriptionId: string) {
    try {
      const queue = this.getQueue();
      await queue.add('deliver-webhook', {
        type: 'deliver-webhook',
        eventId,
        subscriptionId
      }, {
        attempts: parseInt(process.env.MAX_RETRY_ATTEMPTS || '3'),
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 10,
        removeOnFail: 5,
      });
    } catch (error) {
      console.error(`❌ Failed to queue individual delivery for event ${eventId}, subscription ${subscriptionId}:`, error);
      throw error;
    }
  }

  // Process individual webhook delivery
  private static async processWebhookDelivery(job: any) {
    const { eventId, subscriptionId } = job.data;
    
    try {
      console.log(`🔄 Processing individual webhook delivery for event ${eventId}, subscription ${subscriptionId}`);

      // Fetch event and subscription data
      const [event, subscription] = await Promise.all([
        prisma.event.findUnique({ where: { id: eventId } }),
        prisma.subscription.findUnique({ where: { id: subscriptionId } })
      ]);

      if (!event) {
        throw new Error(`Event not found: ${eventId}`);
      }

      if (!subscription) {
        throw new Error(`Subscription not found: ${subscriptionId}`);
      }

      if (!subscription.is_active) {
        throw new Error(`Subscription is inactive: ${subscriptionId}`);
      }

      // Create delivery log entry
      const deliveryLog = await prisma.deliveryLog.create({
        data: {
          event_id: eventId,
          subscription_id: subscriptionId,
          status: 'pending',
          attempt_count: 1,
          attempted_at: new Date()
        }
      });

      try {
        // Prepare webhook payload
        const payload = JSON.stringify({
          id: event.id,
          eventType: event.event_type,
          payload: event.payload,
          receivedAt: event.received_at,
          idempotencyKey: event.idempotency_key
        });

        // Generate secure headers
        const headers = SecurityUtils.generateWebhookHeaders(
          payload,
          subscription.secret_key,
          event.event_type,
          event.id
        );

        // Send webhook
        const timeout = parseInt(process.env.WEBHOOK_TIMEOUT || '30000');
        const response = await axios.post(subscription.target_url, payload, {
          headers,
          timeout,
          validateStatus: (status) => status >= 200 && status < 300
        });

        // Update delivery log with success
        await prisma.deliveryLog.update({
          where: { id: deliveryLog.id },
          data: {
            status: 'success',
            response_status_code: response.status,
            response_body: JSON.stringify(response.data).substring(0, 1000), // Limit response body size
            attempted_at: new Date()
          }
        });

        console.log(`✅ Webhook delivered successfully to ${subscription.target_url} (status: ${response.status})`);
        return { 
          success: true, 
          statusCode: response.status,
          deliveryLogId: deliveryLog.id
        };

      } catch (deliveryError: any) {
        // Update delivery log with failure
        const errorMessage = deliveryError.message || 'Unknown error';
        const statusCode = deliveryError.response?.status || 0;
        const responseBody = deliveryError.response?.data ? 
          JSON.stringify(deliveryError.response.data).substring(0, 1000) : null;

        await prisma.deliveryLog.update({
          where: { id: deliveryLog.id },
          data: {
            status: 'failed',
            response_status_code: statusCode,
            response_body: responseBody,
            error_message: errorMessage,
            attempted_at: new Date()
          }
        });

        console.error(`❌ Webhook delivery failed to ${subscription.target_url}:`, errorMessage);
        throw deliveryError;
      }

    } catch (error) {
      console.error(`❌ Webhook delivery processing failed for event ${eventId}, subscription ${subscriptionId}:`, error);
      throw error;
    }
  }

  // Get the queue instance (helper method)
  private static getQueue() {
    // Import WebhookService to get queue instance
    const { WebhookService } = require('../services/webhook.service');
    return WebhookService.getQueue();
  }

  // Graceful shutdown
  static async shutdown() {
    try {
      if (this.worker) {
        await this.worker.close();
        console.log('✅ Webhook worker closed');
      }
      if (this.redisClient) {
        await this.redisClient.quit();
        console.log('✅ Worker Redis connection closed');
      }
    } catch (error) {
      console.error('❌ Error during worker shutdown:', error);
    }
  }
}
