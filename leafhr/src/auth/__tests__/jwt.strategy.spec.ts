import { JwtStrategy } from '../jwt.strategy';
import { Role } from '../../shared/types';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(() => {
    strategy = new JwtStrategy();
  });

  it('should map JWT payload to IActor', () => {
    const payload = {
      sub: 'mgr-001',
      role: 'manager',
      locationId: 'loc-1',
      managerId: 'mgr-1',
      reportIds: ['emp-002', 'emp-003'],
    };

    const actor = strategy.validate(payload);

    expect(actor).toEqual({
      sub: 'mgr-001',
      role: Role.MANAGER,
      locationId: 'loc-1',
      managerId: 'mgr-1',
      reportIds: ['emp-002', 'emp-003'],
    });
  });

  it('should handle missing optional fields', () => {
    const payload = {
      sub: 'emp-001',
      role: 'employee',
      locationId: 'loc-1',
    };

    const actor = strategy.validate(payload);

    expect(actor.sub).toBe('emp-001');
    expect(actor.role).toBe(Role.EMPLOYEE);
    expect(actor.managerId).toBeUndefined();
    expect(actor.reportIds).toBeUndefined();
  });
});
