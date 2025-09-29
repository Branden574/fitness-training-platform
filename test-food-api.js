const http = require('http');

// Test the food entries API with our debugging
const data = JSON.stringify({
  foodName: "Test Food",
  quantity: "100",
  unit: "grams",
  calories: "150",
  protein: "10",
  carbs: "20",
  fat: "5",
  mealType: "BREAKFAST",
  date: "2025-09-22",
  notes: "Test entry for debugging"
});

// First create a food entry
const postOptions = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/food-entries',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

console.log('Creating test food entry for 2025-09-22...');
const req = http.request(postOptions, (res) => {
  console.log(`POST status: ${res.statusCode}`);
  
  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
  });
  
  res.on('end', () => {
    console.log('POST response:', body);
    
    // Now try to fetch it
    console.log('\nFetching food entries for 2025-09-22...');
    const getOptions = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/food-entries?date=2025-09-22',
      method: 'GET'
    };
    
    const getReq = http.request(getOptions, (getRes) => {
      console.log(`GET status: ${getRes.statusCode}`);
      
      let getBody = '';
      getRes.on('data', (chunk) => {
        getBody += chunk;
      });
      
      getRes.on('end', () => {
        console.log('GET response:', getBody);
      });
    });
    
    getReq.end();
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.write(data);
req.end();