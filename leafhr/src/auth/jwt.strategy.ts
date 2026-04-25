import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { IActor } from '../shared/interfaces';
import { Role } from '../shared/types';

interface JwtPayload {
  sub: string;
  role: string;
  locationId: string;
  managerId?: string;
  reportIds?: string[];
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? 'leafhr-dev-secret-change-in-production',
    });
  }

  validate(payload: JwtPayload): IActor {
    return {
      sub: payload.sub,
      role: payload.role as Role,
      locationId: payload.locationId,
      managerId: payload.managerId,
      reportIds: payload.reportIds,
    };
  }
}
