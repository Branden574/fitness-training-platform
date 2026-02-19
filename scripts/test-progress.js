// Test script to check progress data
console.log('Testing progress analytics API...');

// Test the progress analytics API directly
async function testProgressAnalytics() {
  try {
    console.log('Fetching progress analytics...');
    const response = await fetch('/api/progress-analytics');
    console.log('Response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Progress analytics data:', data);
      console.log('Monthly stats length:', data.monthlyStats?.length || 0);
      console.log('Exercise progress length:', data.exerciseProgress?.length || 0);
    } else {
      console.error('Failed to fetch:', await response.text());
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

// Test the daily progress API
async function testDailyProgress() {
  try {
    console.log('Fetching daily progress entries...');
    const response = await fetch('/api/progress');
    console.log('Response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Daily progress data:', data);
    } else {
      console.error('Failed to fetch:', await response.text());
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run tests
testProgressAnalytics();
testDailyProgress();