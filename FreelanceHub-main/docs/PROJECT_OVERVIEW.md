# FreelanceHub – Software Engineering Project Overview

## 1. Problem statement

Clients often struggle to discover suitable independent professionals, compare proposals and monitor delivery. Freelancers need a central place to discover projects, present their skills, submit proposals and manage client relationships. FreelanceHub provides a common workflow for project discovery, proposal evaluation, hiring, contract progress, communication and feedback.

## 2. Objectives

1. Provide separate, secure experiences for clients, freelancers and administrators.
2. Support project publishing, project discovery and proposal submission.
3. Make hiring explicit through proposal acceptance and contract creation.
4. Track work submission, revision requests and completion.
5. Maintain project communication, notifications and reviews.
6. Provide administrators with tools to oversee users, projects and disputes.
7. Demonstrate requirements engineering, modular design, database design, testing, version control and deployment.

## 3. SDLC model – Agile (Scrum-inspired)

Agile is selected because the system has multiple independently testable modules and the requirements can be refined through regular demonstrations. Work is organized into short sprints with a backlog, sprint goal, review and retrospective. Each increment should be integrated and tested before the next increment begins.

| Sprint | Goal | Deliverable |
|---|---|---|
| 1 | Requirements, project setup and identity | SRS baseline, architecture, authentication and RBAC |
| 2 | Profiles and discovery | Client/freelancer profiles, public directories |
| 3 | Marketplace workflow | Projects, search, proposals and proposal decisions |
| 4 | Delivery management | Contracts, milestones, submission, approval and revisions |
| 5 | Collaboration and reputation | Messages, notifications, reviews and ratings |
| 6 | Administration and release | Admin tools, test execution, fixes and deployment |

## 4. User classes

- **Client:** creates projects, evaluates proposals, hires freelancers, manages contracts and leaves reviews.
- **Freelancer:** maintains professional profile, discovers projects, submits proposals, delivers work and leaves reviews.
- **Administrator:** oversees users, project listings, verification and reported disputes.

## 5. Functional requirements

| ID | Requirement |
|---|---|
| FR-01 | The system shall allow a visitor to register as a Client or Freelancer. |
| FR-02 | The system shall authenticate users and maintain a signed session token. |
| FR-03 | The system shall restrict protected operations by user role and resource ownership. |
| FR-04 | A Client shall create, edit, cancel and list their own open projects. |
| FR-05 | A Freelancer shall search and filter open projects. |
| FR-06 | A Freelancer shall submit one proposal per project with a cover letter, bid and delivery estimate. |
| FR-07 | A Client shall accept or reject proposals on projects they own. |
| FR-08 | Accepting a proposal shall create a contract and move the project to in-progress atomically. |
| FR-09 | Contract participants shall view contract information and progress. |
| FR-10 | A Freelancer shall submit work; the Client may approve it or request a revision. |
| FR-11 | Contract participants shall exchange direct messages. |
| FR-12 | The system shall create and display user notifications. |
| FR-13 | Contract participants shall review each other after completion. |
| FR-14 | An Administrator shall view and manage users, projects and disputes. |
| FR-15 | A Freelancer shall maintain skills, headline, rate and portfolio link. |
| FR-16 | A Client shall maintain company details. |

## 6. Non-functional requirements

- **Security:** passwords are hashed; authenticated endpoints require JWT; role and ownership checks run server-side.
- **Usability:** clear labels, readable typography, responsive layouts, inline validation and understandable status indicators.
- **Performance:** indexed database lookups for common status and ownership filters; paginated project and directory lists.
- **Reliability:** database constraints prevent duplicate project proposals and multiple contracts for the same project.
- **Maintainability:** routes are split by domain; shared middleware and helpers avoid repeated logic.
- **Compatibility:** responsive support for current desktop and mobile browsers.
- **Availability:** deployment uses managed hosting; the free backend host may sleep when idle.

## 7. Scope and limitations

The academic release includes the main marketplace lifecycle and a simulated payment/transaction data model. It does not process real money. Password-reset email, production escrow/payment processing and file upload are future enhancements. The first release supports contract milestones, dispute submission and administrator review. The UI uses a larger base font size and generous controls to support clear visibility.

## 8. Assumptions

- Users have a working internet connection and valid email address.
- Each registration is either a Client or Freelancer; Admin accounts are provisioned through a controlled seed process.
- A project can have at most one active contract.
- Reviews are allowed only when the associated contract is completed.
- Real payment settlement is outside the first academic release.
