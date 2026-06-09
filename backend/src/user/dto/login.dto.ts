import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { Expose } from 'class-transformer';
import { ROLE } from 'src/common/shared-enum';

export class LoginResponseDto {
  @Expose()
  description: string;

  @Expose()
  role: ROLE;

  @Expose()
  username: string;

  @Expose()
  displayName: string;

  @Expose()
  isActive?: boolean;

  @Expose()
  organizationName?: string;

  @Expose()
  mail?: string;

  @Expose()
  assignedScanner?: {
    id: string;
    label: string;
  } | null;

  @Expose({ groups: ['login'] })
  refresh_token?: string;

  @Expose({ groups: ['login'] })
  access_token?: string;
}

export class LoginRequestDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @MinLength(5)
  @IsNotEmpty()
  password: string;
}
