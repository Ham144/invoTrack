import { IsOptional, IsString } from 'class-validator';

export class UpdateAppUserDto {
  @IsString()
  username: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsString()
  mail?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  displayName?: string;
}
