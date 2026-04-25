import { SelectQueryBuilder, FindOptionsWhere, ObjectLiteral } from 'typeorm';

/**
 * Utility functions for persistence queries.
 * Ensures automatic filtering of archived records and compliance with archival policy.
 * Complies with:
 * - NFR-11: Queries default ignore archivedAt IS NOT NULL
 * - Topic 2: Persistence & Archival Rules
 */

/**
 * Add archive filter to query (exclude archived records).
 * Use this in all read repository methods to automatically filter archived records.
 *
 * @param qb QueryBuilder instance
 * @param alias Entity alias in the query
 * @param includeArchived If true, don't apply filter (optional, default: false)
 * @returns Modified QueryBuilder
 */
export function filterArchived<T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  alias: string,
  includeArchived?: boolean,
): SelectQueryBuilder<T> {
  if (!includeArchived) {
    qb.andWhere(`${alias}.archivedAt IS NULL`);
  }
  return qb;
}

/**
 * Build FindOptionsWhere condition excluding archived records.
 * Use this with simple find() operations in TypeORM.
 *
 * @param where Base where condition
 * @param includeArchived If true, don't apply filter (optional, default: false)
 * @returns Combined where condition
 */
export function buildFindWhereClause<T extends ObjectLiteral>(
  where: FindOptionsWhere<T>,
  includeArchived?: boolean,
): FindOptionsWhere<T> {
  if (includeArchived) {
    return where;
  }

  return {
    ...where,
    archivedAt: null, // TypeORM treats null as IS NULL
  } as FindOptionsWhere<T>;
}

/**
 * Archive timestamp for immediate archival.
 * Use this when setting archivedAt in updates.
 *
 * @returns Current date/time in UTC
 */
export function getArchiveTimestamp(): Date {
  return new Date();
}

/**
 * Check if a record is archived.
 *
 * @param record Entity with optional archivedAt field
 * @returns true if archived, false otherwise
 */
export function isArchived(record: { archivedAt?: Date | null }): boolean {
  return record.archivedAt != null;
}
