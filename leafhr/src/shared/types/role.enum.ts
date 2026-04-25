import { registerEnumType } from '@nestjs/graphql';

export enum Role {
  EMPLOYEE = 'employee',
  MANAGER = 'manager',
  SYSTEM = 'system',
}

registerEnumType(Role, { name: 'Role' });
