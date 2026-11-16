# Software Requirements Specification (SRS)

**Project:** FreelanceHub – Freelancing Platform Management System  
**Version:** 1.0 (Initial academic release)  
**SDLC:** Agile (Scrum-inspired)  
**Date:** 16 November 2026

## 1. Introduction

### 1.1 Purpose

This document defines the functional and non-functional requirements for FreelanceHub. It is intended for the two-person development team, course evaluator, testers and future maintainers.

### 1.2 Product scope

FreelanceHub is a web-based marketplace where clients publish projects and freelancers submit proposals. A client may accept one proposal, which creates a contract. The contract workflow supports milestones, work submission, revision requests, completion, direct messaging and reviews. Administrators manage users, monitor projects and review disputes.

The first academic release does not transfer real money, provide escrow, send password-reset emails or store uploaded project files. Transaction entities are retained as a data-model extension only.

### 1.3 Definitions

- **Client:** a user who publishes a project and hires a freelancer.
- **Freelancer:** a user who presents skills and applies to client projects.
- **Administrator:** a privileged user provisioned through the seed process.
- **Proposal:** a freelancer's bid and delivery estimate for a project.
- **Contract:** the agreement created after a client accepts a proposal.
- **Milestone:** a smaller delivery step within a contract.
- **RBAC:** role-based access control.

## 2. Overall description

### 2.1 Product perspective

The system uses a three-tier architecture: a React/Vite browser client, a Node.js/Express API, and a PostgreSQL database accessed through Prisma. JWT authenticates API requests; the API performs role and resource-ownership checks. Socket.IO delivers new-message events to authenticated sessions.

### 2.2 User classes

| User class | Main capabilities | Restrictions |
|---|---|---|
| Visitor | Browse public projects and freelancer profiles; register or log in | Cannot submit proposals or create projects |
| Client | Manage profile, post projects, review proposals, hire, manage contracts/milestones, message and review | Cannot manage another client's projects or use administrator controls |
| Freelancer | Manage professional profile, discover/save projects, submit proposals, update milestones, submit work, message and review | Cannot post client projects or decide proposals |
| Administrator | View/manage users, verify freelancers, monitor projects and resolve disputes | Admin role is not available through public registration |

### 2.3 Operating environment

- Current desktop and mobile web browsers.
- Node.js 20.19+ or 22.12+ and npm 10+ for local development.
- PostgreSQL hosted locally or through Neon.
- Render Static Site and Web Service for the target deployment.

### 2.4 Constraints

- A project can have at most one contract in the initial release.
- Each freelancer can submit at most one proposal per project.
- Only the client who owns a project can review its proposals.
- A review can be submitted only by a participant of a completed contract, once per participant.
- The first release uses INR for displayed project and contract values.

## 3. Functional requirements

| ID | Requirement | Priority |
|---|---|---|
| FR-01 | The system shall allow visitors to register as Client or Freelancer. | Must |
| FR-02 | The system shall authenticate users using email and password and issue a signed JWT. | Must |
| FR-03 | The system shall hash passwords before storing them. | Must |
| FR-04 | The system shall reject protected requests from unauthenticated or inactive accounts. | Must |
| FR-05 | The system shall enforce role permissions and resource ownership on the server. | Must |
| FR-06 | Users shall update their profile; freelancers shall maintain skills, headline, rate and portfolio URL. | Must |
| FR-07 | Visitors and users shall browse open projects and filter by keyword, category, skill and budget range. | Must |
| FR-08 | Clients shall create, edit, cancel and view their own projects. | Must |
| FR-09 | Freelancers shall save and remove projects from a personal saved-project list. | Should |
| FR-10 | Freelancers shall submit one proposal per open project containing a cover letter, bid and delivery estimate. | Must |
| FR-11 | Clients shall view proposals received for their projects and accept or reject pending proposals. | Must |
| FR-12 | Accepting a proposal shall atomically create a contract, reject other pending proposals for the project and move the project to in-progress. | Must |
| FR-13 | Contract participants shall view contract details, dates, amount and delivery status. | Must |
| FR-14 | Clients shall create contract milestones whose total amount does not exceed the contract value. | Should |
| FR-15 | Freelancers shall start and submit milestones; clients shall approve submitted milestones. | Should |
| FR-16 | Freelancers shall submit completed contract work. | Must |
| FR-17 | Clients shall approve submitted work or request a revision; freelancers shall resume work after a revision request. | Must |
| FR-18 | Contract participants shall exchange direct messages and receive notifications. | Must |
| FR-19 | Users shall view notifications and mark them as read individually or collectively. | Should |
| FR-20 | Contract participants shall submit one 1–5 star review for the other participant after completion. | Must |
| FR-21 | Administrators shall list, search, activate/deactivate and verify user accounts. | Must |
| FR-22 | Administrators shall monitor projects and review/resolve submitted disputes. | Must |
| FR-23 | The system shall show role-appropriate dashboard summaries and recent activity. | Should |

