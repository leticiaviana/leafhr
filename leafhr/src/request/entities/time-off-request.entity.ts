import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  VersionColumn,
  OneToMany,
} from 'typeorm';
import { LeaveType, RequestStatus } from '../../shared/types';
import { AuditEntity } from './audit.entity';
import { DEFAULT_LOCATION_ID } from '../../location/location.constants';

@Entity('time_off_request')
@Index(['employeeId', 'locationId', 'status'])
@Index(['employeeId', 'locationId', 'startDate', 'endDate'])
export class TimeOffRequestEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  @Index()
  employeeId!: string;

  @Column({ type: 'varchar', default: DEFAULT_LOCATION_ID })
  @Index()
  locationId!: string;

  @Column({ type: 'varchar' })
  leaveType!: LeaveType;

  @Column({ type: 'date' })
  @Index()
  startDate!: string; // ISO date 'YYYY-MM-DD'

  @Column({ type: 'bigint' })
  @Index()
  startDateTimestamp!: number;

  @Column({ type: 'date' })
  @Index()
  endDate!: string; // ISO date 'YYYY-MM-DD'

  @Column({ type: 'bigint' })
  @Index()
  endDateTimestamp!: number;

  @Column({ type: 'real' })
  totalDays!: number;

  @Column({ type: 'varchar', default: RequestStatus.PENDING_MANAGER })
  status!: RequestStatus;

  @Column({ nullable: true })
  reason?: string;

  @Column({ nullable: true })
  @Index()
  managerId?: string;

  @Column({ type: 'integer' })
  year!: number;

  @Column({ type: 'datetime', nullable: true })
  archivedAt?: Date | null;

  @Column({ type: 'varchar', nullable: true, unique: true })
  @Index({ unique: true, where: '"idempotencyKey" IS NOT NULL' })
  idempotencyKey?: string | null;

  @VersionColumn()
  version!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => AuditEntity, (audit) => audit.request, {
    // Audits are persisted explicitly via RequestWriteRepository.addAudit.
    // Avoid cascading writes from request saves, which can produce invalid
    // audit inserts when partial relation objects are attached.
    cascade: false,
    eager: false,
  })
  audits?: AuditEntity[];
}
