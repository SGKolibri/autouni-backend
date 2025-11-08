import { Module } from '@nestjs/common';
import { FloorsController } from './controller/floors.controller';
import { FloorsService } from './service/floors.service';
import { FloorsRepository } from './repository/floors.repository';
import { PrismaService } from 'prisma/prisma.service';

@Module({
  controllers: [FloorsController],
  providers: [FloorsService, FloorsRepository, PrismaService],
  exports: [FloorsService],
})
export class FloorsModule {}
