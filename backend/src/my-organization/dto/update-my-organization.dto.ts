import { PartialType } from '@nestjs/mapped-types';
import { CreateMyOrganizationDto } from './create-my-organization.dto';
import { IsArray, IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateMyOrganizationDto extends PartialType(
  CreateMyOrganizationDto,
) {
  @IsString({ each: true })
  @IsArray()
  @IsOptional()
  disabledFeatures?: string[];
  @IsBoolean()
  @IsOptional()
  isConfirmBookRequired?: boolean;
  /** 0 = tanpa batas waktu, hanya auto-cut scan berikutnya */
  @IsInt()
  @Min(0)
  @IsOptional()
  recordingMaxDurationSec?: number;
}
