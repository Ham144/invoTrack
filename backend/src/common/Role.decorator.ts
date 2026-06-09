import { SetMetadata } from '@nestjs/common';
import { ROLE } from './shared-enum';

export const Roles = (...roles: ROLE[]) => SetMetadata('roles', roles);
