import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  DEFAULT_GRACEFUL_TIME_MINUTES,
  DEFAULT_LOCATION_ID,
} from './location.constants';

@Entity('location')
export class LocationEntity {
  @PrimaryColumn({ type: 'varchar', default: DEFAULT_LOCATION_ID })
  id!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'varchar', default: 'UTC' })
  timezone!: string;

  @Column({ type: 'integer', default: DEFAULT_GRACEFUL_TIME_MINUTES })
  gracefulTimeMinutes!: number;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
