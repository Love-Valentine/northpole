Created DEPLOYMENT_GUIDE.md
# 🎄 North Pole Pen Pals - Complete Deployment Guide
## Table of Contents
1. [Project Overview](#project-overview)
2. [File Structure](#file-structure)
3. [Local Development Setup](#local-development-setup)
4. [Database Setup](#database-setup)
5. [API Configuration](#api-configuration)
6. [IONOS Deployment](#ionos-deployment)
7. [Payment Integration](#payment-integration)
8. [AI Response Setup](#ai-response-setup)
9. [Video Integration](#video-integration)
10. [Security Checklist](#security-checklist)
---
## Project Overview
**North Pole Pen Pals** is a full-stack web application that allows children to write letters to elf pen pals at the North Pole. Features include:
- 👨‍👩‍👧 **Parent Portal**: Subscription management, message oversight, response toggle (AI/manual)
- 🧒 **Kid Dashboard**: Elf selection, letter writing, videos, certificates, mini-games
- 🧝 **20 Unique Elves**: 10 boys, 10 girls with distinct personalities
- 🤖 **AI Responses**: OpenAI-powered elf letter responses
- 💳 **Stripe Payments**: Monthly, yearly, and lifetime subscriptions
- 🎮 **Mini Games**: Word search, find the elf, spot the difference
- ❄️ **Magical UI**: Snow effects, Christmas theme, responsive design
---
## File Structure
```
north-pole-penpals/
├── index.html                    # Main frontend (single-page app)
├── backend/
│   ├── server.js                 # Express.js API server
│   ├── package.json              # Node.js dependencies
│   ├── .env.example              # Environment variables template
│   └── database/
│       └── schema.sql            # PostgreSQL database schema
├── DEPLOYMENT_GUIDE.md           # This file
└── README.md                     # Quick start guide
```
---
## Local Development Setup
### Prerequisites
- Node.js 18+ 
- PostgreSQL 14+
- npm or yarn
- Git
### Step 1: Clone and Install
```bash
# Clone the repository
git clone https://github.com/yourusername/north-pole-penpals.git
cd north-pole-penpals
# Install backend dependencies
cd backend
npm install
# Copy environment file
cp .env.example .env
```
### Step 2: Configure Environment Variables
Edit `backend/.env` with your settings:
```env
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:3000
JWT_SECRET=generate-a-32-character-random-string
DB_HOST=localhost
DB_PORT=5432
DB_NAME=north_pole_penpals
DB_USER=postgres
DB_PASSWORD=your_password
STRIPE_SECRET_KEY=sk_test_xxx
OPENAI_API_KEY=sk-xxx
```
### Step 3: Setup Database
```bash
# Create database
psql -U postgres -c "CREATE DATABASE north_pole_penpals;"
# Run schema
psql -U postgres -d north_pole_penpals -f database/schema.sql
```
### Step 4: Run the Application
```bash
# Start backend server
cd backend
npm run dev
# The frontend is static HTML - serve it with any web server
# Option 1: Use the Express static serving (already configured)
# Option 2: Use a simple HTTP server
npx serve ../
# Visit http://localhost:3000
```
---
## Database Setup
### PostgreSQL Schema Overview
| Table | Purpose |
|-------|---------|
| `parents` | Parent accounts, subscriptions, response preferences |
| `kids` | Child accounts, linked to parents |
| `elves` | 20 pre-configured elves with personalities |
| `letters` | Kid-to-elf correspondence and responses |
| `videos` | North Pole video content |
| `certificates` | Friendship & Nice List certificates |
| `subscriptions` | Detailed subscription tracking |
| `addons` | Certificate/video add-on purchases |
| `game_scores` | Mini-game high scores |
### Database Backup Commands
```bash
# Backup
pg_dump -U postgres north_pole_penpals > backup.sql
# Restore
psql -U postgres north_pole_penpals < backup.sql
```
---
## API Configuration
### API Endpoints
#### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/parent/register` | Register parent account |
| POST | `/api/auth/parent/login` | Parent login |
| POST | `/api/auth/kid/register` | Register kid (requires parent code) |
| POST | `/api/auth/kid/login` | Kid login |
#### Elves & Letters
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/elves` | Get all elves |
| POST | `/api/elves/select` | Select elf friend (auth required) |
| POST | `/api/letters` | Send letter (auth required) |
| GET | `/api/letters` | Get kid's letters (auth required) |
#### Parent Functions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/parent/letters` | View all kid letters |
| POST | `/api/parent/letters/:id/respond` | Manual elf response |
| PATCH | `/api/parent/settings` | Update response mode |
| GET | `/api/parent/kids` | List kid accounts |
#### Payments
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/subscriptions/create-checkout` | Create Stripe checkout |
| POST | `/api/webhooks/stripe` | Stripe webhook handler |
---
## IONOS Deployment
### Option A: IONOS Web Hosting (Node.js)
1. **Log into IONOS Control Panel**
   - Go to Hosting > Manage
2. **Set up Node.js Application**
   ```
   - Application Root: /north-pole-penpals
   - Application URL: northpolepenpals.com
   - Application Startup File: backend/server.js
   - Node.js Version: 18.x or 20.x
   ```
3. **Upload Files via SFTP**
   ```bash
   # Connect via FileZilla or similar
   Host: your-server.ionos.com
   Port: 22
   Username: your-ftp-username
   Password: your-ftp-password
   
   # Upload entire project to /north-pole-penpals
   ```
4. **Configure Database**
   - In IONOS Panel: Databases > Create PostgreSQL Database
   - Note down: Host, Port, Database Name, Username, Password
   - Update `.env` with these credentials
5. **Run Database Migration**
   ```bash
   # SSH into server
   ssh user@your-server.ionos.com
   
   # Navigate to project
   cd /north-pole-penpals/backend
   
   # Run schema
   psql -h db-host -U db-user -d db-name -f database/schema.sql
   ```
6. **Start Application**
   ```bash
   # Install dependencies
   npm install --production
   
   # Start with PM2 (recommended)
   npm install -g pm2
   pm2 start server.js --name "north-pole-penpals"
   pm2 save
   pm2 startup
   ```
### Option B: IONOS VPS/Cloud Server
1. **Provision Server**
   - Choose Ubuntu 22.04 LTS
   - Minimum: 2 CPU, 4GB RAM, 40GB SSD
2. **Initial Server Setup**
   ```bash
   # SSH into server
   ssh root@your-vps-ip
   
   # Update system
   apt update && apt upgrade -y
   
   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   apt install -y nodejs
   
   # Install PostgreSQL
   apt install -y postgresql postgresql-contrib
   
   # Install Nginx
   apt install -y nginx
   
   # Install PM2
   npm install -g pm2
   ```
3. **Configure PostgreSQL**
   ```bash
   # Switch to postgres user
   sudo -u postgres psql
   
   # Create database and user
   CREATE DATABASE north_pole_penpals;
   CREATE USER nppadmin WITH ENCRYPTED PASSWORD 'your_secure_password';
   GRANT ALL PRIVILEGES ON DATABASE north_pole_penpals TO nppadmin;
   \q
   
   # Run schema
   psql -U nppadmin -d north_pole_penpals -f /path/to/schema.sql
   ```
4. **Configure Nginx**
   ```nginx
   # /etc/nginx/sites-available/northpolepenpals
   server {
       listen 80;
       server_name northpolepenpals.com www.northpolepenpals.com;
       
       # Frontend static files
       location / {
           root /var/www/north-pole-penpals;
           try_files $uri $uri/ /index.html;
       }
       
       # API proxy
       location /api {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```
5. **Enable Site & SSL**
   ```bash
   # Enable site
   ln -s /etc/nginx/sites-available/northpolepenpals /etc/nginx/sites-enabled/
   nginx -t
   systemctl reload nginx
   
   # Install SSL with Let's Encrypt
   apt install -y certbot python3-certbot-nginx
   certbot --nginx -d northpolepenpals.com -d www.northpolepenpals.com
   ```
6. **Deploy Application**
   ```bash
   # Clone repository
   cd /var/www
   git clone https://github.com/yourusername/north-pole-penpals.git
   
   # Copy frontend
   cp north-pole-penpals/index.html /var/www/north-pole-penpals/
   
   # Setup backend
   cd north-pole-penpals/backend
   npm install --production
   
   # Configure environment
   cp .env.example .env
   nano .env  # Edit with production values
   
   # Start with PM2
   pm2 start server.js --name "npp-api"
   pm2 save
   pm2 startup
   ```
---
## Payment Integration
### Stripe Setup
1. **Create Stripe Account**
   - Go to https://stripe.com
   - Complete business verification
2. **Get API Keys**
   - Dashboard > Developers > API Keys
   - Copy Secret Key → `STRIPE_SECRET_KEY`
   - Copy Publishable Key → `STRIPE_PUBLISHABLE_KEY`
3. **Setup Webhook**
   - Dashboard > Developers > Webhooks
   - Add endpoint: `https://yourdomain.com/api/webhooks/stripe`
   - Select events:
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
   - Copy Signing Secret → `STRIPE_WEBHOOK_SECRET`
4. **Configure Products** (Optional)
   - Create Products in Stripe Dashboard for tracking:
     - Monthly Magic ($9.99/month)
     - Yearly Wonder ($79.99/year)
     - Forever Magic ($199.99 one-time)
### Test Cards
| Card Number | Result |
|-------------|--------|
| 4242 4242 4242 4242 | Success |
| 4000 0000 0000 0002 | Declined |
| 4000 0025 0000 3155 | Requires 3D Secure |
---
## AI Response Setup
### OpenAI Configuration
1. **Get API Key**
   - Go to https://platform.openai.com
   - Create account and add payment method
   - API Keys > Create new secret key
   - Copy to `OPENAI_API_KEY`
2. **Usage Limits**
   - Set monthly budget in OpenAI dashboard
   - Recommended: $10-50/month for small app
   - GPT-3.5-turbo costs ~$0.002 per 1K tokens
3. **Fallback System**
   - If OpenAI fails, the system uses pre-written fallback responses
   - 3 random responses per elf ensure variety
### Customizing AI Prompts
Edit `generateElfResponse` function in `server.js`:
```javascript
const prompt = `You are ${elf.name}, a friendly elf at the North Pole...`
```
---
## Video Integration
### Video Hosting Options
1. **Self-Hosted** (IONOS Storage)
   ```
   /videos/
   ├── welcome.mp4
   ├── reindeer.mp4
   └── workshop.mp4
   ```
2. **AWS S3 + CloudFront** (Recommended for scale)
   ```env
   AWS_ACCESS_KEY_ID=xxx
   AWS_SECRET_ACCESS_KEY=xxx
   AWS_S3_BUCKET=npp-videos
   ```
3. **YouTube/Vimeo Private**
   - Upload as unlisted
   - Embed with privacy settings
### Creating Elf Videos
**Recommended Tools:**
- **Synthesia.io** - AI-generated elf avatars
- **D-ID** - AI video generation
- **Canva Video** - Custom animations
- **Adobe Character Animator** - Professional puppetry
---
## Security Checklist
### Before Going Live
- [ ] Change all default passwords
- [ ] Generate strong JWT_SECRET (32+ characters)
- [ ] Enable HTTPS/SSL
- [ ] Set `NODE_ENV=production`
- [ ] Configure rate limiting
- [ ] Enable CORS only for your domain
- [ ] Review database permissions
- [ ] Enable PostgreSQL SSL
- [ ] Set up automated backups
- [ ] Configure firewall (UFW)
- [ ] Enable fail2ban
- [ ] Review COPPA compliance (children's data)
- [ ] Add Privacy Policy & Terms of Service
- [ ] Test all payment flows
- [ ] Monitor error logs
### COPPA Compliance Notes
Since this app serves children under 13:
1. Require verifiable parental consent
2. Minimize data collection
3. Secure all child data
4. Allow parents to review/delete data
5. Don't use behavioral advertising
6. Consult with a legal professional
---
## Troubleshooting
### Common Issues
**Database Connection Failed**
```bash
# Check PostgreSQL is running
systemctl status postgresql
# Check connection
psql -U postgres -d north_pole_penpals -h localhost
```
**API Returns 500 Errors**
```bash
# Check logs
pm2 logs npp-api
# Check Node.js errors
tail -f /var/log/nodejs/error.log
```
**Stripe Webhooks Failing**
```bash
# Test webhook locally
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```
**OpenAI Rate Limited**
- Check usage in OpenAI dashboard
- Implement caching for repeated requests
- Use fallback responses
---
## Support & Contact
For issues or questions:
- Create GitHub Issue
- Email: support@northpolepenpals.com
---
**🎄 Happy Holidays from the North Pole Pen Pals Team! 🧝**
