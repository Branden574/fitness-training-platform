// Test invitation creation with correct trainer ID
const testInvitation = async () => {
  try {
    console.log('🧪 Testing invitation creation...');
    
    const response = await fetch('http://localhost:3001/api/invitations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test.invitation@example.com',
        name: 'Test User',
        phone: '555-0123'
      })
    });
    
    console.log('📊 Response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Success! Invitation created:', data);
    } else {
      const error = await response.text();
      console.log('❌ Error response:', error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

testInvitation();