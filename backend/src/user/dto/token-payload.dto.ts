import { ROLE } from 'src/common/shared-enum';

export interface TokenPayload {
  username: string;
  role: ROLE;
  organizationName: string;
  jti?: string;
}
