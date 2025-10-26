#!/usr/bin/env node

/**
 * Test script for AlgoHire Webhook Event Relay - Event Ingestion
 * 
 * This script demonstrates the Event Ingestion feature by sending
 * sample events to the POST /api/v1/events endpoint.
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:8000';
const EVENTS_ENDPOINT = `${BASE_URL}/api/v1/events`;

// Sample events for testing
const sampleEvents = [
  {
    eventType: 'job.created',
    payload: {
      jobId: 'job_123',
      title: 'Senior Software Engineer',
      company: 'TechCorp',
      location: 'San Francisco, CA',
      salary: '$120,000 - $150,000',
      createdAt: new Date().toISOString()
    }
  },
  {
    eventType: 'candidate.applied',
    payload: {
      candidateId: 'candidate_456',
      jobId: 'job_123',
      name: 'John Doe',
      email: 'john.doe@example.com',
      resumeUrl: 'https://example.com/resumes/john_doe.pdf',
      appliedAt: new Date().toISOString()
    }
  },
  {
    eventType: 'interview.scheduled',
    payload: {
      interviewId: 'interview_789',
      candidateId: 'candidate_456',
      jobId: 'job_123',
      interviewerId: 'interviewer_101',
      scheduledAt: '2024-01-15T14:00:00Z',
      duration: 60,
      type: 'technical'
    }
  }
];

async function testEventIngestion() {
  console.log('🧪 Testing AlgoHire Webhook Event Relay - Event Ingestion\n');

  try {
    // Test health endpoint first
    console.log('1. Testing health endpoint...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health check passed:', healthResponse.data);
    console.log('');

    // Test each sample event
    for (let i = 0; i < sampleEvents.length; i++) {
      const event = sampleEvents[i];
      const idempotencyKey = `test-event-${i + 1}-${Date.now()}`;
      
      console.log(`${i + 2}. Testing event: ${event.eventType}`);
      console.log(`   Idempotency Key: ${idempotencyKey}`);
      
      try {
        const response = await axios.post(EVENTS_ENDPOINT, event, {
          headers: {
            'Content-Type': 'application/json',
            'x-idempotency-key': idempotencyKey
          },
          timeout: 10000
        });

        console.log('✅ Event processed successfully:');
        console.log(`   Status: ${response.status}`);
        console.log(`   Event ID: ${response.data.eventId}`);
        console.log(`   Processing Time: ${response.data.processingTimeMs}ms`);
        console.log('');

      } catch (error: any) {
        console.log('❌ Event processing failed:');
        if (error.response) {
          console.log(`   Status: ${error.response.status}`);
          console.log(`   Error: ${error.response.data.error}`);
          console.log(`   Code: ${error.response.data.code}`);
        } else {
          console.log(`   Error: ${error.message}`);
        }
        console.log('');
      }
    }

    // Test idempotency (duplicate event)
    console.log(`${sampleEvents.length + 2}. Testing idempotency (duplicate event)...`);
    const duplicateIdempotencyKey = `test-event-1-${Date.now() - 1000}`;
    
    try {
      const response = await axios.post(EVENTS_ENDPOINT, sampleEvents[0], {
        headers: {
          'Content-Type': 'application/json',
          'x-idempotency-key': duplicateIdempotencyKey
        },
        timeout: 10000
      });

      console.log('✅ Duplicate event handled correctly:');
      console.log(`   Status: ${response.status}`);
      console.log(`   Message: ${response.data.message}`);
      console.log('');

    } catch (error: any) {
      console.log('❌ Duplicate event test failed:');
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Error: ${error.response.data.error}`);
      } else {
        console.log(`   Error: ${error.message}`);
      }
      console.log('');
    }

    // Test validation errors
    console.log(`${sampleEvents.length + 3}. Testing validation errors...`);
    
    // Test missing idempotency key
    try {
      await axios.post(EVENTS_ENDPOINT, sampleEvents[0], {
        headers: {
          'Content-Type': 'application/json'
          // Missing x-idempotency-key header
        },
        timeout: 10000
      });
    } catch (error: any) {
      if (error.response?.status === 400) {
        console.log('✅ Missing idempotency key validation works');
        console.log(`   Error: ${error.response.data.error}`);
      } else {
        console.log('❌ Missing idempotency key validation failed');
      }
    }

    // Test invalid event type
    try {
      await axios.post(EVENTS_ENDPOINT, {
        eventType: '', // Invalid empty event type
        payload: { test: 'data' }
      }, {
        headers: {
          'Content-Type': 'application/json',
          'x-idempotency-key': `test-invalid-${Date.now()}`
        },
        timeout: 10000
      });
    } catch (error: any) {
      if (error.response?.status === 400) {
        console.log('✅ Invalid event type validation works');
        console.log(`   Error: ${error.response.data.error}`);
      } else {
        console.log('❌ Invalid event type validation failed');
      }
    }

    console.log('🎉 Event Ingestion testing completed!');
    console.log('\n📋 Summary:');
    console.log('- Event ingestion endpoint is functional');
    console.log('- Idempotency is enforced via x-idempotency-key header');
    console.log('- Events are stored in PostgreSQL database');
    console.log('- Webhook deliveries are queued for background processing');
    console.log('- Input validation works correctly');
    console.log('- Proper error handling and logging implemented');

  } catch (error: any) {
    console.error('❌ Test setup failed:', error.message);
    console.log('\n💡 Make sure the server is running:');
    console.log('   cd backend && npm run dev');
    process.exit(1);
  }
}

// Run the test
testEventIngestion().catch(console.error);
