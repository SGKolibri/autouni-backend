import { Module } from '@nestjs/common';
import { PrismaUserRepository } from './repository/prisma-user.repository';
import { UserService } from './service/user.service';
import { UserController } from './controller/user.controller';
import { PrismaService } from 'prisma/prisma.service';

@Module({
  controllers: [UserController],
  providers: [UserService, PrismaUserRepository, PrismaService],
  exports: [UserService],
})
export class UserModule {}
