# Reversible Maintenance Mode Implementation

## Overview

SolvexTrade now supports a **reversible, non-destructive maintenance mode** that allows you to display a professional maintenance page instead of the landing page, without affecting any backend functionality or user data.

---

## How It Works

### Architecture

- **Frontend-only**: Maintenance mode is controlled entirely by a frontend environment variable
- **Non-destructive**: No backend changes, database modifications, or commission processing interruptions
- **Reversible**: Toggle on/off by changing one environment variable and rebuilding
- **Zero downtime**: User authentication, admin panel, and commission cron jobs remain fully operational

### Files Created

```
frontend/src/pages/MaintenancePage.jsx          - Professional maintenance page component
```

### Files Modified

```
frontend/src/App.jsx                            - Added routing logic to show maintenance page
frontend/.env.example                           - Added VITE_MAINTENANCE_MODE variable documentation
frontend/.env                                   - Contains VITE_MAINTENANCE_MODE setting
```

### Backend Status

✅ **Zero changes** to backend files:
- `backend/src/config/cronJobs.js` - Unchanged
- `backend/src/services/commissionService.js` - Unchanged
- `backend/src/services/profitService.js` - Unchanged
- All backend routes - Unchanged
- All models - Unchanged
- Database - Untouched

---

## How to Enable Maintenance Mode

### Step 1: Update Environment Variable

Edit `frontend/.env`:

```bash
VITE_MAINTENANCE_MODE=true
```

### Step 2: Rebuild Frontend

```bash
cd frontend
npm run build
```

### Step 3: Deploy

Deploy the new build to your production server (Hostinger, etc.). Changes will take effect automatically.

### Result

When users visit `https://solvextrade.com/`, they will see:
- ✅ Professional "We'll Be Back Soon!" maintenance page
- ✅ SolvexTrade branding and gold color scheme
- ✅ Animated maintenance icon
- ✅ System status indicator (blinking green dot)
- ✅ Contact information
- ✅ Responsive design (mobile, tablet, desktop)

**Important**: Users can still access:
- ✅ `/login` - Login page
- ✅ `/register` - Registration page
- ✅ `/admin` - Admin panel (if logged in)
- ✅ `/dashboard` - User dashboard (if logged in)
- ✅ All backend APIs for authenticated users

---

## How to Disable Maintenance Mode

### Step 1: Update Environment Variable

Edit `frontend/.env`:

```bash
VITE_MAINTENANCE_MODE=false
```

### Step 2: Rebuild Frontend

```bash
cd frontend
npm run build
```

### Step 3: Deploy

Deploy the new build. The original landing page will restore automatically.

### Result

- ✅ Landing page displays normally
- ✅ All features restored
- ✅ No data loss or recovery needed

---

## Maintenance Page Features

The maintenance page includes:

- **Branding**: SolvexTrade logo and color scheme (gold/dark theme)
- **Heading**: "We'll Be Back Soon!"
- **Main Message**: "SolvexTrade is currently undergoing maintenance"
- **Supporting Text**: "We're working to improve your experience..."
- **Status Indicator**: Animated blinking green dot + "Maintenance in Progress" text
- **Estimated Time**: "Within 24 hours"
- **Contact Info**: Email link (info.solvex1@gmail.com)
- **Animation**: 
  - Rotating outer circle
  - Pulsing middle circle
  - Bouncing wrench icon (⚡)
  - Subtle background glow effects
- **Responsive**: Works perfectly on mobile, tablet, and desktop
- **Polished**: Modern financial/trading website aesthetic

---

## What's Protected During Maintenance

✅ **Commission Processing**
- Daily profit calculation: Runs at 4 PM Pakistan time (unchanged)
- Level distribution: Operates normally
- ROI payouts: Continue as scheduled
- Commission pools: Monthly distribution unaffected

✅ **User Accounts**
- Login/registration: Fully functional
- Authentication: No changes
- Passwords: Secure as always
- Email verification: Works normally

✅ **Admin Functionality**
- Admin panel: Fully accessible (`/admin`)
- Investment management: No changes
- User management: No changes
- Commission monitoring: No changes

✅ **Payments & Wallets**
- Withdrawal processing: Operates normally
- Deposit processing: Unaffected
- Wallet balances: Unchanged
- Transaction history: Preserved

✅ **Database**
- Zero modifications
- All data intact
- No backups needed
- No recovery procedures required

---

