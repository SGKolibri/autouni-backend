import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { IUserRepository, UserRole } from '../interfaces/user.interface';
import { User } from '@prisma/client';
import { UpdateUserDto } from '../dto/update-user.dto';
import { CreateUserDto } from '../dto/create-user.dto';

@Injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateUserDto): Promise<User> {
    return this.prisma.user.create({ data });
  }

  async findAll(): Promise<User[]> {
    return this.prisma.user.findMany();
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findByCpf(cpf: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { cpf } });
  }

  async update(id: string, data: UpdateUserDto): Promise<User> {
    return this.prisma.user.update({ where: { id }, data });
  }

  async delete(id: string): Promise<User> {
    return this.prisma.user.delete({ where: { id } });
  }

  async isAdmin(id: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return user?.role === UserRole.ADMIN;
  }

  async findAdmins(): Promise<User[]> {
    return this.prisma.user.findMany({
      where: {
        role: UserRole.ADMIN,
      },
    });
  }
}
