import { applyDecorators, UseGuards } from '@nestjs/common';
import { Roles } from './Role.decorator';
import { RolesGuard } from './Role.guard';
import { ROLE } from './shared-enum';

export type RoleValue = `${ROLE}`;

export function Authorization(...roles: RoleValue[]) {
  return applyDecorators(Roles(...(roles as ROLE[])), UseGuards(RolesGuard));
}
