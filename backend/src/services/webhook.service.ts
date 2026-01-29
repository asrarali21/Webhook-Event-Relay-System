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

