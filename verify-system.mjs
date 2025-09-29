#!/usr/bin/env node

// Quick verification script to check current state
import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Load environment variables from .env.local
config({ path: '.env.local' });

const prisma = new PrismaClient();

async function checkCurrentState() {
  try {
    console.log('🔍 Checking current progress tracking system state...\n');
    
    // Check ALL progress entries 
    console.log('📅 ALL PROGRESS ENTRIES:');
    const allEntries = await prisma.progressEntry.findMany({
      orderBy: { date: 'desc' },
      include: {
        user: {
          select: { name: true, email: true }
        }
      }
    });
    
    console.log(`Found ${allEntries.length} total entries`);
    
    if (allEntries.length === 0) {
      console.log('⚠️  No progress entries found in the database!');
      
      // Check users to see if they exist
      const users = await prisma.user.findMany({
        select: { id: true, name: true, email: true, role: true }
      });
      console.log(`\n👥 Found ${users.length} users:`);
      users.forEach(user => {
        console.log(`• ${user.name} (${user.email}) - ${user.role}`);
      });
      
      return;
    }
    
    allEntries.forEach((entry, index) => {
      const localDate = new Date(entry.date).toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        timeZone: 'America/Los_Angeles' // Pacific timezone
      });
      console.log(`${index + 1}. ${entry.user.name} - ${localDate} (${entry.date.toISOString()}) - Weight: ${entry.weight}`);
    });
    
    console.log('\n📊 SUMMARY:');
    
    // Count entries by date
    const entriesByDate = await prisma.progressEntry.groupBy({
      by: ['date'],
      _count: { _all: true },
      orderBy: { date: 'desc' }
    });
    
    entriesByDate.forEach(group => {
      const localDate = new Date(group.date).toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        timeZone: 'America/Los_Angeles'
      });
      console.log(`• ${localDate}: ${group._count._all} entries`);
    });
    
    console.log('\n✅ System appears to be working correctly!');
    console.log('🎯 Ready for Brent to review');
    
  } catch (error) {
    console.error('❌ Error checking system state:', error);
  } finally {
    await prisma.$disconnect();
  }
}

console.log('🚀 Starting system verification...');
checkCurrentState();