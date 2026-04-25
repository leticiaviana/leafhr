import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: process.env.DB_PATH ?? ':memory:',
      autoLoadEntities: true,
      synchronize: true, // Keep true for local iteration; switch to migrations in production.
      logging: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
      extra: {
        pragma: {
          journal_mode: 'WAL',
          busy_timeout: 5000,
        },
      },
    }),
  ],
})
export class DatabaseModule {}
