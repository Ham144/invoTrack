import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { RedisService } from 'src/redis/redis.service';
import { AuthService } from './auth.service';
import { UserService } from './user.service';

@Module({
  controllers: [UserController],
  providers: [UserService, RedisService, AuthService],
})
export class UserModule {}
