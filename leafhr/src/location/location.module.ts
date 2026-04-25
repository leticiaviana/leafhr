import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LocationEntity } from './location.entity';
import { LocationService } from './location.service';

@Module({
  imports: [TypeOrmModule.forFeature([LocationEntity])],
  providers: [LocationService],
  exports: [LocationService],
})
export class LocationModule implements OnModuleInit {
  constructor(private readonly locationService: LocationService) {}

  async onModuleInit(): Promise<void> {
    await this.locationService.ensureDefaultLocation();
  }
}