## Environment Variable Reference

### `VITE_MAINTENANCE_MODE`

| Value | Behavior |
|-------|----------|
| `true` | Display maintenance page on `/` (landing page replaced) |
| `false` | Display normal landing page (default, production) |

**Default**: `false` (maintenance mode off)

**Location**: `frontend/.env`

**Example**:
```bash
# Enable maintenance mode
VITE_MAINTENANCE_MODE=true

# Disable maintenance mode
VITE_MAINTENANCE_MODE=false
```

---

## Deployment Instructions

### For Hostinger (Auto-Deploy)

1. Update `frontend/.env`:
   ```bash
   VITE_MAINTENANCE_MODE=true  # Enable maintenance
   ```

2. Rebuild:
   ```bash
   npm run build
   ```

3. Commit and push:
   ```bash
   git add frontend/.env frontend/dist
   git commit -m "enable: maintenance mode"
   git push origin main
   ```

4. Hostinger will auto-deploy within minutes

### For Manual VPS Deployment

1. Update `frontend/.env` on your local machine
2. Rebuild: `npm run build`
3. SCP the `dist/` folder to your VPS:
   ```bash
   scp -r frontend/dist/* user@vps:/var/www/solvextrade/
   ```
4. Clear web server cache (if using Nginx/Apache)
5. Restart web server if needed

### For Docker Deployments

1. Update `frontend/.env` in your Dockerfile build args
2. Rebuild image: `docker build -t solvextrade:maintenance .`
3. Deploy: `docker-compose up -d`

---

## Testing Checklist

✅ Maintenance mode enabled:
- [ ] `npm run build` completes successfully
- [ ] Visit homepage → maintenance page displays
- [ ] Animations play smoothly
- [ ] Responsive on mobile/tablet/desktop
- [ ] Contact email link works
- [ ] `/login` still accessible
- [ ] Admin can still login
- [ ] Commission cron still runs (check backend logs)

✅ Maintenance mode disabled:
- [ ] `npm run build` completes successfully
- [ ] Visit homepage → original landing page displays
- [ ] All landing page features work
- [ ] No data loss

---

## Troubleshooting

### Maintenance page not showing

**Issue**: Changed `VITE_MAINTENANCE_MODE=true` but landing page still displays

**Solution**:
1. Did you rebuild? → `npm run build`
2. Did you deploy the new `dist/` folder?
3. Clear browser cache: `Ctrl + Shift + R`
4. Check `.env` file has correct value: `VITE_MAINTENANCE_MODE=true`

### Landing page not restoring

**Issue**: Changed to `VITE_MAINTENANCE_MODE=false` but maintenance page still shows

**Solution**:
1. Rebuild: `npm run build`
2. Deploy new dist
3. Clear browser cache: `Ctrl + Shift + R`
4. Hard refresh: `Ctrl + F5`

### CommissionCron not running

**Issue**: Commission processing stopped during maintenance

**Cause**: This should never happen—backend is completely untouched

**Solution**: Check backend logs at `backend/server_debug.log`

---

## Git Diff Summary

### Files Created
- `frontend/src/pages/MaintenancePage.jsx` (170 lines)

### Files Modified
- `frontend/src/App.jsx` (12 lines added)
- `frontend/.env.example` (5 lines added)
- `frontend/.env` (maintenance mode variable)

### Backend Files
- **No changes** ✅

---

## Implementation Details

### MaintenancePage Component

```jsx
// Components:
- Gradient background with subtle animations
- SolvexTrade branding badge
- "We'll Be Back Soon!" heading (gradient text)
- Professional messaging
- Status indicator (animated blinking dot)
- Estimated completion time
- Contact information
- Animated maintenance illustration
- Responsive layout
- Dark theme (matching SolvexTrade design)
```

### App.jsx Routing Logic

```jsx
const maintenanceMode = import.meta.env.VITE_MAINTENANCE_MODE === 'true';

// If true: Show maintenance page on "/"
// If false: Show normal landing page

// Other routes (login, admin, dashboard) unaffected
```

---

## Support

For issues or questions about maintenance mode:

1. Check this documentation first
2. Review git history: `git log --oneline | grep -i maintenance`
3. Contact: info.solvex1@gmail.com

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-09-25 | Initial implementation - Reversible maintenance mode with professional UI |

---

## License

Part of SolvexTrade platform. All rights reserved.

© 2026 SolvexTrade. All rights reserved.
