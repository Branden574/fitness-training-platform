// Test script to check invitation API functionality
const testInvitationAPI = async () => {
  try {
    console.log('Testing invitation API...');
    
    // Test creating an invitation
    const invitationData = {
      clientEmail: 'test@example.com',
      clientName: 'Test Client'
    };
    
    const response = await fetch('http://localhost:3001/api/invitations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(invitationData)
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const data = await response.json();
      console.log('Success! Invitation created:', data);
    } else {
      const errorText = await response.text();
      console.log('Error response:', errorText);
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
};

testInvitationAPI();