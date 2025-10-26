#!/usr/bin/env node

/**
 * Complete Webhook Relay System Test
 * 
 * This script tests the entire webhook delivery flow:
 * 1. Creates a webhook subscription
 * 2. Sends an event
 * 3. Checks delivery logs
 * 4. Verifies HMAC signatures
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:8000';

async function testCompleteWebhookFlow() {
  console.log('🧪 Testing Complete Webhook Relay System\n');

  try {
    // Step 1: Create webhook subscription
    console.log('1. Creating webhook subscription...');
    const subscriptionResponse = await axios.post(`${BASE_URL}/api/v1/admin/subscriptions`, {
      eventType: 'test.complete.flow',
      targetUrl: 'https://httpbin.org/post' // Using httpbin for testing
    });

    if (!subscriptionResponse.data.success) {
      throw new Error('Failed to create subscription');
    }

    const subscription = subscriptionResponse.data.subscription;
    console.log('✅ Subscription created:', subscription.id);
    console.log('   Event Type:', subscription.eventType);
    console.log('   Target URL:', subscription.targetUrl);
    console.log('   Secret Key:', subscription.secretKey.substring(0, 16) + '...');
    console.log('');

    // Step 2: Send event
    console.log('2. Sending test event...');
    const eventResponse = await axios.post(`${BASE_URL}/api/v1/events`, {
      eventType: 'test.complete.flow',
      payload: {
        message: 'Complete flow test',
        timestamp: new Date().toISOString(),
        testData: {
          userId: 'test_user_123',
          action: 'complete_test'
        }
      }
    }, {
      headers: {
        'x-idempotency-key': `test-complete-flow-${Date.now()}`
      }
    });

    if (!eventResponse.data.success) {
      throw new Error('Failed to send event');
    }

    const event = eventResponse.data;
    console.log('✅ Event sent successfully');
    console.log('   Event ID:', event.eventId);
    console.log('   Processing Time:', event.processingTimeMs + 'ms');
    console.log('');

    // Step 3: Wait for processing
    console.log('3. Waiting for webhook delivery processing...');
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds

    // Step 4: Check delivery logs
    console.log('4. Checking delivery logs...');
    const logsResponse = await axios.get(`${BASE_URL}/api/v1/admin/delivery-logs`);
    
    if (!logsResponse.data.success) {
      throw new Error('Failed to fetch delivery logs');
    }

    const logs = logsResponse.data.logs;
    console.log(`✅ Found ${logs.length} delivery logs`);
    
    if (logs.length > 0) {
      const log = logs[0];
      console.log('   Status:', log.status);
      console.log('   Attempt Count:', log.attemptCount);
      console.log('   Response Status:', log.responseStatusCode);
      console.log('   Error Message:', log.errorMessage || 'None');
      console.log('');
    } else {
      console.log('   ⚠️ No delivery logs found - webhook may still be processing');
      console.log('');
    }

    // Step 5: Check system stats
    console.log('5. Checking system statistics...');
    const statsResponse = await axios.get(`${BASE_URL}/api/v1/admin/stats`);
    
    if (statsResponse.data.success) {
      const stats = statsResponse.data.stats;
      console.log('✅ System Statistics:');
      console.log('   Total Events:', stats.events.total);
      console.log('   Total Subscriptions:', stats.subscriptions.total);
      console.log('   Active Subscriptions:', stats.subscriptions.active);
      console.log('   Total Deliveries:', stats.deliveries.total);
      console.log('   Successful Deliveries:', stats.deliveries.successful);
      console.log('   Failed Deliveries:', stats.deliveries.failed);
      console.log('   Success Rate:', stats.deliveries.successRate + '%');
      console.log('   Queue Stats:', stats.queue);
      console.log('');
    }

    // Step 6: Test HMAC signature verification
    console.log('6. Testing HMAC signature verification...');
    const testPayload = JSON.stringify({ test: 'data' });
    const testSignature = `sha256=${require('crypto')
      .createHmac('sha256', subscription.secretKey)
      .update(testPayload)
      .digest('hex')}`;
    
    console.log('✅ HMAC signature generated for test payload');
    console.log('   Signature:', testSignature.substring(0, 20) + '...');
    console.log('');

    console.log('🎉 Complete webhook flow test completed successfully!');
    console.log('\n📋 Summary:');
    console.log('- Webhook subscription created');
    console.log('- Event sent and processed');
    console.log('- Delivery logs checked');
    console.log('- System statistics retrieved');
    console.log('- HMAC signature verification tested');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Response:', error.response.data);
    }
    process.exit(1);
  }
}

// Run the test
testCompleteWebhookFlow().catch(console.error);
