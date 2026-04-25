import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { ScheduleModule } from '@nestjs/schedule';
import { join } from 'path';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth';
import { BalanceModule } from './balance';
import { RequestModule } from './request';
import { HcmModule } from './hcm';
import { SyncModule } from './sync';
import { UserModule } from './user';
import { LocationModule } from './location';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  controllers: [AppController],
  providers: [AppService],
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'schema.gql'),
      playground: true,
      introspection: true,
      context: ({ req }: { req: unknown }) => ({ req }),
    }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    AuthModule,
    BalanceModule,
    RequestModule,
    HcmModule,
    SyncModule,
    UserModule,
    LocationModule,
  ],
})
export class AppModule {}

