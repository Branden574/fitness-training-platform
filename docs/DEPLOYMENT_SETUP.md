# Fitness Training Platform - Railway Deployment Setup

## 🚂 Railway Auto-Deployment Benefits:
- ✅ **Push to Deploy**: Every git push automatically deploys
- ✅ **Zero Downtime**: Rolling deployments
- ✅ **Environment Variables**: Secure config management
- ✅ **Automatic HTTPS**: SSL certificates included
- ✅ **Database Backups**: Automatic PostgreSQL backups
- ✅ **Logs & Monitoring**: Real-time application monitoring

---

## Step 1: Create Railway PostgreSQL Database

1. Go to **[Railway.app](https://railway.app)** and sign in
2. Click **"New Project"**
3. Select **"Provision PostgreSQL"**
4. Copy the connection string from the **"Connect"** tab

**Connection string format:**
```
postgresql://postgres:password@host:port/railway
```

---

## Step 2: Update Environment Variables

Replace the `DATABASE_URL` in your `.env` and `.env.local` files with the Railway connection string.

---

## Step 3: Database Migration & Seeding

```bash
# Push schema to Railway database
npx prisma db push

# Seed essential accounts
node scripts/cleanup-users.js
node scripts/recreate-branden574.js
```

---

## Step 4: GitHub Setup

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit - Fitness Training Platform"

# Create main branch
git branch -M main

# Add remote (replace with your private repo URL)
git remote add origin https://github.com/yourusername/fitness-training-platform.git

# Push to GitHub
git push -u origin main
```

---

## Step 5: Connect Railway to GitHub

1. In Railway dashboard, click **"Deploy from GitHub repo"**
2. Connect your GitHub account
3. Select your **private repository**
4. Railway will automatically detect it's a Next.js app

---

## Step 6: Set Environment Variables in Railway

In Railway dashboard → Settings → Environment Variables:

```
DATABASE_URL=your_railway_postgresql_connection_string
NEXTAUTH_SECRET=your_nextauth_secret_key
NEXTAUTH_URL=https://your-app-name.up.railway.app
```

---

## Step 7: Test Deployment

Your app will be available at: `https://your-app-name.up.railway.app`

**Test Login Credentials:**
- **Admin**: admin@brentmartinezfitness.com / admin123
- **Trainer**: martinezfitness559@gmail.com / trainer123
- **Client**: branden574@gmail.com / branden123

---

## 🔄 Auto-Deployment Workflow

**Every time you push to GitHub:**
1. Railway detects the push
2. Builds your Next.js app
3. Deploys automatically (usually 2-3 minutes)
4. Zero downtime deployment
5. Your live site updates instantly!

**Example workflow:**
```bash
# Make changes to your code
git add .
git commit -m "Add new feature"
git push origin main
# 🎉 Railway automatically deploys!
```

---

## 🛠️ Development Workflow

**Local Development:**
- Use SQLite (`file:./dev.db`) for fast local testing
- Run `npm run dev` for development server

**Production:**
- Railway PostgreSQL for live data
- Automatic deployments from GitHub
- Real-time monitoring and logs

---

## 🔍 Monitoring & Access

**Railway Dashboard:**
- Database browser and query runner
- Application logs and metrics
- Environment variable management

**Prisma Studio:**
```bash
# View/edit production data
npx prisma studio
```

**Direct Database Access:**
Use any PostgreSQL client with Railway connection string.

---

Ready to start? Let's begin with creating your Railway PostgreSQL database!