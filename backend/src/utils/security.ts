// Security utilities for HMAC signature generation and validation
import crypto from 'crypto';

export class SecurityUtils {
  // Generate HMAC signature for webhook payload
  static generateHmacSignature(payload: string, secret: string): string {
    return crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
  }

  // Verify HMAC signature
  static verifyHmacSignature(
    payload: string, 
    signature: string, 
    secret: string
  ): boolean {
    const expectedSignature = this.generateHmacSignature(payload, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }

  // Generate webhook signature header value
  static generateWebhookSignature(payload: string, secret: string): string {
    const signature = this.generateHmacSignature(payload, secret);
    return `sha256=${signature}`;
  }

  // Verify webhook signature from header
  static verifyWebhookSignature(
    payload: string,
    signatureHeader: string,
    secret: string
  ): boolean {
    if (!signatureHeader.startsWith('sha256=')) {
      return false;
    }
    
    const signature = signatureHeader.substring(7); // Remove 'sha256=' prefix
    return this.verifyHmacSignature(payload, signature, secret);
  }

  // Generate random secret key for webhook subscriptions
  static generateSecretKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  // Generate idempotency key
  static generateIdempotencyKey(): string {
    return crypto.randomUUID();
  }

  // Validate webhook URL format
  static isValidWebhookUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.protocol === 'https:' || parsedUrl.protocol === 'http:';
    } catch {
      return false;
    }
  }

  // Generate secure headers for webhook delivery
  static generateWebhookHeaders(payload: string, secret: string, eventType: string, eventId: string) {
    const signature = this.generateWebhookSignature(payload, secret);
    const timestamp = Math.floor(Date.now() / 1000).toString();
    
    return {
      'Content-Type': 'application/json',
      'X-AlgoHire-Signature': signature,
      'X-AlgoHire-Timestamp': timestamp,
      'X-AlgoHire-Event-Type': eventType,
      'X-AlgoHire-Event-ID': eventId,
      'User-Agent': 'AlgoHire-Webhook-Relay/1.0'
    };
  }

  // Validate timestamp to prevent replay attacks (5 minute window)
  static isValidTimestamp(timestamp: string): boolean {
    try {
      const timestampMs = parseInt(timestamp) * 1000;
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds
      
      return Math.abs(now - timestampMs) <= fiveMinutes;
    } catch {
      return false;
    }
  }
}
