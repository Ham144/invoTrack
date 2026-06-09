import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateScannerConfigDto {
  @IsString()
  @IsNotEmpty()
  label: string;

  @IsString()
  @IsNotEmpty()
  workstationId: string;

  @IsString()
  @IsNotEmpty()
  cctvConfigId: string;

  @IsString()
  @IsOptional()
  assignedUsername?: string;

  @IsInt()
  @Min(1200)
  @IsOptional()
  baudRate?: number;

  @IsInt()
  @IsOptional()
  usbVendorId?: number;

  @IsInt()
  @IsOptional()
  usbProductId?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateScannerConfigDto {
  @IsString()
  @IsOptional()
  label?: string;

  @IsString()
  @IsOptional()
  workstationId?: string;

  @IsString()
  @IsOptional()
  cctvConfigId?: string;

  @IsString()
  @IsOptional()
  assignedUsername?: string | null;

  @IsInt()
  @Min(1200)
  @IsOptional()
  baudRate?: number;

  @IsInt()
  @IsOptional()
  usbVendorId?: number | null;

  @IsInt()
  @IsOptional()
  usbProductId?: number | null;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class IngestScannerDto {
  @IsString()
  @IsNotEmpty()
  scannerConfigId: string;

  @IsString()
  @IsNotEmpty()
  invoiceNumber: string;
}
