import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

const ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class AgentPairDto {
  @IsString()
  @IsNotEmpty()
  @Matches(ID_PATTERN, { message: 'workstationId harus format UUID' })
  workstationId: string;

  @IsString()
  @IsNotEmpty()
  pairingCode: string;
}

export class AgentIngestDto {
  @IsString()
  @IsNotEmpty()
  @Matches(ID_PATTERN, { message: 'scannerConfigId harus format UUID' })
  scannerConfigId: string;

  @IsString()
  @IsNotEmpty()
  invoiceNumber: string;
}

export class AgentCompleteDto {
  @IsString()
  @IsNotEmpty()
  localClipPath: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  durationSec?: number;
}

export class AgentReconcileClipDto {
  @IsString()
  @IsNotEmpty()
  invoiceNumber: string;

  @IsString()
  @IsNotEmpty()
  localClipPath: string;

  @IsInt()
  @Min(0)
  sizeBytes: number;
}

export class AgentReconcileClipsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AgentReconcileClipDto)
  clips: AgentReconcileClipDto[];
}

export class AgentPairUsbDto {
  @IsInt()
  @Min(0)
  usbVendorId: number;

  @IsInt()
  @Min(0)
  usbProductId: number;

  @IsString()
  @IsNotEmpty()
  serialPortPath: string;
}

export class AgentHeartbeatDto {
  @IsString()
  @IsOptional()
  agentVersion?: string;

  @IsString()
  @IsOptional()
  clipsDir?: string;

  @IsOptional()
  diskFreeBytes?: number;

  @IsOptional()
  isRecording?: boolean;
}

export class UpdateAgentSettingsDto {
  @IsBoolean()
  @IsOptional()
  ttsEnabled?: boolean;

  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  ttsVolume?: number;

  @IsString()
  @IsOptional()
  clipsDir?: string;

  @IsString()
  @IsOptional()
  clipsDirSecondary?: string;

  @IsInt()
  @Min(0)
  @Max(365)
  @IsOptional()
  clipRetentionDays?: number;
}
