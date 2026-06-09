import { IsArray, IsNotEmpty, IsObject, IsString } from 'class-validator';
import { SubscriptionPlan } from 'src/common/shared-enum';
import { LoginResponseDto } from 'src/user/dto/login.dto';

export class CreateMyOrganizationDto {
  @IsNotEmpty()
  @IsString()
  name: string;
  @IsString()
  subscription: keyof typeof SubscriptionPlan;
  @IsNotEmpty()
  @IsArray()
  @IsObject({ each: true })
  accounts: LoginResponseDto[];
}
