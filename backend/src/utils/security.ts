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
