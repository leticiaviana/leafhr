# LeafHR - Time-Off Microservice

LeafHR is a NestJS + GraphQL service that manages employee time-off lifecycle and keeps leave balances aligned with an external Human Capital Management (HCM) system.

Built with **NestJS 11**, **GraphQL (Apollo)**, **TypeORM**, and **SQLite**.

Repository: https://github.com/leticiaviana/leafhr

---

## Quick Start

```bash
# 1) Install dependencies
npm install

# 2) Start API (watch mode)
npm run start:dev

# 3) Open Apollo Sandbox
#    http://localhost:3000/graphql
```

No `.env` file is required for local development. Defaults are production-safe for local testing.

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | API HTTP port |
| `JWT_SECRET` | `leafhr-dev-secret-change-in-production` | JWT HMAC secret (HS256) |
| `DB_PATH` | `:memory:` | SQLite DB path |
| `HCM_BASE_URL` | `http://localhost:4001` | HCM base URL |
| `HCM_API_KEY` | *(empty)* | Optional API key sent to HCM |
| `HCM_TIMEOUT_MS` | `5000` | HCM timeout in milliseconds |
| `SYNC_CRON_EXPRESSION` | `0 */6 * * *` | Batch sync schedule |
| `NODE_ENV` | *(unset)* | Use `development` for query logging |
| `MOCK_HCM_AUTO_SEED` | `true` | Auto-seed balances in standalone mock |
| `MOCK_HCM_SEED_YEAR` | `2026` | Seed year used by standalone mock |

---

## Standalone Mock HCM

Run mock HCM server:

```bash
npx ts-node test/e2e/hcm-mock-server/src/main.ts
```

Disable auto-seed:

```bash
MOCK_HCM_AUTO_SEED=false npx ts-node test/e2e/hcm-mock-server/src/main.ts
```

Default seeded balances:

- `emp-001 / loc-HQ / pto = 20`
- `emp-001 / loc-HQ / vacation = 15`
- `emp-001 / loc-HQ / sick = 10`
- `emp-002 / loc-HQ / pto = 20`
- `emp-999 / loc-BR / pto = 18`

---

## Authentication (JWT)

All GraphQL operations require `Authorization: Bearer <token>`.

JWT settings:

- Algorithm: `HS256`
- Secret: `leafhr-dev-secret-change-in-production`

Header example in Apollo Sandbox:

```json
{ "Authorization": "Bearer <TOKEN>" }
```

### Test actor payloads

Employee (`emp-001`):

```json
{
  "sub": "emp-001",
  "role": "employee",
  "locationId": "loc-HQ",
  "managerId": "mgr-001",
  "iat": 1745500000,
  "exp": 1893456000
}
```

Manager (`mgr-001`):

```json
{
  "sub": "mgr-001",
  "role": "manager",
  "locationId": "loc-HQ",
  "reportIds": ["emp-001", "emp-002"],
  "iat": 1745500000,
  "exp": 1893456000
}
```

Out-of-scope manager (`mgr-002`):

```json
{
  "sub": "mgr-002",
  "role": "manager",
  "locationId": "loc-HQ",
  "reportIds": ["emp-050"],
  "iat": 1745500000,
  "exp": 1893456000
}
```

Cross-location employee (`emp-999`):

```json
{
  "sub": "emp-999",
  "role": "employee",
  "locationId": "loc-BR",
  "managerId": "mgr-999",
  "iat": 1745500000,
  "exp": 1893456000
}
```

---

## GraphQL API Overview

### Queries

- `myBalances(year: Int!): [BalanceType!]!`
- `employeeBalances(employeeId: String!, year: Int!, locationId: String): [BalanceType!]!`
- `myRequests(year: Int): [TimeOffRequestType!]!`
- `request(id: String!): TimeOffRequestType!`
- `pendingManagerApprovals: [TimeOffRequestType!]!`

### Mutations

- `submitRequest(input: SubmitRequestInput!): TimeOffRequestType!`
- `transitionRequest(input: TransitionInput!): TimeOffRequestType!`


---

## Playground Testing Guide


### 1) Employee reads own balance

```graphql
query MyBalances($year: Int!) {
  myBalances(year: $year) {
    id
    employeeId
    leaveType
    totalEntitled
    used
    pending
    available
    source
  }
}
```

Variables:

```json
{ "year": 2026 }
```

Expected:

- returns balances for actor scope
- source commonly `HCM_SYNC` or `HCM_REALTIME`

### 2) Employee submits request

```graphql
mutation Submit($input: SubmitRequestInput!) {
  submitRequest(input: $input) {
    id
    employeeId
    locationId
    leaveType
    startDate
    endDate
    totalDays
    status
    year
    audits { fromStatus toStatus actorId actorRole comment timestamp }
  }
}
```

Variables:

```json
{
  "input": {
    "locationId": "loc-HQ",
    "leaveType": "PTO",
    "startDate": "2026-06-01",
    "endDate": "2026-06-05",
    "reason": "Summer vacation"
  }
}
```

Expected: `PENDING_MANAGER` with initial audit entry.

### 3) Manager approves

```graphql
mutation Approve($input: TransitionInput!) {
  transitionRequest(input: $input) {
    id
    status
    audits { fromStatus toStatus actorRole comment timestamp }
  }
}
```

