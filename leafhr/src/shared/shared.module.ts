import { Module, Global } from '@nestjs/common';
import { ScopeValidationService } from './services';

@Global()
@Module({
  providers: [ScopeValidationService],
  exports: [ScopeValidationService],
})
export class SharedModule {}
