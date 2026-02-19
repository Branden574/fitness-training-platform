#!/bin/bash

echo "🧪 Testing API Endpoints..."
echo "================================"

BASE_URL="http://localhost:3000"

# Test Health/Basic endpoints
echo "📡 Testing Basic Endpoints..."
echo "GET /api/auth/session"
curl -s "$BASE_URL/api/auth/session" | head -c 100
echo -e "\n"

# Test protected endpoints (should fail without auth)
echo "🔒 Testing Protected Endpoints (should return 401)..."
echo "GET /api/clients"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/clients")
if [ "$HTTP_CODE" = "401" ]; then
    echo "✅ Correctly protected with 401"
else
    echo "❌ Expected 401, got $HTTP_CODE"
fi

echo "GET /api/workouts"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/workouts")
if [ "$HTTP_CODE" = "401" ]; then
    echo "✅ Correctly protected with 401"
else
    echo "❌ Expected 401, got $HTTP_CODE"
fi

echo "GET /api/nutrition"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/nutrition")
if [ "$HTTP_CODE" = "401" ]; then
    echo "✅ Correctly protected with 401"
else
    echo "❌ Expected 401, got $HTTP_CODE"
fi

echo "GET /api/progress"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/progress")
if [ "$HTTP_CODE" = "401" ]; then
    echo "✅ Correctly protected with 401"
else
    echo "❌ Expected 401, got $HTTP_CODE"
fi

echo "GET /api/food-entries"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/food-entries")
if [ "$HTTP_CODE" = "401" ]; then
    echo "✅ Correctly protected with 401"
else
    echo "❌ Expected 401, got $HTTP_CODE"
fi

echo "GET /api/appointments"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/appointments")
if [ "$HTTP_CODE" = "401" ]; then
    echo "✅ Correctly protected with 401"
else
    echo "❌ Expected 401, got $HTTP_CODE"
fi

echo "GET /api/notifications"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/notifications")
if [ "$HTTP_CODE" = "401" ]; then
    echo "✅ Correctly protected with 401"
else
    echo "❌ Expected 401, got $HTTP_CODE"
fi

echo -e "\n📊 Testing Database API..."
echo "GET /api/test-db"
curl -s "$BASE_URL/api/test-db" 2>/dev/null || echo "⚠️  Database test endpoint not found (optional)"

echo -e "\n✅ API Endpoint tests completed!"