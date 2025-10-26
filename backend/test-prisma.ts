// Simple test to check Prisma client
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testPrisma() {
  try {
    console.log('Testing Prisma client...');
    
    // Test connection
    await prisma.$connect();
    console.log('✅ Prisma connected');
    
    // Test simple query
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Raw query works:', result);
    
    // Test event count
    const count = await prisma.event.count();
    console.log('✅ Event count:', count);
    
  } catch (error) {
    console.error('❌ Prisma error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testPrisma();
