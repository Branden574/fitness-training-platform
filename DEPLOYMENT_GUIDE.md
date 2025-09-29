# 🚀 Production Deployment Guide

## Quick Setup for Vercel (Recommended)

### 1. Prepare Repository
```bash
# Ensure all changes are committed
git add .
git commit -m "Prepare for production deployment"
git push origin main
```

### 2. Deploy to Vercel
1. Visit [vercel.com](https://vercel.com) and sign in
2. Click "New Project" 
3. Import your GitHub repository
4. Configure the following settings:

**Environment Variables:**
```
DATABASE_URL=your-production-postgres-url
NEXTAUTH_URL=https://your-app-name.vercel.app
NEXTAUTH_SECRET=your-secure-random-string-min-32-chars
```

**Build Settings:**
- Framework Preset: Next.js
- Build Command: `npm run build` 
- Output Directory: `.next`
- Install Command: `npm install`

### 3. Database Setup (PostgreSQL)

#### Option A: Vercel Postgres
```bash
# Install Vercel CLI
npm i -g vercel

# Create database
vercel postgres create fitness-platform-db

# Get connection string from Vercel dashboard
```

#### Option B: External Provider (Supabase/PlanetScale)
1. Create account at [supabase.com](https://supabase.com) or [planetscale.com](https://planetscale.com)
2. Create new database
3. Copy connection string to Vercel environment variables

### 4. Update Prisma for Production
```bash
# Update schema for PostgreSQL
# Edit prisma/schema.prisma:
# Change: provider = "sqlite"
# To: provider = "postgresql"

# Generate client
npx prisma generate

# Run migrations in production
npx prisma db push
```

### 5. Seed Production Database
```bash
# After deployment, run in Vercel terminal:
npx prisma db seed
```

## Alternative: Manual VPS Deployment

### Prerequisites
- Ubuntu 20.04+ VPS
- Node.js 18+
- PostgreSQL 13+
- Nginx
- SSL certificate (Let's Encrypt)

### Setup Commands
```bash
# 1. Clone repository
git clone https://github.com/yourusername/fitness-training-platform.git
cd fitness-training-platform

# 2. Install dependencies
npm install

# 3. Set up environment
cp .env.example .env.production
# Edit .env.production with production values

# 4. Build application
npm run build

# 5. Start with PM2
npm install -g pm2
pm2 start npm --name "fitness-platform" -- start
pm2 startup
pm2 save

# 6. Configure Nginx
sudo nano /etc/nginx/sites-available/fitness-platform
# Add reverse proxy configuration

# 7. Enable site and SSL
sudo ln -s /etc/nginx/sites-available/fitness-platform /etc/nginx/sites-enabled/
sudo certbot --nginx -d yourdomain.com
sudo systemctl reload nginx
```

## Post-Deployment Tasks

### 1. Create Initial Admin Account
```bash
# Access production database and create trainer account
npx prisma studio
# Or run custom script to create admin user
```

### 2. Test Core Functionality
- [ ] User registration/login
- [ ] Client-trainer assignment  
- [ ] Nutrition tracking
- [ ] Workout assignment
- [ ] Appointment scheduling
- [ ] Notifications

### 3. Monitor and Optimize
- Set up error monitoring (Sentry)
- Configure analytics (Google Analytics)
- Monitor performance (Vercel Analytics)
- Set up backup strategy

## Troubleshooting

### Common Issues:
1. **Database Connection Errors:** Check DATABASE_URL format
2. **Authentication Issues:** Verify NEXTAUTH_URL and NEXTAUTH_SECRET
3. **Build Failures:** Ensure all TypeScript errors are resolved
4. **CORS Issues:** Configure proper domain settings

### Support:
- Check Vercel deployment logs
- Review Next.js documentation
- Monitor Prisma query performance
- Use browser dev tools for frontend debugging

**Ready to deploy!** 🚀