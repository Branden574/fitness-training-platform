# Railway Migration Guide

## Step 1: Create Railway PostgreSQL Database

1. Go to [Railway.app](https://railway.app)
2. Create a new project
3. Add PostgreSQL database service
4. Note down the connection details

## Step 2: Get Your Connection String

After creating the database, Railway will provide a connection string like:
```
postgresql://[username]:[password]@[host]:[port]/[database]
```

## Step 3: Update Environment Variables

Replace the DATABASE_URL in both `.env` and `.env.local` with your Railway connection string.

## Step 4: Database Migration

1. Run `npx prisma db push` to create tables in Railway
2. Run `node scripts/recreate-branden574.js` to recreate the branden574 account
3. Run `node scripts/seed.js` to seed additional data if needed

## Step 5: Test Connection

Run `npm run dev` and test login with:
- **Admin**: admin@brentmartinezfitness.com / admin123
- **Trainer**: martinezfitness559@gmail.com / trainer123  
- **Client**: branden574@gmail.com / branden123

## Step 6: GitHub Private Repo

1. Create private repo on GitHub
2. Push code:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin [your-repo-url]
   git push -u origin main
   ```

## Step 7: Deploy to Railway

1. Connect Railway to your GitHub repo
2. Set environment variables in Railway dashboard
3. Deploy!

## Environment Variables for Railway

```
DATABASE_URL=postgresql://[your-railway-connection-string]
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=https://your-app.railway.app
```

## Benefits of Railway:

✅ Always-on PostgreSQL (no sleeping databases)
✅ Easy GitHub integration
✅ Automatic deployments
✅ Better performance than Supabase free tier
✅ You already have experience with it
✅ Great for private client projects