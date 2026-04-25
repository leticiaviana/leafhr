import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { RolesGuard } from '../roles.guard';
import { Role } from '../../shared/types';
import { ForbiddenError } from '../../shared/exceptions';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    // No UserService — JWT fallback mode
    guard = new RolesGuard(reflector, undefined);
  });

  function createMockContext(user?: { sub?: string; role?: Role; locationId?: string }): ExecutionContext {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      getType: jest.fn().mockReturnValue('graphql'),
      getArgs: jest.fn().mockReturnValue([{}, {}, { req: { user } }, {}]),
      getArgByIndex: jest.fn(),
      switchToHttp: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
    } as any;
  }

  it('should allow access when no roles are required', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const ctx = createMockContext({ role: Role.EMPLOYEE });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('should allow access when user has required role (JWT fallback)', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.MANAGER]);
    const ctx = createMockContext({ role: Role.MANAGER });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('should throw ForbiddenError when user lacks required role', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.MANAGER]);
    const ctx = createMockContext({ role: Role.EMPLOYEE });
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenError);
  });

  it('should throw ForbiddenError when no user present', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.MANAGER]);
    const ctx = createMockContext(undefined);
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenError);
  });

  describe('with UserService (DB-based roles)', () => {
    const mockUserService = {
      hasAnyRole: jest.fn(),
    };

    beforeEach(() => {
      jest.clearAllMocks();
      guard = new RolesGuard(reflector, mockUserService as any);
    });

    it('should allow access when user has role in database', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.MANAGER]);
      mockUserService.hasAnyRole.mockResolvedValue(true);

      const ctx = createMockContext({
        sub: 'u-1',
        role: Role.EMPLOYEE,
        locationId: 'loc-1',
      });

      await expect(guard.canActivate(ctx)).resolves.toBe(true);
      expect(mockUserService.hasAnyRole).toHaveBeenCalledWith(
        'u-1',
        [Role.MANAGER],
        'loc-1',
      );
    });

    it('should fall back to JWT role when DB check returns false', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.EMPLOYEE]);
      mockUserService.hasAnyRole.mockResolvedValue(false);

      const ctx = createMockContext({
        sub: 'u-1',
        role: Role.EMPLOYEE,
        locationId: 'loc-1',
      });

      // JWT role matches, so still allowed
      await expect(guard.canActivate(ctx)).resolves.toBe(true);
    });
  });
});

