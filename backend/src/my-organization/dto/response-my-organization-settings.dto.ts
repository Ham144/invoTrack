import { Expose } from 'class-transformer';

export class ResponseMyOrganizationSettingsDto {
  @Expose()
  name: string;
  @Expose()
  recordingMaxDurationSec: number;
}
