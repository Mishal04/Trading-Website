# Group Trading Plan – Frontend

Modern React + Vite + Tailwind frontend for the Group Trading Plan platform.

## Features

- Landing page with all investment packages, profit sharing, 25-level commission, salary & rewards
- Registration (with referral code support)
- Login + JWT auth
- Email verification page
- User dashboard (wallet, referral link)
- Dark / gold premium theme inspired by thesonic.ai

## Setup

```bash
cd frontend
npm install
npm run dev
```

App runs at http://localhost:5173

Backend API is proxied to `http://localhost:5000` (see `vite.config.js`).

## Environment

Create `.env` if needed:

```
VITE_API_URL=http://localhost:5000/api
```

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/register` | Registration form |
| `/login` | Login form |
| `/verify-email/:token` | Email verification |
| `/dashboard` | User dashboard |

## Stack

- React 19
- Vite 8
- Tailwind CSS 4
- React Router 7
- Axios
- Lucide React icons
- React Hot Toast
