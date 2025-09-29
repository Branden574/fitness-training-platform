-- Fitness Platform Database Verification Queries (CORRECTED TABLE NAMES)
-- Run these to verify your PostgreSQL migration was successful

-- 1. Check all users and their roles
SELECT name, email, role, "createdAt" 
FROM users 
ORDER BY "createdAt" DESC;

-- 2. Verify admin user exists
SELECT * FROM users WHERE role = 'ADMIN';

-- 3. Check platform statistics
SELECT 
    COUNT(*) as total_users,
    COUNT(CASE WHEN role = 'CLIENT' THEN 1 END) as clients,
    COUNT(CASE WHEN role = 'TRAINER' THEN 1 END) as trainers,
    COUNT(CASE WHEN role = 'ADMIN' THEN 1 END) as admins
FROM users;

-- 4. Verify food entries exist
SELECT COUNT(*) as total_food_entries FROM food_entries;

-- 5. Check appointments
SELECT COUNT(*) as total_appointments FROM appointments;

-- 6. View recent food entries
SELECT f."foodName", f.calories, f."createdAt", u.name as user_name
FROM food_entries f
JOIN users u ON f."userId" = u.id
ORDER BY f."createdAt" DESC
LIMIT 5;

-- 7. Check database version
SELECT version();

-- 8. List all tables to verify structure
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;