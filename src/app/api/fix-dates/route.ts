import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST() {
  try {
    
    // Get all progress entries that might have incorrect dates
    const allEntries = await prisma.progressEntry.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    
    let fixedCount = 0;
    
    for (const entry of allEntries) {
      
      // Check if this entry was created on Sept 22 but stored with Sept 21 date
      const createdDate = entry.createdAt;
      const storedDate = entry.date;
      
      // If created on Sept 22, 2025 but stored as Sept 21, fix it
      if (createdDate.getFullYear() === 2025 && 
          createdDate.getMonth() === 8 && // September (0-indexed)
          createdDate.getDate() === 22 &&
          storedDate.getUTCDate() === 21) {
        
        // Create the correct date at noon UTC for Sept 22
        const correctDate = new Date('2025-09-22T12:00:00.000Z');
        
        await prisma.progressEntry.update({
          where: { id: entry.id },
          data: { date: correctDate }
        });
        
        fixedCount++;
      } else {
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Progress date fix completed! Fixed ${fixedCount} entries.`,
      totalChecked: allEntries.length,
      fixedCount
    });
    
  } catch (error) {
    console.error('❌ Error fixing progress dates:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}