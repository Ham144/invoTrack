import { PartialType } from '@nestjs/mapped-types';
import { CreateCctvConfigDto } from './create-cctv-config.dto';

export class UpdateCctvConfigDto extends PartialType(CreateCctvConfigDto) {}
