import {
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Column,
} from 'typeorm';

/**
 * Base entity with common audit fields.
 * All domain entities should extend this class to ensure consistent audit trails.
 * Complies with:
 * - HC-04: Audit trail requirement (createdAt, updatedAt, archivedAt)
 * - NFR-11: Archive-based persistence (never hard delete, no soft delete via deletedAt)
 */
export abstract class BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt!: Date;

  @Column({ type: 'datetime', nullable: true })
  archivedAt?: Date | null;
}
