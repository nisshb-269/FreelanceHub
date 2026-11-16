# FreelanceHub – Initial Test Plan

## 1. Test levels

- **Unit testing:** validate helper functions, request validation and status-transition rules.
- **Integration testing:** verify API routes with PostgreSQL, JWT middleware and role checks.
- **System testing:** execute complete user journeys in the browser.
- **Security testing:** verify unauthorized and cross-user access is rejected.
- **Usability testing:** review readability, error feedback and mobile layouts.

## 2. Initial test cases

| ID | Scenario | Expected result |
|---|---|---|
| TC-01 | Register a Client with valid details | Account created and client dashboard session returned |
| TC-02 | Register a Freelancer with valid details | Account created with freelancer profile |
| TC-03 | Register using an existing email | API rejects duplicate email |
| TC-04 | Register with password shorter than 8 characters | API rejects weak password |
| TC-05 | Login using invalid credentials | API returns authentication error |
| TC-06 | Freelancer calls client-only project creation endpoint | API returns 403 |
| TC-07 | Client creates a project with invalid budget range | API rejects the request |
| TC-08 | Freelancer submits a valid proposal | Proposal is stored and client is notified |
| TC-09 | Freelancer submits a second proposal to same project | API rejects duplicate proposal |
| TC-10 | Client accepts proposal on their own project | Contract is created and project moves to IN_PROGRESS |
| TC-11 | Different client attempts to accept proposal | API rejects access |
| TC-12 | Freelancer submits work on active contract | Contract moves to SUBMITTED |
| TC-13 | Client approves submitted work | Contract and project become COMPLETED |
| TC-14 | User reviews a non-completed contract | API rejects review |
| TC-15 | Contract participant sends direct message | Message is stored and receiver gets notification |
| TC-16 | Non-admin opens admin endpoint | API returns 403 |
| TC-17 | Admin deactivates a user | Account can no longer authenticate |
| TC-18 | Browser opens a nested route on deployed frontend | Static host rewrites to index.html and React Router renders the route |
| TC-19 | Client adds a milestone whose amount would exceed contract value | API rejects the milestone |
| TC-20 | Freelancer saves a project and opens Saved Projects | The project appears in the saved list and can be removed |
| TC-21 | Non-client attempts to add a milestone | API returns 403 |
| TC-22 | Deactivated user attempts a Socket.IO connection | Connection is rejected |

## 3. Execution record template

Use this table during practical testing and record actual results on the test date.

| Test ID | Actual result | Pass / Fail | Evidence / remarks |
|---|---|---|---|
| TC-01 | To be executed | Pending | |
| TC-02 | To be executed | Pending | |
| TC-06 | To be executed | Pending | |
| TC-08 | To be executed | Pending | |
| TC-10 | To be executed | Pending | |
| TC-13 | To be executed | Pending | |
| TC-16 | To be executed | Pending | |
| TC-19 | To be executed | Pending | |
| TC-20 | To be executed | Pending | |

## 4. Known follow-up tests

- Test message delivery over Socket.IO and reconnection behaviour.
- Test concurrent proposal acceptance attempts for the same project.
- Test pagination and database query performance with larger seed data.
- Test malformed or oversized request bodies and rate limiting.
- Test browser accessibility with keyboard-only navigation.
