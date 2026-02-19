# PostgreSQL Setup Guide Using VS Code Extensions

## 🎯 You have the perfect extensions installed!
- ✅ SQLTools - Database management interface
- ✅ PostgreSQL extension - Direct PostgreSQL support

## Step 1: Choose Your PostgreSQL Host

### Option A: Supabase (Recommended - Best admin interface)
1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project" → "New project"
3. Choose organization → Name your project "fitness-platform"
4. Set password (save this!)
5. Choose region closest to you
6. Click "Create new project"
7. Wait 2-3 minutes for setup

### Option B: Vercel Postgres (If you plan to deploy on Vercel)
1. Go to [vercel.com](https://vercel.com) → Dashboard
2. Storage → Create Database → Postgres
3. Name: "fitness-platform"
4. Region: Choose closest to you
5. Create Database

### Option C: Railway (Developer-friendly)
1. Go to [railway.app](https://railway.app)
2. "Start a New Project" → "Deploy PostgreSQL"
3. Wait for deployment
4. Click on PostgreSQL service → Connect tab

## Step 2: Get Your Connection String

### For Supabase:
1. In your project dashboard → Settings → Database
2. Scroll to "Connection string" → URI
3. Copy the connection string (looks like: `postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres`)

### For Vercel:
1. In your Postgres database → Settings
2. Copy the connection string under "Quickstart"

### For Railway:
1. In your PostgreSQL service → Connect tab
2. Copy the "Postgres Connection URL"

## Step 3: Set Up Database Connection in VS Code

1. **Open VS Code Command Palette** (`Cmd+Shift+P`)
2. **Type**: "SQLTools: Add New Connection"
3. **Select**: "PostgreSQL"
4. **Fill in details**:
   - Connection name: `Fitness Platform Postgres`
   - Server address: (extract from your connection string)
   - Port: `5432`
   - Database: `postgres`
   - Username: (extract from connection string)
   - Password: (your database password)

**OR** simply paste your full connection string when prompted!

## Step 4: Test Connection
1. In VS Code sidebar, you'll see SQLTools
2. Click on your new connection
3. It should connect and show database structure
4. You can now run SQL queries directly in VS Code!

## Step 5: Update Your Project

Update your `.env` file with the PostgreSQL connection:

```env
# Add this line (replace with your actual connection string)
DATABASE_URL="postgresql://username:password@host:5432/database"

# Keep your existing variables
NEXTAUTH_SECRET="your-secret"
NEXTAUTH_URL="http://localhost:3000"
```

## Step 6: Update Prisma Schema

I'll create an optimized PostgreSQL schema for you with admin features and better performance.

## Step 7: Run Migration

Once everything is set up, we'll run the migration script to copy all your data safely.

---

## 🎯 Which option do you prefer?

**Supabase** - Best admin interface, great for managing users
**Vercel** - If you're deploying there anyway  
**Railway** - Simple and developer-friendly

Let me know which one you want to use, and I'll guide you through the specific setup!