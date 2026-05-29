<div align="center">

# ☕ The Daily Grind
### Coffee Shop Management System

*A production-grade, full-stack Point-of-Sale and Operations Platform*

---

[![CI/CD](https://img.shields.io/github/actions/workflow/status/devsamikhan/coffee-management-system/deploy.yml?branch=main&label=CI%2FCD%20Pipeline&logo=github-actions&logoColor=white&style=for-the-badge)](https://github.com/devsamikhan/coffee-management-system/actions)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev)
[![Express](https://img.shields.io/badge/Express-4-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com)
[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue?style=for-the-badge)](LICENSE)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Core Features](#-core-features)
- [Architecture](#-system-architecture)
- [Project Structure](#-project-structure)
- [Tech Stack](#-tech-stack)
- [Quick Start (Local Dev)](#-quick-start-local-development)
- [Environment Variables](#-environment-variables)
- [Default Credentials](#-default-credentials)
- [API Reference](#-api-reference)
- [CI/CD Pipeline](#-cicd-pipeline)
- [Deployment Guide (Vercel)](#-cloud-deployment-vercel)
- [Contributing](#-contributing)

---

## 🌟 Overview

**The Daily Grind** is a comprehensive, enterprise-quality Coffee Shop Management System designed for modern café operations. It combines a blazing-fast Barista POS tablet interface with a full-stack management console for real-time inventory control, shift scheduling, loyalty club management, and analytics reporting — all served from a single Express.js + Vite application.

---

## ✨ Core Features

| Module | Description |
|---|---|
| 🧾 **Barista POS** | High-speed, touch-optimized order screen with modifiers, discounts, and loyalty point integration |
| 📦 **Inventory Engine** | Recipe-mapped auto-deductions from stock on every sale; low-stock alert thresholds |
| 👥 **Staff Management** | Employee directory, role-based access control (Admin / Manager / Staff) |
| 🕐 **Shift Attendance** | 4-digit PIN clock-in/out; auto-computed timesheets and payroll estimates |
| 📊 **Analytics Dashboard** | Real-time sales KPIs, top-seller rankings, daily revenue charts, category breakdowns |
| 🎖️ **Loyalty Club** | Customer point accrual and redemption tracking per transaction |
| ⚙️ **Store Settings** | Tax rate, currency, opening hours, address, and discount code management |

---

## 🏗️ System Architecture

```
┌───────────────────────────────────────────────────────────────┐
│                      GitHub Actions CI/CD                      │
│        Type-Check (tsc) → Build (Vite + esbuild) → Deploy     │
└──────────────────────────────┬────────────────────────────────┘
                               │
                        ┌──────▼──────┐
                        │   Vercel    │  (Node.js Serverless Runtime)
                        └──────┬──────┘
                               │
              ┌────────────────┴────────────────┐
              │                                 │
     ┌────────▼────────┐               ┌────────▼────────┐
     │  /api/*  routes │               │  Static Assets  │
     │  Express.js     │               │  dist/ (Vite)   │
     │  REST API       │               │  index.html SPA │
     └────────┬────────┘               └─────────────────┘
              │
     ┌────────▼────────┐
     │   In-Memory DB  │
     │  (db.ts store)  │
     └─────────────────┘
```

> **Note:** The Express server handles both the REST API and acts as the SPA fallback — returning `index.html` for all non-API client-side routes, eliminating 404 errors on direct URL refreshes.

---

## 📂 Project Structure

```text
coffee-management-system/
│
├── .github/
│   └── workflows/
│       └── deploy.yml          # CI/CD: Type-check → Build → Vercel Deploy
│
├── src/
│   ├── App.tsx                 # Root React shell, view router, session state
│   ├── main.tsx                # React 19 bootstrap entry point
│   ├── index.css               # Global design system, Inter font, theme tokens
│   ├── types.ts                # TypeScript model declarations (User, Order, Menu…)
│   ├── utils.ts                # Currency formatters, CSV exporters, calculations
│   │
│   ├── components/             # All UI feature modules (POS, Inventory, Reports…)
│   │
│   └── server/
│       ├── db.ts               # In-memory state engine with JSON persistence
│       └── middleware/
│           └── auth.ts         # Role verification middleware
│
├── server.ts                   # Express.js server + Vite dev proxy middleware
├── index.html                  # Root HTML document
├── vite.config.ts              # Vite bundler configuration
├── tsconfig.json               # TypeScript compiler options
├── vercel.json                 # Vercel routing & serverless build config
├── package.json                # Scripts, dependencies, project metadata
├── package-lock.json           # Exact dependency lockfile (committed)
└── .env.example                # Environment variable template (safe to commit)
```

---

## 🛠️ Tech Stack

| Layer | Technology | Version |
|---|---|---|
| **Runtime** | Node.js | 20 LTS |
| **Language** | TypeScript | ~5.8 |
| **Frontend Framework** | React | ^19 |
| **Build Tool** | Vite | ^6.2 |
| **Server Framework** | Express.js | ^4.21 |
| **Server Bundler** | esbuild | ^0.25 |
| **CSS Framework** | Tailwind CSS v4 | ^4.1 |
| **Charts** | Recharts | ^3.8 |
| **Animations** | Motion (Framer) | ^12 |
| **Data Fetching** | TanStack Query | ^5 |
| **AI Integration** | Google GenAI SDK | ^2.4 |
| **CI/CD** | GitHub Actions | — |
| **Cloud Host** | Vercel | — |

---

## 🚀 Quick Start (Local Development)

### Prerequisites

Ensure the following are installed on your machine:

- **Node.js** `>= 20.x` — [Download](https://nodejs.org)
- **npm** `>= 10.x` (bundled with Node.js)
- **Git** — [Download](https://git-scm.com)

### Step-by-Step Setup

**1. Clone the repository**
```bash
git clone https://github.com/devsamikhan/coffee-management-system.git
cd coffee-management-system
```

**2. Install all dependencies using the exact lockfile**
```bash
npm ci
```

**3. Configure environment variables**
```bash
cp .env.example .env
# Then edit .env with your values (see Environment Variables section below)
```

**4. Start the full-stack development server**
```bash
npm run dev
```

The application will be live at **`http://localhost:3000`**

> The dev server runs the Express.js backend with Vite's HMR (Hot Module Replacement) middleware proxied inline — a single port for both API and frontend.

---

### All Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start full-stack dev server with Vite HMR on port 3000 |
| `npm run build` | Build Vite frontend + bundle server to `dist/` |
| `npm start` | Boot the production Node.js server from `dist/server.cjs` |
| `npm run lint` | Run strict TypeScript type-checking (`tsc --noEmit`) |
| `npm run preview` | Preview the Vite production build locally |
| `npm run clean` | Remove the `dist/` directory |

---

## 🔐 Environment Variables

Copy `.env.example` to `.env` and populate the values:

```bash
cp .env.example .env
```

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | ✅ Yes | Google Gemini API key for AI features |
| `NODE_ENV` | Auto-set | `development` or `production` |

> ⚠️ **Never commit your `.env` file.** It is strictly blocked by `.gitignore`. Only `.env.example` (with no real values) is safe to commit.

---

## 🔑 Default Credentials

> These are seeded demo credentials for local development only.

### POS Barista Screen (4-Digit PIN)

| Role | PIN |
|---|---|
| Admin | `9999` |
| Manager | `2222` |
| Barista Jordan | `1111` |
| Barista Taylor | `3333` |

### Management Console (Email + Password)

| Role | Email | Password |
|---|---|---|
| Admin | `admin@dailygrind.com` | `9999` |
| Manager | `elena@dailygrind.com` | `2222` |

---

## 📡 API Reference

All endpoints are prefixed with `/api`. Protected routes require a `Bearer` token in the `Authorization` header.

### 🔓 Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/login` | Public | Email + password sign-in → returns Bearer token |
| `POST` | `/api/auth/pin-login` | Public | 4-digit PIN sign-in for POS access |
| `POST` | `/api/auth/clock` | Public | Clock-in / Clock-out toggle by PIN |

### 👤 Staff Management

| Method | Endpoint | Roles | Description |
|---|---|---|---|
| `GET` | `/api/employees` | Admin, Manager | Retrieve all staff records |
| `POST` | `/api/employees` | Admin | Create new staff member |
| `PUT` | `/api/employees/:id` | Admin, Manager | Update employee record |
| `DELETE` | `/api/employees/:id` | Admin | Disable staff member |

### ☕ Menu Catalog

| Method | Endpoint | Roles | Description |
|---|---|---|---|
| `GET` | `/api/menu` | Public | Retrieve full menu |
| `POST` | `/api/menu` | Admin, Manager | Add new menu item |
| `PUT` | `/api/menu/:id` | Admin, Manager | Update menu item |
| `DELETE` | `/api/menu/:id` | Admin, Manager | Remove menu item |

### 📦 Inventory

| Method | Endpoint | Roles | Description |
|---|---|---|---|
| `GET` | `/api/ingredients` | All authenticated | Query stock levels |
| `POST` | `/api/ingredients` | Admin, Manager | Create ingredient entry |
| `PUT` | `/api/ingredients/:id` | Admin, Manager | Adjust stock or supplier data |
| `DELETE` | `/api/ingredients/:id` | Admin, Manager | Remove ingredient |

### 🧾 Orders

| Method | Endpoint | Roles | Description |
|---|---|---|---|
| `GET` | `/api/orders` | All authenticated | Transaction history |
| `POST` | `/api/orders` | All authenticated | Process cart → deduct stock → return receipt |

### 📊 Reporting

| Method | Endpoint | Roles | Description |
|---|---|---|---|
| `GET` | `/api/reports/dashboard` | Admin, Manager | Today's KPIs: sales, orders, low stock, labor cost |
| `GET` | `/api/reports/sales` | Admin, Manager | 7-day revenue timeline + category breakdown |

### ⚙️ Settings & Alerts

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/settings` | Public | Retrieve store configuration |
| `POST` | `/api/settings` | Admin, Manager | Update store configuration |
| `GET` | `/api/alerts` | All authenticated | Active system alerts |
| `DELETE` | `/api/alerts/:id` | All authenticated | Dismiss an alert |

---

## ⚙️ CI/CD Pipeline

The GitHub Actions workflow at [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) runs automatically on every push to `main`.

```
push to main
      │
      ▼
┌─────────────────────────────────┐
│  Job 1: Build (Quality Gate)    │
│  ─────────────────────────────  │
│  1. Checkout code               │
│  2. Setup Node.js 20.x          │
│  3. npm ci (lockfile install)   │
│  4. tsc --noEmit (type-check)   │
│  5. npm run build               │
│  6. Upload dist/ artifact       │
└─────────────┬───────────────────┘
              │ on success
              ▼
┌─────────────────────────────────┐
│  Job 2: Deploy (main only)      │
│  ─────────────────────────────  │
│  1. npm ci                      │
│  2. vercel --prod               │
└─────────────────────────────────┘
```

### Required GitHub Secrets

Navigate to **Settings → Secrets and variables → Actions** in your repository and add:

| Secret Name | How to Get |
|---|---|
| `VERCEL_TOKEN` | [Vercel Dashboard → Settings → Tokens](https://vercel.com/account/tokens) |
| `VERCEL_ORG_ID` | Run `vercel whoami` after `vercel login` or check `.vercel/project.json` |
| `VERCEL_PROJECT_ID` | Run `vercel link` and inspect `.vercel/project.json` |
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/apikey) |

---

## ☁️ Cloud Deployment (Vercel)

This application deploys as a **Node.js serverless function** on Vercel (not a static site), since it includes an Express.js backend.

### First-Time Setup

**1. Install the Vercel CLI globally**
```bash
npm install -g vercel
```

**2. Authenticate with your Vercel account**
```bash
vercel login
```

**3. Link the project to Vercel (run once from the project root)**
```bash
vercel link
# Follow prompts: select your team/scope, create or link to existing project
# This generates .vercel/project.json — add it to .gitignore (already handled)
```

**4. Set production environment variables on Vercel**
```bash
vercel env add GEMINI_API_KEY production
# Paste your key when prompted
```

**5. Deploy to production manually (optional — CI/CD handles this automatically)**
```bash
vercel --prod
```

### How Routing Works

The [`vercel.json`](vercel.json) routes are configured as follows:

| Pattern | Destination | Purpose |
|---|---|---|
| `/api/*` | `dist/server.cjs` | Express REST API handler |
| `/assets/*` | `dist/assets/` | Vite-bundled static assets |
| `/*.js, *.css…` | `dist/` | Static file passthrough |
| `/**` (catch-all) | `dist/server.cjs` | Express SPA fallback → `index.html` |

The catch-all route ensures that refreshing any client-side route (e.g., `/dashboard`, `/inventory`) **never produces a 404** — the Express server returns `index.html` and React Router takes over.

---

## 🤝 Contributing

1. **Fork** the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -m 'feat: add your feature'`
4. Push to your fork: `git push origin feature/your-feature-name`
5. Open a **Pull Request** against `main`

> All pull requests must pass the **CI/CD quality gate** (type-check + build) before merging.

---

<div align="center">

Built with ☕ by the Daily Grind Engineering Team

[Report a Bug](https://github.com/devsamikhan/coffee-management-system/issues) · [Request a Feature](https://github.com/devsamikhan/coffee-management-system/issues)

</div>
