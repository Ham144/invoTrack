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
  @IsOptional()
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

export class AgentPurgeClipsDto {
  @IsArray()
  @IsString({ each: true })
  invoiceNumbers: string[];
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

  /** Prefer agent-reported LAN IP for clip streaming from other PCs */
  @IsString()
  @IsOptional()
  @Matches(/^\d{1,3}(\.\d{1,3}){3}$/, {
    message: 'lanIp harus IPv4',
  })
  lanIp?: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  @IsOptional()
  mediaPort?: number;
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
