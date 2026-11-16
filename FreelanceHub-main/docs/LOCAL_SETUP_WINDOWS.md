# FreelanceHub – Windows local setup

These steps are written for Windows PowerShell and assume Node.js 20.19+ (or 22.12+) and npm are installed.

## 1. Create the Neon database

1. Create a free PostgreSQL project in Neon.
2. Copy the **pooled** connection string for `DATABASE_URL`.
3. Copy the **direct** connection string for `DIRECT_URL`.
4. Keep `sslmode=require` in both connection strings.

## 2. Configure environment files

Open PowerShell in the extracted `freelancehub` folder:

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

Open `backend/.env` and set:

- `DATABASE_URL` to the Neon pooled URL.
- `DIRECT_URL` to the Neon direct URL.
- `JWT_SECRET` to a long random secret (at least 32 characters).
- `CLIENT_URL` to `http://localhost:5173`.
- `ADMIN_EMAIL` and a new, strong `ADMIN_PASSWORD`.

The default admin password in `.env.example` is only a local placeholder. Replace it before running the seed command. Never commit either `.env` file.

The frontend `.env` can keep these local values:

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

## 3. Install dependencies

From the project root:

```powershell
npm install
npm install --prefix backend
npm install --prefix frontend
```

## 4. Create database tables and the administrator

```powershell
npm run db:generate
npm run db:push
npm run db:seed
```

The seed command creates or updates the administrator account from `ADMIN_EMAIL` and `ADMIN_PASSWORD`.

## 5. Start FreelanceHub

```powershell
npm run dev
```

Open `http://localhost:5173`. The API health endpoint is `http://localhost:5000/api/health`.

## 6. Test the main workflow

1. Register one account as **Client**.
2. Sign out and register another account as **Freelancer** (use a separate browser profile or private window to test two accounts easily).
3. As Client, post a project with a title, description, budget and skills.
4. As Freelancer, find that project and submit a proposal.
5. As Client, open **My projects → View proposals** and hire the freelancer.
6. As Freelancer, open **My contracts**, add or update delivery milestones where available, and submit the work.
7. As Client, approve the work or request a revision.
8. After completion, both participants can leave a review.
9. Sign in with the seeded administrator to inspect users, projects and disputes.

## Notes

- A project can have one hired freelancer in this first release.
- Payment rows are represented in the database, but no real payment or escrow provider is connected.
- File uploads and email-based password reset are not included in this first release.
- The Render free backend may sleep when idle; the first request after inactivity can be delayed.
