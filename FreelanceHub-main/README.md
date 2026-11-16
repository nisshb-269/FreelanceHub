# FreelanceHub

**FreelanceHub – Freelancing Platform Management System**  
*Where Talent Meets Opportunity.*

A role-based freelancing marketplace for clients, freelancers and platform administrators. This repository is the first runnable implementation for the Software Engineering course project.

## Technology

- **Frontend:** React 19, Vite, React Router, Axios, Recharts, Socket.IO Client
- **Backend:** Node.js, Express, Socket.IO
- **Database:** PostgreSQL (Neon-compatible)
- **ORM:** Prisma
- **Authentication:** JWT + bcrypt password hashing
- **Deployment target:** Render Static Site + Render Web Service + Neon PostgreSQL

## What is included

- Public marketing homepage, project browser and freelancer directory
- Client, Freelancer and Admin roles
- Registration, login, JWT sessions and protected role-based routes
- Freelancer and client profile management
- Project posting, searching, filtering and saved-project lists
- Multi-freelancer team projects with invitations, acceptance, shared project chat, and task assignment/status tracking
- Freelancer proposals and client review / accept / reject workflow
- Contract creation, submission, revision request and client approval
- Contract milestones (client creation, freelancer progress updates and client approval)
- Direct messages through REST API and Socket.IO events
- Notifications and read/unread status
- Reviews and ratings after contract completion
- Admin user controls, freelancer verification, project monitoring and dispute management
- Responsive layouts with readable, high-contrast typography and mobile navigation

> This is an academic project. Payment records are represented in the data model; no real payment gateway or escrow is connected. Team collaboration provides a shared workspace and task board, but the current contract and payment model still supports one hired freelancer per contract and does not split payouts between team members. File upload and email-based password reset are planned follow-up modules. Disputes can be submitted from a contract and reviewed by an administrator.

## Requirements

- Node.js 20.19+ or 22.12+
- npm 10+
- A PostgreSQL database (Neon Free is suitable)

## Run locally

1. Create a PostgreSQL database in Neon, or use another PostgreSQL database.
2. Copy environment templates:

   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```

3. Update `backend/.env`:
   - `DATABASE_URL`: PostgreSQL pooled connection URL (append `sslmode=require`)
   - `DIRECT_URL`: PostgreSQL direct connection URL (append `sslmode=require`)
   - `JWT_SECRET`: long, random secret (32+ characters)
   - `CLIENT_URL=http://localhost:5173`
   - To create the first administrator, set BOTH `ADMIN_EMAIL` and `ADMIN_PASSWORD`. Use a unique email and a password of at least 12 characters. Leave both blank to skip administrator creation.

4. Install dependencies from the repository root:

   ```bash
   npm install
   npm install --prefix backend
   npm install --prefix frontend
   ```

5. Generate Prisma Client, create tables in a local/development database, and optionally seed the administrator:

   ```bash
   npm run db:generate
   npm run db:push
   npm run db:seed
   ```

6. Start frontend and backend together:

   ```bash
   npm run dev
   ```

7. Open `http://localhost:5173`. API liveness endpoint: `http://localhost:5000/api/health`; database readiness endpoint: `http://localhost:5000/api/health/ready`.

### Administrator seeding

The seed script does not contain a default administrator email or password. It creates an administrator only when both `ADMIN_EMAIL` and `ADMIN_PASSWORD` are explicitly configured. The password must be at least 12 characters. If that administrator already exists, repeated deployments leave its password and active/suspended status unchanged. A non-admin account cannot be silently promoted by the seed script.

## Useful commands

```bash
# Start both apps from the root
npm run dev

# Frontend production build
npm run build

# Backend syntax checks and unit tests
npm run check:syntax --prefix backend
npm test --prefix backend

# Backend only
npm run dev --prefix backend

# Prisma Studio
npm run studio --prefix backend

# Re-sync schema during local development only
npm run db:push

# Create the first admin when both ADMIN_EMAIL and ADMIN_PASSWORD are set
npm run db:seed
```

For step-by-step Windows PowerShell commands, see [docs/LOCAL_SETUP_WINDOWS.md](docs/LOCAL_SETUP_WINDOWS.md).

## Deployment

### 1. Neon PostgreSQL

Create a PostgreSQL project in Neon. Copy both the pooled connection string and the direct connection string. Keep SSL enabled. Configure both connection strings in the Render backend environment.

### 2. Render backend

Create a **Web Service** from the GitHub repository:

- Root Directory: `backend`
- Build Command: `npm install --include=dev && npx prisma generate`
- Start Command: `npm start`
- Environment: `NODE_ENV=production`, `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN=7d`, `CLIENT_URL=https://YOUR-FRONTEND.onrender.com`

The backend build installs dependencies and generates Prisma Client. The backend release command runs `npx prisma migrate deploy`, applying only checked-in, pending migrations before the new service version starts. The team collaboration migration is additive: it adds project team settings and the new membership, task, and team-message tables without deleting or rewriting existing projects, proposals, contracts, or users. Keep a current database backup before applying any production schema change. If the backend service was created manually rather than from the Blueprint, set its Release Command to `npx prisma migrate deploy` before deploying this feature. For a brand-new empty database only, initialize the base schema with `npx prisma db push` from a trusted environment before using the incremental migration history. Do not run schema push casually against an existing production database. To create an initial administrator, run `npm run db:seed --prefix backend` once from a trusted terminal with the intended database and the two administrator environment variables configured.

### 3. Render frontend

Create a **Static Site**:

- Root Directory: `frontend`
- Build Command: `npm install && npm run build`
- Publish Directory: `dist`
- Environment: `VITE_API_URL=https://YOUR-BACKEND.onrender.com/api`, `VITE_SOCKET_URL=https://YOUR-BACKEND.onrender.com`

Add a rewrite rule for SPA routing: source `/*` → destination `/index.html` → action `Rewrite`. The repository's `render.yaml` also declares this rewrite for Blueprint-managed static sites. If the service was created manually, verify that the same rule exists in its Render dashboard settings.

Update backend `CLIENT_URL` to the exact deployed frontend origin, then redeploy the backend.

> Render Free web services can spin down after inactivity. The first request after a spin-down may be delayed. Check Render's current free-tier limits before deployment.

## Project structure

```text
freelancehub/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.js
│   └── src/
│       ├── middleware/       # JWT authentication and RBAC
│       ├── routes/           # REST API modules
│       ├── utils/            # Prisma and HTTP helpers
│       └── server.js         # Express + Socket.IO server
├── frontend/
│   ├── src/
│   │   ├── components/      # Reusable components
│   │   ├── context/         # Authentication state
│   │   ├── layouts/         # Role-aware workspace layout
│   │   ├── pages/           # Public and dashboard pages
│   │   ├── services/        # API client
│   │   └── styles.css       # Design system and responsive styles
│   └── index.html
└── docs/                    # SRS, SE overview, design and testing notes
```

## Security notes

- Passwords are hashed with bcrypt (12 rounds).
- The API issues signed JWT tokens; protected endpoints re-check the active user from PostgreSQL.
- Role restrictions are enforced on the server, not only hidden in the UI.
- Helmet, CORS allow-listing, JSON body limits and rate limiting are enabled.
- Never commit `.env`, service credentials or production secrets.
- Never use predictable default administrator credentials on a public deployment.
