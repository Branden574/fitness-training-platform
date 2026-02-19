# VS Code PostgreSQL Database Connection Guide

## 🔌 Connect VS Code to Your PostgreSQL Database

### 1. Install the PostgreSQL Extension

1. Open VS Code
2. Go to Extensions (Cmd+Shift+X)
3. Search for "PostgreSQL" by Chris Kolkman
4. Install the extension

### 2. Add Database Connection

1. **Open Command Palette**: `Cmd+Shift+P`
2. **Type**: "PostgreSQL: New Connection"
3. **Enter Connection Details**:
   ```
   Host: db.zqgaogztrxzsevimqelr.supabase.co
   Port: 5432
   Database: postgres
   Username: postgres
   Password: [REDACTED]
   ```

### 3. Alternative: Use Database URL

You can also connect using the full connection string:
```
postgresql://postgres:[REDACTED]@db.[REDACTED].supabase.co:5432/postgres
```

## 🔍 Viewing Your Data

Once connected, you can:

### Browse Tables
- Expand the connection in the PostgreSQL explorer
- View all tables (users, appointments, foodEntries, etc.)
- See table structure and relationships

### Run Queries
1. Create a new `.sql` file
2. Write SQL queries like:
   ```sql
   -- View all users
   SELECT * FROM "User";
   
   -- View admin users
   SELECT * FROM "User" WHERE role = 'ADMIN';
   
   -- Check food entries
   SELECT * FROM "FoodEntry" LIMIT 10;
   
   -- View appointments
   SELECT * FROM "Appointment";
   ```

### Quick Data Checks
```sql
-- Platform statistics
SELECT 
    COUNT(*) as total_users,
    COUNT(CASE WHEN role = 'CLIENT' THEN 1 END) as clients,
    COUNT(CASE WHEN role = 'TRAINER' THEN 1 END) as trainers,
    COUNT(CASE WHEN role = 'ADMIN' THEN 1 END) as admins
FROM "User";

-- Recent activity
SELECT name, email, role, "createdAt", "isActive"
FROM "User" 
ORDER BY "createdAt" DESC 
LIMIT 10;
```

## 🛠️ Database Management Features

### Table Operations
- **View Data**: Right-click table → "Select Top 100"
- **Edit Records**: Double-click cells to edit
- **Add Records**: Use INSERT statements
- **Delete Records**: Use DELETE statements

### Schema Exploration
- **View Columns**: See data types, constraints
- **Check Indexes**: View performance optimizations
- **Foreign Keys**: Understand relationships

## 🔐 Admin Dashboard Access

### Login Credentials
- **URL**: http://localhost:3000/admin
- **Email**: [REDACTED_EMAIL]
- **Password**: [REDACTED]

### Admin Features Available
- ✅ Platform statistics dashboard
- ✅ User management (reset passwords, activate/deactivate)
- ✅ Real-time data monitoring
- ✅ Database performance metrics
- ✅ Invitation management

## 🚀 Quick Start Commands

```bash
# Start the application
npm run dev

# Connect to database via CLI (optional)
psql "postgresql://postgres:[REDACTED]@db.[REDACTED].supabase.co:5432/postgres"

# Generate Prisma client (if needed)
npx prisma generate

# View database schema
npx prisma studio
```

## 📊 Useful SQL Queries for Monitoring

```sql
-- User activity summary
SELECT 
    u.name,
    u.email,
    u.role,
    COUNT(DISTINCT f.id) as food_entries,
    COUNT(DISTINCT a.id) as appointments,
    COUNT(DISTINCT p.id) as progress_entries
FROM "User" u
LEFT JOIN "FoodEntry" f ON u.id = f."userId"
LEFT JOIN "Appointment" a ON u.id = a."clientId"
LEFT JOIN "ProgressEntry" p ON u.id = p."userId"
GROUP BY u.id, u.name, u.email, u.role
ORDER BY u."createdAt" DESC;

-- Database size and table counts
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    null_frac
FROM pg_stats 
WHERE schemaname = 'public';
```

---

**🎉 Your fitness platform is now fully connected to PostgreSQL with VS Code integration for easy database management!**