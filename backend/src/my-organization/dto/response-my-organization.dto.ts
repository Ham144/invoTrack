import { Expose, Type } from 'class-transformer';
import { LoginResponseDto } from 'src/user/dto/login.dto';

export class ResponseMyOrganizationDto {
  @Expose()
  name: string;

  @Expose()
  subscriptionId?: string;

  @Expose({ groups: ['detail'] })
  @Type(() => LoginResponseDto)
  accounts?: LoginResponseDto[];
}