Variables:

```json
{
  "input": {
    "requestId": "<REQUEST_ID>",
    "toStatus": "PENDING_HCM_CONFIRMATION",
    "comment": "Approved by manager"
  }
}
```

Expected:

- `APPROVED` if HCM accepts
- `BALANCE_ERROR` if HCM rejects/fails

### 4) Employee or manager cancels

```graphql
mutation Cancel($input: TransitionInput!) {
  transitionRequest(input: $input) {
    id
    status
    archivedAt
  }
}
```

Variables:

```json
{
  "input": {
    "requestId": "<REQUEST_ID>",
    "toStatus": "CANCELLED",
    "comment": "Cancelled"
  }
}
```

Expected: `status = CANCELLED` and `archivedAt` is non-null.

### 5) Request visibility and archives

- `myRequests(year)` excludes archived (`archivedAt IS NULL` only)
- `pendingManagerApprovals` excludes archived
- `request(id)` can still show archived entries if actor has scope access

Inspect by ID:

```graphql
query One($id: String!) {
  request(id: $id) {
    id
    status
    archivedAt
    audits {
      fromStatus
      toStatus
      actorRole
      comment
      timestamp
    }
  }
}
```

### 6) Security and validation checks

Recommended checks:

- missing/invalid/expired token -> `UNAUTHORIZED`
- employee tries manager-only transition -> `NOT_AUTHORIZED_TRANSITION`
- manager out of scope -> `FORBIDDEN`
- cross-location submit -> `FORBIDDEN`
- overlapping active requests -> overlap conflict
- invalid date range (`endDate < startDate`) -> `DATE_RANGE`
- invalid state jump (for example manager `PENDING_MANAGER -> APPROVED`) -> `INVALID_TRANSITION`

### 7) Resubmit after balance issue

If status is `BALANCE_ERROR` or `BALANCE_STALE`, employee can move it back to `PENDING_MANAGER`.

```graphql
mutation Resubmit($input: TransitionInput!) {
  transitionRequest(input: $input) {
    id
    status
    audits { fromStatus toStatus actorRole comment timestamp }
  }
}
```

Variables:

```json
{
  "input": {
    "requestId": "<REQUEST_ID>",
    "toStatus": "PENDING_MANAGER",
    "comment": "Retry after compensation"
  }
}
```

---

## Enum Reference

| Enum | Values |
|---|---|
| `RequestStatus` | `PENDING_MANAGER`, `PENDING_HCM_CONFIRMATION`, `APPROVED`, `REJECTED`, `CANCELLED`, `BALANCE_STALE`, `BALANCE_ERROR` |
| `BalanceSource` | `HCM_REALTIME`, `HCM_SYNC`, `LOCAL_CACHE`, `MANUAL`, `MANUAL_ADJUSTMENT` |
| `Role` | `EMPLOYEE`, `MANAGER`, `SYSTEM` (internal) |

---

## Running Tests

```bash
# unit tests
npm test

# watch mode
npm run test:watch

# coverage
npm run test:cov
```

Coverage report:

- `coverage/lcov-report/index.html`

### Current test suites

| Suite | File | Focus |
|---|---|---|
| Request Service | `src/request/__tests__/request.service.spec.ts` | Submit, manager approval auto-confirmation, balance side-effects |
| State Machine | `src/request/__tests__/state-machine.spec.ts` | Allowed transitions and role checks |
| Persistence Archival | `src/request/__tests__/persistence-archival.spec.ts` | Archive behavior and invariants |
| JWT Strategy | `src/auth/__tests__/jwt.strategy.spec.ts` | JWT payload mapping to actor |
| Roles Guard | `src/auth/__tests__/roles.guard.spec.ts` | RBAC enforcement |
| User Service | `src/user/__tests__/user.service.spec.ts` | User/role checks |
| HCM Client | `src/hcm/__tests__/hcm.client.spec.ts` | Real-time and batch HCM calls |
| Sync Service | `src/sync/__tests__/sync.service.spec.ts` | Batch sync and stale marking |
| Base Error | `src/shared/exceptions/__tests__/base.error.spec.ts` | Error codes and inheritance |
| GraphQL Filter | `src/shared/filters/__tests__/graphql-exception.filter.spec.ts` | Error mapping to GraphQL |
| Date Util | `src/shared/utils/__tests__/date.util.spec.ts` | Business-day and UTC parsing |
| UUID Util | `src/shared/utils/__tests__/uuid.util.spec.ts` | UUID generation |

---

## Project Structure

```text
src/
|- auth/            # JWT strategy, guards, decorators
|- balance/         # Balance entity, services, resolver, DTOs
|- database/        # TypeORM + SQLite configuration
|- hcm/             # HCM client (real-time + batch)
|- request/         # Time-off lifecycle (entity, service, state machine)
|- shared/          # Enums, errors, filters, interfaces, utils
|- sync/            # Cron-based HCM synchronization
|- user/            # User and role model
|- app.module.ts
`- main.ts
```

---

## Build for Production

```bash
npm run build
npm run start:prod
```

---

## License

UNLICENSED - Internal take-home exercise for ExampleHR.
