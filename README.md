# Flowinaja — Internal Request & Approval Platform

Flowinaja is a lightweight, production-oriented internal workflow platform designed to help organizations manage requests, approvals, and operational processes with speed, clarity, and strict server-side governance.

---

## 🛠 Target Technology Stack

- **Framework:** Next.js (App Router, Server Components first)
- **UI & Styling:** React, Tailwind CSS (vanilla utility tokens, enterprise slate palette)
- **Language:** TypeScript (strict type checking enabled)
- **ORM & Database:** Prisma ORM targeting PostgreSQL (Supabase / Vercel Postgres compatible)
- **Icons:** Lucide React (tree-shakable standard icons)
- **Hosting & Deployment:** Vercel

---

## 🏗 Architecture Overview

```text
Next.js Application (src/app)
        │
        ├── Server Components (Layouts, Read Pages)
        ├── Client Components only where interaction requires
        ├── Route Handlers (API Health, Endpoints)
        │
        ▼
Service Layer (src/services)
        │
        ├── request.service.ts
        ├── approval.service.ts
        ├── notification.service.ts
        └── activity.service.ts
        │
        ▼
Data Access & ORM (src/lib/prisma.ts)
        │
        ▼
PostgreSQL / Supabase
```

---

## 🗂 Application Shell & Routes

```text
Flowinaja
├── Overview                       (/)
├── My Requests                    (/requests)
├── Approvals                      (/approvals)
├── Notifications                  (/notifications)
│
├── Management
│   ├── All Requests               (/management/requests)
│   ├── Request Types & Workflows  (/management/request-types)
│   ├── Departments                (/management/departments)
│   └── Users & Roles (RBAC)       (/management/users)
│
└── System
    ├── System Activity Log        (/system/activity)
    └── Organization Settings      (/system/settings)
```

---

## 🗄 Core Database Models (Prisma)

- **Organization:** Anchor for multi-tenant isolation (`id`, `name`, `slug`).
- **Department:** Organizational unit for routing and supervisor scopes.
- **User:** Member entity with multi-tier role (`EMPLOYEE`, `SUPERVISOR`, `MANAGER`, `ADMIN`).
- **RequestType:** Configurable request definitions (e.g. Purchase, IT Access, Maintenance, Travel, General).
- **ApprovalStep:** Sequential step definitions with role-based requirements.
- **Request:** Core request records with statuses (`DRAFT`, `SUBMITTED`, `IN_REVIEW`, `APPROVED`, etc.).
- **Approval:** Immutable historical records preserving all approval decisions and comments.
- **ActivityLog:** Audit trail logging high-level domain transitions.
- **Notification:** Database-backed in-app alerts.

---

## 🚀 Getting Started

### 1. Environment Setup

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Configure your PostgreSQL / Supabase connection strings:
- `DATABASE_URL`
- `DIRECT_URL`

### 2. Install Dependencies & Generate Prisma Client

```bash
npm install
npx prisma generate
```

### 3. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` to access the Flowinaja platform.

---

## 🧪 Validation Suite

```bash
# Type check
npm run type-check

# Lint check
npm run lint

# Prisma schema validation
npx prisma validate

# Production build
npm run build
```
