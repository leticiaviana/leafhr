import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LocationEntity } from './location.entity';
import {
  DEFAULT_GRACEFUL_TIME_MINUTES,
  DEFAULT_LOCATION_ID,
} from './location.constants';

@Injectable()
export class LocationService {
  constructor(
    @InjectRepository(LocationEntity)
    private readonly locationRepo: Repository<LocationEntity>,
  ) {}

  async getGracefulTimeMinutes(locationId?: string): Promise<number> {
    const id = locationId ?? DEFAULT_LOCATION_ID;
    const location = await this.locationRepo.findOne({ where: { id } });
    return location?.gracefulTimeMinutes ?? DEFAULT_GRACEFUL_TIME_MINUTES;
  }

  async ensureDefaultLocation(): Promise<void> {
    const existing = await this.locationRepo.findOne({
      where: { id: DEFAULT_LOCATION_ID },
    });
    if (existing) {
      return;
    }

    const entity = this.locationRepo.create({
      id: DEFAULT_LOCATION_ID,
      name: 'Default Location',
      timezone: 'UTC',
      gracefulTimeMinutes: DEFAULT_GRACEFUL_TIME_MINUTES,
      isActive: true,
    });
    await this.locationRepo.save(entity);
  }
}
