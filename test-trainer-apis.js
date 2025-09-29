const axios = require('axios');

async function testTrainerAPIs() {
    try {
        console.log('🧪 Testing trainer API endpoints...\n');

        // Test clients endpoint
        console.log('1. Testing /api/clients endpoint...');
        try {
            const clientsResponse = await axios.get('http://localhost:3000/api/clients', {
                timeout: 10000
            });
            console.log('✅ Clients API responded:', clientsResponse.status);
            console.log('   Response length:', JSON.stringify(clientsResponse.data).length, 'characters');
        } catch (error) {
            console.log('❌ Clients API error:', error.response?.status, error.response?.data?.error || error.message);
        }

        console.log('\n2. Testing /api/appointments endpoint...');
        try {
            const appointmentsResponse = await axios.get('http://localhost:3000/api/appointments', {
                timeout: 10000
            });
            console.log('✅ Appointments API responded:', appointmentsResponse.status);
            console.log('   Response length:', JSON.stringify(appointmentsResponse.data).length, 'characters');
        } catch (error) {
            console.log('❌ Appointments API error:', error.response?.status, error.response?.data?.error || error.message);
        }

        console.log('\n3. Testing database connection directly...');
        const dbTest = require('./debug-trainer-assignments.js');
        
    } catch (error) {
        console.error('❌ Test error:', error.message);
    }
}

testTrainerAPIs();