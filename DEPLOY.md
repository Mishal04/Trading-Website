# Production Deployment Guide: SolvexTrade (https://solvextrade.com)

This document provides step-by-step instructions for deploying the MERN application to production under the primary domain **`https://solvextrade.com`** and backend API domain **`https://api.solvextrade.com`** (or via a unified `/api` reverse proxy).

---

## 1. Required Production Environment Variables

### Backend Environment Variables

Configure these variables in your hosting provider's dashboard (e.g. Railway, Render, Fly.io, or VPS `.env`):

| Variable | Required | Example / Recommended Value | Description |
| :--- | :---: | :--- | :--- |
| `NODE_ENV` | **Yes** | `production` | Enforces production mode (disables stack traces to clients, activates 1-year HSTS, restricts CORS). |
| `PORT` | **Yes** | `5000` (or assigned by host e.g. `$PORT`) | Port the Express server listens on. |
| `MONGODB_URI` | **Yes** | `mongodb+srv://user:pass@cluster.mongodb.net/dbname?retryWrites=true&w=majority` | MongoDB Atlas production connection URI. |
| `JWT_SECRET` | **Yes** | `64+ char random string` | Secret key used to sign and verify auth tokens. |
| `JWT_EXPIRE` | Optional | `7d` | JWT session lifetime. Default: `7d`. |
| `CLIENT_URL` | **Yes** | `https://solvextrade.com,https://www.solvextrade.com` | Allowed frontend origins for CORS and email links. |
| `EMAIL_HOST` | **Yes** | `smtp.gmail.com` (or SendGrid, Resend, Amazon SES) | SMTP server hostname. |
| `EMAIL_PORT` | **Yes** | `587` (or `465` for SSL) | SMTP port. |
| `EMAIL_USER` | **Yes** | `noreply@solvextrade.com` | SMTP username / authenticated email. |
| `EMAIL_PASS` | **Yes** | `your_app_password` | SMTP password / API key. |
| `ADMIN_EMAIL` | Optional | `info.solvex1@gmail.com` | Target admin email for seed script. |
| `ADMIN_SEED_PASSWORD` | Seed only | Strong password | Master password used when running `npm run seed:admin`. |

> [!NOTE]
> Never commit real secrets to Git. Use `backend/.env.example` as a template.

### Seeding Production Admin Account
To create or promote the administrator account (`info.solvex1@gmail.com`) in your production database:
```bash
cd backend
ADMIN_SEED_PASSWORD="YourStrongAdminPassword123!" npm run seed:admin
```
*(On Windows PowerShell)*:
```powershell
cd backend
$env:ADMIN_SEED_PASSWORD="YourStrongAdminPassword123!"
npm run seed:admin
Remove-Item env:ADMIN_SEED_PASSWORD
```

---

### Frontend Environment Variables

Set this variable during the build step (or in your static host e.g. Vercel, Netlify, Cloudflare Pages, Render Static Site):

| Variable | Required | Production Value | Description |
| :--- | :---: | :--- | :--- |
| `VITE_API_URL` | **Yes** | `https://api.solvextrade.com/api` | Base URL used by the browser to reach the backend API. |

*(If deploying frontend and backend together under a single domain via an Nginx reverse proxy, you can set `VITE_API_URL=/api`)*

---

## 2. Option A: Cloud Platform Deployment (Railway / Render)

### A. Deploy Backend on Railway or Render
1. Create a new **Web Service** pointing to your Git repository.
2. Set the **Root Directory** to `backend`.
3. Set **Build Command**: `npm install`
4. Set **Start Command**: `npm start` (or `node src/index.js`)
5. In the **Environment Variables** tab, add all required variables listed above:
   - `NODE_ENV=production`
   - `MONGODB_URI=...`
   - `JWT_SECRET=...`
   - `CLIENT_URL=https://solvextrade.com,https://www.solvextrade.com`
   - `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`
6. In **Custom Domains**, add `api.solvextrade.com`.

