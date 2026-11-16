# FreelanceHub – Architecture and Design Notes

## 1. Architecture

FreelanceHub uses a three-tier web architecture:

```mermaid
flowchart TD
    A[Browser / React + Vite] -->|HTTPS REST / Socket.IO| B[Node.js + Express API on Render]
    B -->|Prisma ORM| C[(PostgreSQL on Neon)]
    B --> D[JWT Authentication + RBAC]
    B --> E[Notification and Messaging Services]
```

## 2. Main modules

- Authentication and authorization
- User profile management
- Project marketplace
- Proposal and hiring workflow
- Contract and milestone management
- Messaging and notifications
- Reviews and reputation
- Administration and dispute oversight

## 3. Key entities

```mermaid
erDiagram
    USER ||--o| FREELANCER_PROFILE : has
    USER ||--o| CLIENT_PROFILE : has
    USER ||--o{ PROJECT : posts
    USER ||--o{ PROPOSAL : submits
    PROJECT ||--o{ PROPOSAL : receives
    PROJECT ||--o| CONTRACT : creates
    PROPOSAL ||--o| CONTRACT : accepted_as
    CONTRACT ||--o{ MILESTONE : contains
    CONTRACT ||--o{ MESSAGE : context
    CONTRACT ||--o{ REVIEW : receives
    USER ||--o{ MESSAGE : sends
    USER ||--o{ NOTIFICATION : receives
    USER ||--o{ REVIEW : writes
    USER ||--o{ SAVED_PROJECT : saves
    PROJECT ||--o{ SAVED_PROJECT : saved_in
```

## 4. Proposal-to-contract sequence

```mermaid
sequenceDiagram
    actor Freelancer
    participant API
    participant DB as PostgreSQL
    actor Client
    Freelancer->>API: Submit proposal
    API->>DB: Validate project and uniqueness
    DB-->>API: Proposal created
    API-->>Client: Notification created
    Client->>API: Accept proposal
    API->>DB: Transaction: accept proposal, reject others, create contract, update project
    DB-->>API: Commit
    API-->>Freelancer: Proposal accepted + contract created
```

## 5. Contract state model

```mermaid
stateDiagram-v2
    [*] --> ACTIVE
    ACTIVE --> SUBMITTED: Freelancer submits work
    SUBMITTED --> REVISION_REQUESTED: Client requests changes
    REVISION_REQUESTED --> ACTIVE: Freelancer starts revision
    SUBMITTED --> COMPLETED: Client approves
    ACTIVE --> CANCELLED: Cancellation (future workflow)
    COMPLETED --> [*]
```

## 6. Security design

1. Passwords are hashed with bcrypt before storage.
2. Login issues a signed JWT; protected API requests use the Bearer token.
3. Authentication middleware resolves the current database user and checks account activity.
4. Role middleware restricts role-specific APIs.
5. Resource ownership is checked in each project, proposal, contract and message operation.
6. Admin is not a public registration option; the seed process creates an administrator.
7. Helmet, CORS allow-listing and API rate limits provide baseline HTTP protections.

## 7. Deployment design

- React static assets are deployed as a Render Static Site.
- Express + Socket.IO is deployed as a Render Web Service.
- PostgreSQL runs on Neon.
- Environment variables store database URLs, JWT secret and deployment origins.
- The frontend uses the `VITE_API_URL` and `VITE_SOCKET_URL` build-time variables.
