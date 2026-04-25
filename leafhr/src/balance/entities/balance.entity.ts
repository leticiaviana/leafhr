import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  VersionColumn,
} from 'typeorm';
import { LeaveType, BalanceSource } from '../../shared/types';
import { DEFAULT_LOCATION_ID } from '../../location/location.constants';

@Entity('balance')
@Index(['employeeId', 'locationId', 'leaveType', 'year'], { unique: true })
export class BalanceEntity {
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

  @Column({ type: 'integer' })
  year!: number;

  @Column({ type: 'real', default: 0 })
  totalEntitled!: number;

  @Column({ type: 'real', default: 0 })
  used!: number;

  @Column({ type: 'real', default: 0 })
  pending!: number;

  @Column({ type: 'varchar', default: BalanceSource.MANUAL })
  source!: BalanceSource;

  @Column({ nullable: true })
  externalId?: string;

  @VersionColumn()
  version!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  /** Computed: totalEntitled - used - pending */
  get available(): number {
    return this.totalEntitled - this.used - this.pending;
  }
}
