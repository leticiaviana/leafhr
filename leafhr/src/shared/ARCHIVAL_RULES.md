# Persistence & Archival Guidelines

## Overview

LeafHR implements **archive-based persistence** with mandatory compliance to archival rules. No hard deletes, no soft deletes via `deletedAt`.

**References:**
- TRD.md §8.2 (HC-04): Full audit trail requirement
- TRD.md §11 (NFR-11): Archive-based persistence
- IMPLEMENTATION_CHECKLIST.md §2: Persistence Rules

---

## Core Rules

### ✅ DO: Archive via `archivedAt`
Set `archivedAt` to a timestamp when marking records as inactive.

```typescript
// Example: Cancel a request
await requestWriteRepo.cancelRequest(requestId, RequestStatus.CANCELLED);
// → Updates: status = CANCELLED, archivedAt = NOW()
```

### ❌ DON'T: Hard Delete
Never use `DELETE FROM`.

### ❌ DON'T: Soft Delete via `deletedAt`
Never add a `deletedAt` column. Use `archivedAt` instead.

---

## Entity Structure

All domain entities should extend `BaseEntity`:

```typescript
import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../shared/base';

@Entity('my_table')
export class MyEntity extends BaseEntity {
  @Column()
  name!: string;

  // Inherited from BaseEntity:
  // - id: uuid (primary key)
  // - createdAt: datetime (auto-set on insert)
  // - updatedAt: datetime (auto-set on insert & update)
  // - archivedAt: datetime | null (nullable, set on archive)
}
```

---

## Repository Pattern

### BaseWriteRepository Methods

**`archiveById(id, additionalUpdates?)`**
- Generic archival method for any entity
- Sets `archivedAt = NOW()` + optional extra fields
- Compliance: NFR-11

```typescript
await this.archiveById(id, { status: 'ARCHIVED' });
// → Updates: archivedAt = NOW(), status = 'ARCHIVED'
```

### Domain-Specific Methods

**`RequestWriteRepository.cancelRequest(id, newStatus)`**
- Archives a request and updates status atomically
- Compliance: FR-R10

```typescript
await requestWriteRepo.cancelRequest(requestId, RequestStatus.CANCELLED);
```

**`RequestWriteRepository.archiveRequest(id)`**
- Archives without changing status
- Use for administrative archival

```typescript
await requestWriteRepo.archiveRequest(requestId);
```

---

## Query Filtering

### Automatic Archival Filter

All read queries MUST exclude archived records by default (`archivedAt IS NULL`).

**RequestReadRepository examples:**

```typescript
// ✅ Correctly filters archived
async findByEmployee(employeeId: string) {
  return this.repo
    .createQueryBuilder('r')
    .where('r.employeeId = :employeeId', { employeeId })
    .andWhere('r.archivedAt IS NULL')  // ← Mandatory filter
    .getMany();
}

// ✅ Using TypeORM find() with IsNull()
async findPendingForManager(managerId: string) {
  return this.repo.find({
    where: { managerId, status: PENDING_MANAGER, archivedAt: IsNull() },
  });
}
```

### Optional: Include Archived Records

Use utility function with `includeArchived = true` if needed:

```typescript
import { filterArchived } from '../utils/persistence.util';

async findAllIncludingArchived(employeeId: string) {
  let qb = this.repo.createQueryBuilder('r')
    .where('r.employeeId = :employeeId', { employeeId });
  
  // Don't filter archived
  qb = filterArchived(qb, 'r', true); // includeArchived = true
  
  return qb.getMany();
}
```

---

## Audit Trail

Every state change must be tracked:

1. **Create**: `createdAt` auto-set by TypeORM
2. **Update**: `updatedAt` auto-set by TypeORM
3. **Cancel/Archive**: `archivedAt` manually set + status change

**Example flow:**

```typescript
// 1. Employee submits request
request = await createRequest({ status: PENDING_MANAGER, ... });
// → createdAt = NOW(), updatedAt = NOW(), archivedAt = null

// 2. Manager approves
request.status = APPROVED;
request = await saveRequest(request);
// → updatedAt = NOW() (auto), archivedAt = null

// 3. Employee cancels
await cancelRequest(request.id, CANCELLED);
// → status = CANCELLED, updatedAt = NOW(), archivedAt = NOW()
```

---

## Persistence Utilities

**File:** `shared/utils/persistence.util.ts`

```typescript
import {
  filterArchived,
  buildFindWhereClause,
  getArchiveTimestamp,
  isArchived,
} from '../utils/persistence.util';

// Filter query builder
const qb = filterArchived(queryBuilder, 'alias', false);

// Build find conditions
const where = buildFindWhereClause({ employeeId }, false);

// Get archive timestamp
const now = getArchiveTimestamp();

// Check if archived
if (isArchived(record)) {
  console.log('Record is archived');
}
```

---

## Testing

**Spec file:** `src/request/__tests__/persistence-archival.spec.ts`

Coverage areas:
- ✅ No hard delete operations exist
- ✅ No `deletedAt` column
- ✅ Archival sets `archivedAt` + status (on cancel)
- ✅ Archive method exists and works
- ✅ Read queries exclude archived by default
- ✅ Audit fields present on all entities

**Run tests:**
```bash
npm run test -- persistence-archival.spec.ts
```

---

## Common Checklist

- [ ] Entity extends `BaseEntity`
- [ ] Write repository has `archiveXxx()` method if domain-specific
- [ ] All read queries include `archivedAt IS NULL` filter
- [ ] No `.delete()` or `.remove()` calls in code
- [ ] No `deletedAt` column in any entity
- [ ] Tests verify archival behavior
- [ ] Cancellation updates both status and `archivedAt`

---

## Q&A

**Q: Can I delete an archived record?**
A: No. Archived records MUST remain in the database for compliance (HC-04, NFR-11).

**Q: What if I need to filter by archived records?**
A: Use `includeArchived = true` parameter in utility functions or add `.where('r.archivedAt IS NOT NULL')` manually.

**Q: What timestamp format should archivedAt use?**
A: `datetime` (SQLite native), stored as UTC. TypeORM auto-serializes to ISO8601 when querying.

**Q: Can status and archivedAt be null?**
A: No. Status is required. `archivedAt` is nullable (null = active, not null = archived).
