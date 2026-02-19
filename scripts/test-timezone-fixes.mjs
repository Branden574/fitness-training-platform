import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zcjsvzzlhhjhhlumcwwx.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjanN2enpsaGhqaGhsdW1jd3d4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY5MjI2NDEsImV4cCI6MjA0MjQ5ODY0MX0.4pGjRuWN3cEFMkR8NCGpUBJZs8Iy8m2Fd_YfgQrvDJ4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testTimezoneFixes() {
  console.log('🧪 Testing Timezone Fixes');
  console.log('===============================');
  
  // Test 1: Current timezone info
  const now = new Date();
  console.log('\n1. Current Timezone Info:');
  console.log('  Current date:', now.toLocaleDateString());
  console.log('  Current time:', now.toLocaleTimeString());
  console.log('  Timezone offset (minutes):', now.getTimezoneOffset());
  console.log('  ISO string:', now.toISOString());
  
  // Test 2: Date parsing for 9/24/2025
  const testDateStr = '2025-09-24';
  console.log('\n2. Date Parsing Test for 9/24/2025:');
  console.log('  Input string:', testDateStr);
  
  // Old way (UTC shift issue)
  const oldWay = new Date(testDateStr);
  console.log('  Old way (new Date(string)):', oldWay);
  console.log('    toLocaleDateString():', oldWay.toLocaleDateString());
  console.log('    toDateString():', oldWay.toDateString());
  
  // New way (local timezone parsing)
  const [year, month, day] = testDateStr.split('-').map(Number);
  const newWay = new Date(year, month - 1, day);
  console.log('  New way (local timezone):', newWay);
  console.log('    toLocaleDateString():', newWay.toLocaleDateString());
  console.log('    toDateString():', newWay.toDateString());
  
  // Test 3: Check existing workout data
  console.log('\n3. Checking Existing Workout Data:');
  try {
    const { data: workoutSessions, error: sessionsError } = await supabase
      .from('workout_sessions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
      
    if (sessionsError) {
      console.log('  Error fetching sessions:', sessionsError);
    } else {
      console.log('  Recent workout sessions:', workoutSessions?.length || 0);
      workoutSessions?.forEach((session, i) => {
        const startDate = new Date(session.start_time);
        console.log(`    ${i+1}. ID: ${session.id}, Date: ${startDate.toLocaleDateString()}, Time: ${startDate.toLocaleTimeString()}`);
      });
    }
    
    const { data: workoutProgress, error: progressError } = await supabase
      .from('workout_progress')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
      
    if (progressError) {
      console.log('  Error fetching progress:', progressError);
    } else {
      console.log('  Recent workout progress:', workoutProgress?.length || 0);
      workoutProgress?.forEach((progress, i) => {
        const progressDate = new Date(progress.date);
        console.log(`    ${i+1}. ID: ${progress.id}, Date: ${progressDate.toLocaleDateString()}, Exercise: ${progress.exercise_name}`);
      });
    }
  } catch (error) {
    console.log('  Database error:', error.message);
  }
  
  // Test 4: API endpoint simulation
  console.log('\n4. API Date Handling Simulation:');
  const testApiDate = '2025-09-24';
  console.log('  API receives date:', testApiDate);
  
  // Simulate our new API logic
  if (typeof testApiDate === 'string' && testApiDate.includes('-') && testApiDate.length === 10) {
    const [year, month, day] = testApiDate.split('-').map(Number);
    const apiDate = new Date(year, month - 1, day);
    console.log('  API parses as:', apiDate);
    console.log('  Will display as:', apiDate.toLocaleDateString());
    
    // Date range calculation for filtering
    const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
    const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);
    console.log('  Start of day:', startOfDay.toISOString());
    console.log('  End of day:', endOfDay.toISOString());
  }
  
  console.log('\n✅ Timezone fix testing complete!');
  console.log('If dates show as 9/24/2025 (not 9/23/2025), the fixes are working.');
}

testTimezoneFixes().catch(console.error);