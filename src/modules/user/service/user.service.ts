import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaUserRepository } from '../repository/prisma-user.repository';
import { UserRole } from '../interfaces/user.interface';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { hashPassword } from 'src/utils/password.util';

@Injectable()
export class UserService {
  constructor(private userRepo: PrismaUserRepository) {}

  async create(data: CreateUserDto) {
    if (data.role === UserRole.ADMIN && !data.password) {
      throw new BadRequestException(
        'Senha é obrigatória para usuários com role ADMIN',
      );
    }

    if (typeof data.password === 'string' && data.password.length > 0) {
      data.password = await hashPassword(data.password);
    }

    const exists = await this.userRepo.findByEmail(data.email);
    if (exists) throw new BadRequestException('Email já cadastrado');

    return this.userRepo.create(data);
  }

  async findAll() {
    return this.userRepo.findAll();
  }

  async findOne(id: string) {
    const user = await this.userRepo.findById(id);
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return user;
  }

  async findByEmail(email: string) {
    return this.userRepo.findByEmail(email);
  }

  async update(id: string, data: UpdateUserDto) {
    const user = await this.userRepo.findById(id);
    if (!user) throw new NotFoundException('Usuário não encontrado');

    if (data.role === UserRole.ADMIN && !data.password && !user.password) {
      throw new BadRequestException(
        'Senha é obrigatória para usuários com role ADMIN',
      );
    }

    if (data.password) {
      data.password = await hashPassword(data.password);
    }

    return this.userRepo.update(id, data);
  }

  async remove(id: string) {
    const user = await this.userRepo.findById(id);
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return this.userRepo.delete(id);
  }

  async getAdminEmails(): Promise<string[]> {
    const admins = await this.userRepo.findAdmins();
    return admins.map((admin) => admin.email);
  }
}