## 4. Non-functional requirements

| ID | Quality attribute | Requirement |
|---|---|---|
| NFR-01 | Security | Passwords shall use bcrypt hashing; API authentication shall use signed JWTs. |
| NFR-02 | Authorization | Role checks and record ownership checks shall run in the backend for protected operations. |
| NFR-03 | Data integrity | Foreign keys, uniqueness constraints and database transactions shall protect related data. |
| NFR-04 | Usability | Typography, form controls and navigation shall be readable on desktop and mobile screens. |
| NFR-05 | Performance | Common list queries shall use pagination, selected fields and database indexes where appropriate. |
| NFR-06 | Maintainability | API routes shall be separated by domain and shared logic shall use middleware/helpers. |
| NFR-07 | Availability | The deployed service shall expose a health endpoint; free hosting sleep/cold-start limitations shall be documented. |
| NFR-08 | Compatibility | The UI shall support current Chromium-based browsers and responsive viewport widths. |
| NFR-09 | Observability | The backend shall log HTTP requests and server errors without returning internal stack details to production clients. |

## 5. External interface requirements

### 5.1 User interface

The browser interface shall provide public pages and role-specific workspaces. Forms shall show validation or server errors. Success and workflow status shall be visible after consequential actions. The base type size is intentionally larger than a dense default dashboard so labels and supporting text remain readable.

### 5.2 API interface

The frontend shall communicate with the backend through JSON REST endpoints under `/api`. Authenticated requests shall provide `Authorization: Bearer <token>`. Socket.IO shall use the same JWT in the connection handshake for message event delivery.

### 5.3 Database interface

Prisma shall map application models to PostgreSQL. The deployment configuration shall keep the pooled Neon connection in `DATABASE_URL` and direct connection in `DIRECT_URL` for schema operations.

## 6. Core use-case descriptions

### UC-01: Client hires a freelancer

1. Client signs in and posts a project.
2. Freelancer browses the project and submits a proposal.
3. Client opens the project proposal list and compares bid, delivery estimate and cover letter.
4. Client accepts one pending proposal.
5. The system creates a contract, rejects other pending proposals and marks the project in progress in one database transaction.
6. Both participants can view the new contract and begin communication.

### UC-02: Contract delivery and review

1. Client may define milestones against the contract value.
2. Freelancer updates milestone progress and submits deliverables.
3. Freelancer submits the overall contract work.
4. Client approves the submission or requests revisions.
5. On approval, the contract and project are completed.
6. Each participant may leave one review for the other participant.

### UC-03: Administrator reviews a dispute

1. A client or freelancer reports an issue from the contract screen.
2. The system stores the dispute and notifies active administrator accounts.
3. An administrator reviews the issue in the dispute-management screen.
4. The administrator changes its status and records a resolution.

## 7. Acceptance criteria

The initial release is acceptable for demonstration when:

- Client, Freelancer and Admin sessions are separated by backend-enforced RBAC.
- A Client can post a project and a Freelancer can submit a proposal.
- A Client can accept the proposal and both parties see the generated contract.
- Contract submission, revision and approval statuses follow the permitted workflow.
- Milestones can be created and updated without exceeding the contract value.
- Messaging, notifications and reviews are persisted and visible to the intended users.
- Admin tools can manage users and handle a dispute.
- The application works at desktop and mobile viewport widths with readable text.
- The source repository includes setup instructions, environment examples, architecture notes and a test plan.

## 8. Traceability

Detailed test scenarios are maintained in [TEST_PLAN.md](TEST_PLAN.md). Architecture, entity relationships and key workflows are maintained in [ARCHITECTURE_AND_DESIGN.md](ARCHITECTURE_AND_DESIGN.md).
