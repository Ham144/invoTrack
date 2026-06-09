import { Module } from '@nestjs/common';
import { MyOrganizationService } from './my-organization.service';
import { MyOrganizationController } from './my-organization.controller';
import { AuthService } from 'src/user/auth.service';
import { PrismaService } from 'src/common/prisma.service';
import { RedisService } from 'src/redis/redis.service';

@Module({
  controllers: [MyOrganizationController],
  providers: [MyOrganizationService, AuthService, PrismaService, RedisService],
})
export class MyOrganizationModule {}
