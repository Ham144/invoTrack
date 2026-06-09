import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class IngestInvoiceDto {
  @IsNotEmpty()
  @IsString()
  invoiceNumber: string;
}
