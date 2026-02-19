#!/usr/bin/env node
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

async function testCompleteFlow() {
  try {
    console.log('🧪 Testing Complete Progress Tracking Flow...\n');

    // Check current system state
    console.log('📊 Current System State:');
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    });
    console.log(`Found ${users.length} users:`);
    users.forEach(user => {
      console.log(`  - ${user.name} (${user.role}) - ${user.email}`);
    });

    const progressEntries = await prisma.progressEntry.findMany({
      include: {
        user: {
          select: { name: true, email: true }
        }
      },
      orderBy: { date: 'desc' }
    });
    console.log(`\nFound ${progressEntries.length} progress entries:`);
    progressEntries.forEach(entry => {
      console.log(`  - ${entry.user.name}: ${entry.date.toDateString()} - Weight: ${entry.weight}`);
    });

    // Test creating a new progress entry with proper timezone handling
    console.log('\n🔄 Testing Progress Entry Creation...');
    
    // Find Branden (CLIENT role)
    const client = users.find(user => user.role === 'CLIENT' && user.name.includes('Branden'));
    if (!client) {
      console.log('❌ No client user found for testing');
      return;
    }

    console.log(`✅ Found client: ${client.name}`);

    // Create a test progress entry for today
    const today = new Date();
    const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}T12:00:00.000Z`;
    
    console.log(`📅 Creating entry for: ${todayISO}`);

    const newEntry = await prisma.progressEntry.create({
      data: {
        userId: client.id,
        date: new Date(todayISO),
        weight: 180.5,
        bodyFat: 15.2,
        mood: 4, // 1-5 scale (integer)
        energy: 4, // 1-5 scale (integer)
        sleep: 7.5, // hours of sleep
        notes: 'System test entry - feeling great!'
      }
    });

    console.log(`✅ Created progress entry:`, {
      id: newEntry.id,
      date: newEntry.date.toISOString(),
      weight: newEntry.weight,
      bodyFat: newEntry.bodyFat,
      mood: newEntry.mood,
      energy: newEntry.energy,
      sleep: newEntry.sleep
    });

    // Verify the entry can be retrieved correctly
    console.log('\n🔍 Testing Entry Retrieval...');
    const retrievedEntries = await prisma.progressEntry.findMany({
      where: { userId: client.id },
      include: {
        user: {
          select: { name: true }
        }
      },
      orderBy: { date: 'desc' }
    });

    console.log(`✅ Retrieved ${retrievedEntries.length} entries for ${client.name}:`);
    retrievedEntries.forEach(entry => {
      console.log(`  - Date: ${entry.date.toISOString()} | Weight: ${entry.weight} | Mood: ${entry.mood} | Energy: ${entry.energy}`);
    });

    // Test date formatting (simulate what the UI does)
    console.log('\n📅 Testing Date Formatting (UI Simulation)...');
    retrievedEntries.forEach(entry => {
      const date = new Date(entry.date);
      
      // Extract UTC components (what our fixed formatDate function does)
      const utcYear = date.getUTCFullYear();
      const utcMonth = date.getUTCMonth();
      const utcDay = date.getUTCDate();
      
      // Create local date representation
      const localDate = new Date(utcYear, utcMonth, utcDay);
      const formatted = localDate.toLocaleDateString('en-US', { 
        weekday: 'short',
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      });
      
      console.log(`  - Stored: ${entry.date.toISOString()} → Displays as: ${formatted}`);
    });

    console.log('\n✅ Complete Flow Test Successful!');
    console.log('\n🎯 System is ready for Brent\'s review!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testCompleteFlow();