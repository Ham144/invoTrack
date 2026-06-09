import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLE } from './shared-enum';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles =
      this.reflector.getAllAndOverride<ROLE[]>('roles', [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    const user = context.switchToHttp().getRequest().user;

    if (!user) return false;

    if (requiredRoles.length === 0) {
      return true;
    }
    if (user.role === ROLE.SUPERTENANT) {
      return true;
    }

    return requiredRoles.includes(user.role);
  }
}
