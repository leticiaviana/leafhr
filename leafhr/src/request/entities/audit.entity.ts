import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { RequestStatus } from '../../shared/types';
import { TimeOffRequestEntity } from './time-off-request.entity';

@Entity('request_audit')
@Index(['requestId'])
export class AuditEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  requestId!: string;

  @Column({ type: 'varchar' })
  fromStatus!: RequestStatus;

  @Column({ type: 'varchar' })
  toStatus!: RequestStatus;

  @Column()
  actorId!: string;

  @Column()
  actorRole!: string;

  @Column({ nullable: true })
  comment?: string;

  @CreateDateColumn()
  timestamp!: Date;

  @ManyToOne(() => TimeOffRequestEntity, (r) => r.audits, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'requestId' })
  request!: TimeOffRequestEntity;
}
