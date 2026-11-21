import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { IUserRepository, UserRole } from '../interfaces/user.interface';
import { User } from '@prisma/client';
import { withTenant } from '../../../common/tenant/tenant-context';
import { UpdateUserDto } from '../dto/update-user.dto';
import { CreateUserDto } from '../dto/create-user.dto';

// Todas as consultas ficam restritas à organização do usuário autenticado pelo
// escopo de tenant do PrismaService; `password` nunca é devolvido.
@Injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateUserDto): Promise<User> {
    return this.prisma.user.create({ data: withTenant(data) });
  }

  async findAll(): Promise<User[]> {
    return this.prisma.user.findMany({ orderBy: { name: 'asc' } });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findFirst({ where: { email } });
  }

  async findByCpf(cpf: string): Promise<User | null> {
    return this.prisma.user.findFirst({ where: { cpf } });
  }

  async update(id: string, data: UpdateUserDto): Promise<User> {
    return this.prisma.user.update({ where: { id }, data });
  }

  async delete(id: string): Promise<User> {
    return this.prisma.user.delete({ where: { id } });
  }

  async countAdmins(): Promise<number> {
    return this.prisma.user.count({ where: { role: UserRole.ADMIN } });
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
