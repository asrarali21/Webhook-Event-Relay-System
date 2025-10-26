// Webhook service for handling webhook delivery logic
import { Queue } from 'bullmq';
import { createClient } from 'redis';

export class WebhookService {
  private static webhookQueue: Queue;
  private static redisClient: any;
  private static isInitialized = false;

  // Initialize the webhook service
  static async initialize() {
    if (this.isInitialized) {
      return;
    }

    try {
      // Initialize Redis connection
      this.redisClient = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        socket: {
          tls: process.env.REDIS_URL?.startsWith('rediss://') ? true : false,
          rejectUnauthorized: false // For self-signed certificates
        }
      });
      
      await this.redisClient.connect();
      console.log('✅ Redis connected successfully');

      // Initialize BullMQ queue
      this.webhookQueue = new Queue('webhook-delivery', {
        connection: this.redisClient,
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 50,
        }
      });
      
      this.isInitialized = true;
      console.log('✅ Webhook queue initialized');
    } catch (error) {
      console.error('❌ Failed to initialize webhook service:', error);
      throw error;
    }
  }

  // Get the webhook queue instance
  static getQueue(): Queue {
    if (!this.isInitialized || !this.webhookQueue) {
      throw new Error('WebhookService not initialized. Call initialize() first.');
    }
    return this.webhookQueue;
  }

  // Queue webhook delivery job for all active subscriptions of an event type
  static async queueWebhookDeliveries(eventId: string, eventType: string) {
    try {
      const queue = this.getQueue();
      
      // Add job to process all webhook deliveries for this event
      await queue.add('process-webhook-deliveries', {
        type: 'process-webhook-deliveries',
        eventId,
        eventType
      }, {
        attempts: 1, // This job itself doesn't retry, individual webhook deliveries do
        removeOnComplete: 10,
        removeOnFail: 5,
      });
      
      console.log(`📤 Queued webhook deliveries for event ${eventId} (type: ${eventType})`);
    } catch (error) {
      console.error('Error queuing webhook deliveries:', error);
      throw error;
    }
  }

  // Queue individual webhook delivery job
  static async queueWebhookDelivery(eventId: string, subscriptionId: string) {
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
      
      console.log(`📤 Queued individual webhook delivery for event ${eventId}, subscription ${subscriptionId}`);
    } catch (error) {
      console.error('Error queuing webhook delivery:', error);
      throw error;
    }
  }

  // Get queue statistics
  static async getQueueStats() {
    try {
      const queue = this.getQueue();
      const waiting = await queue.getWaiting();
      const active = await queue.getActive();
      const completed = await queue.getCompleted();
      const failed = await queue.getFailed();

      return {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length
      };
    } catch (error) {
      console.error('Error getting queue stats:', error);
      throw error;
    }
  }

  // Graceful shutdown
  static async shutdown() {
    try {
      if (this.webhookQueue) {
        await this.webhookQueue.close();
        console.log('✅ Webhook queue closed');
      }
      if (this.redisClient) {
        await this.redisClient.quit();
        console.log('✅ Redis connection closed');
      }
    } catch (error) {
      console.error('Error during shutdown:', error);
    }
  }
}
