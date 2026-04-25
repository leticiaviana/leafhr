import { Role } from '../types';

export interface IActor {
  sub: string;
  email?: string;
  role: Role;
  locationId?: string;
  tenantId?: string;
  managerId?: string;
  reportIds?: string[];
}
