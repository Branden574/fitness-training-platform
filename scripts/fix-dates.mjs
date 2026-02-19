#!/usr/bin/env node

// Simple script to fix progress entry dates
import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Load environment variables from .env.local
config({ path: '.env.local' });

const prisma = new PrismaClient();

async function fixProgressDates() {
  try {
    console.log('🔍 Searching for progress entries that need date correction...');
    
    // Find all entries created on September 21, 2025 but should be September 22
    const entriesToFix = await prisma.progressEntry.findMany({
      where: {
        date: {
          gte: new Date('2025-09-21T00:00:00.000Z'),
          lt: new Date('2025-09-22T00:00:00.000Z')
        }
      }
    });
    
    console.log(`📊 Found ${entriesToFix.length} entries that may need fixing`);
    
    if (entriesToFix.length === 0) {
      console.log('✅ No entries found that need date correction.');
      return;
    }
    
    // Show what we found
    entriesToFix.forEach((entry, index) => {
      console.log(`${index + 1}. ID: ${entry.id}, User: ${entry.userId}, Date: ${entry.date.toISOString()}, Weight: ${entry.weight}`);
    });
    
    console.log('');
    console.log('🔧 Updating entries individually to handle unique constraints...');
    
    let successCount = 0;
    let errorCount = 0;
    
    // Update each entry individually
    for (const entry of entriesToFix) {
      try {
        // Check if there's already an entry for this user on 9/22
        const existingEntry = await prisma.progressEntry.findUnique({
          where: {
            userId_date: {
              userId: entry.userId,
              date: new Date('2025-09-22T12:00:00.000Z')
            }
          }
        });
        
        if (existingEntry) {
          console.log(`⚠️  Entry ${entry.id} - User ${entry.userId} already has entry for 9/22, skipping`);
          continue;
        }
        
        // Update to 9/22
        await prisma.progressEntry.update({
          where: { id: entry.id },
          data: { date: new Date('2025-09-22T12:00:00.000Z') }
        });
        
        console.log(`✅ Updated entry ${entry.id} - User ${entry.userId} from 9/21 to 9/22`);
        successCount++;
        
      } catch (error) {
        console.log(`❌ Failed to update entry ${entry.id}: ${error.message}`);
        errorCount++;
      }
    }
    
    console.log('');
    console.log(`🎉 Fix complete! Successfully updated ${successCount} entries, ${errorCount} errors`);
    
  } catch (error) {
    console.error('❌ Error fixing progress dates:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
console.log('🚀 Starting progress date fix...');
fixProgressDates();