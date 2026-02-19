// Test the progress analytics API directly
const fetch = require('node-fetch');

async function testProgressAnalyticsAPI() {
  try {
    console.log('Testing progress analytics API...');
    
    // We need to simulate authentication - for testing, let's create a simple script
    // that runs in the context where auth is available
    
    const response = await fetch('http://localhost:3000/api/progress-analytics', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // In a real scenario, we'd need to include authentication cookies
      }
    });
    
    console.log('Response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Progress analytics response:');
      console.log('- Exercise progress entries:', data.exerciseProgress?.length || 0);
      console.log('- Monthly stats entries:', data.monthlyStats?.length || 0);
      console.log('- First monthly stat:', data.monthlyStats?.[0]);
      console.log('- Exercise specific trends:', Object.keys(data.exerciseSpecificTrends || {}));
      console.log('- Overall metrics:', data.overallMetrics);
    } else {
      const text = await response.text();
      console.log('Error response:', text);
    }
    
  } catch (error) {
    console.error('Error testing API:', error);
  }
}

testProgressAnalyticsAPI();