### B. Deploy Frontend on Vercel, Netlify, or Cloudflare Pages
1. Create a new site pointing to your Git repository.
2. Set the **Root Directory** to `frontend`.
3. Set **Build Command**: `npm run build`
4. Set **Output Directory**: `dist`
5. In **Environment Variables**, add:
   - `VITE_API_URL=https://api.solvextrade.com/api`
6. In **Custom Domains**, add `solvextrade.com` and `www.solvextrade.com`.
7. Client-side routing is handled automatically via `frontend/public/_redirects` (`/* /index.html 200`).

---

## 3. Option B: Self-Hosted / Single VPS Deployment (Ubuntu + Nginx)

If hosting both frontend and backend on an Ubuntu VPS with Nginx and PM2:

### 1. Backend Process with PM2
```bash
cd backend
npm ci --production
# Create production .env file
nano .env

# Start with PM2
pm2 start src/index.js --name "solvextrade-api"
pm2 save
pm2 startup
```

### 2. Build Frontend
```bash
cd ../frontend
npm ci
VITE_API_URL=https://solvextrade.com/api npm run build
# Built files are now in frontend/dist
```

### 3. Nginx Configuration (`/etc/nginx/sites-available/solvextrade.com`)
```nginx
server {
    server_name solvextrade.com www.solvextrade.com;

    root /var/www/solvextrade/frontend/dist;
    index index.html;

    # Static assets cache
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API Proxy to Node.js backend
    location /api/ {
        proxy_pass http://127.0.0.1:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://127.0.0.1:5000/health;
    }

    # SPA Client-side routing fallback
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### 4. Enable SSL with Certbot
```bash
sudo certbot --nginx -d solvextrade.com -d www.solvextrade.com
```

---

## 4. DNS Configuration

Configure the following DNS records in your domain registrar (Cloudflare, Namecheap, GoDaddy, etc.):

| Type | Name / Host | Target / Points To | Proxy / SSL |
| :--- | :--- | :--- | :--- |
| **A** or **CNAME** | `@` (`solvextrade.com`) | Frontend hosting CNAME or VPS IP address | Proxied (or SSL Enabled) |
| **CNAME** | `www` | `solvextrade.com` | Proxied |
| **CNAME** or **A** | `api` (`api.solvextrade.com`) | Backend service host or VPS IP address | Proxied (or SSL Enabled) |

---

## 5. Post-Deployment Smoke Test Checklist

After completing the deployment, run through this verification checklist:

- [ ] **1. Health Check**:
  - Visit `https://api.solvextrade.com/health` (or `https://solvextrade.com/health`).
  - Expect: `{"status":"OK","timestamp":...}`.
- [ ] **2. Security & Headers**:
  - Open Developer Tools Network tab on `https://solvextrade.com`.
  - Confirm HTTPS lock is valid and no mixed-content warnings appear.
  - Verify responses contain `X-Content-Type-Options: nosniff` and `Strict-Transport-Security`.
- [ ] **3. SPA Routing & Refresh**:
  - Navigate to `https://solvextrade.com/register` and `https://solvextrade.com/dashboard`.
  - Hard refresh (Ctrl+F5 / Cmd+Shift+R) on direct URLs. Confirm no 404 page is displayed.
- [ ] **4. Registration & Email**:
  - Register a test account.
  - Confirm verification email arrives with links pointing to `https://solvextrade.com/verify-email?token=...`.
- [ ] **5. CORS Verification**:
  - Login to dashboard. Open browser console — verify 0 CORS origin blocked errors.
- [ ] **6. Production Error Handling**:
  - Trigger an invalid endpoint (e.g. `POST /api/auth/login` with invalid JSON).
  - Confirm JSON error response contains NO server stack traces or directory paths.
- [ ] **7. P2P & Multi-Network Features**:
  - Verify Deposit screen displays BEP20 / TRC20 networks.
  - Verify Withdrawal screen enforces min 10 USDT validation and BEP20/TRC20 selection.
  - Verify P2P transfer tab functions between members.
