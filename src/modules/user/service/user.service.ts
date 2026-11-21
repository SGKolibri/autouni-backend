import {
  Injectable,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaUserRepository } from '../repository/prisma-user.repository';
import { UserRole } from '../interfaces/user.interface';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { hashPassword } from 'src/utils/password.util';

export interface UserActor {
  sub: string;
  role: UserRole | string;
}

const MANAGER_ROLES: string[] = [UserRole.ADMIN, UserRole.COORDINATOR];

@Injectable()
export class UserService {
  constructor(private userRepo: PrismaUserRepository) {}

  async create(data: CreateUserDto) {
    const exists = await this.userRepo.findByEmail(data.email);
    if (exists) throw new ConflictException('Email já cadastrado');

    if (data.cpf && (await this.userRepo.findByCpf(data.cpf))) {
      throw new ConflictException('CPF já cadastrado');
    }

    data.password = await hashPassword(data.password);
    return this.userRepo.create(data);
  }

  async findAll() {
    return this.userRepo.findAll();
  }

  async findOne(id: string, actor?: UserActor) {
    if (actor && actor.sub !== id && !MANAGER_ROLES.includes(actor.role)) {
      throw new ForbiddenException('Você só pode ver o próprio perfil');
    }
    const user = await this.userRepo.findById(id);
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return user;
  }

  async findByEmail(email: string) {
    return this.userRepo.findByEmail(email);
  }

  async update(id: string, data: UpdateUserDto, actor?: UserActor) {
    const isAdmin = actor?.role === UserRole.ADMIN;
    if (actor && !isAdmin) {
      if (actor.sub !== id) {
        throw new ForbiddenException('Você só pode alterar o próprio perfil');
      }
      if (data.role !== undefined) {
        throw new ForbiddenException('Somente ADMIN altera papéis');
      }
    }

    const user = await this.userRepo.findById(id);
    if (!user) throw new NotFoundException('Usuário não encontrado');

    if (user.role === UserRole.ADMIN && data.role && data.role !== UserRole.ADMIN) {
      await this.assertNotLastAdmin();
    }

    if (data.email && data.email !== user.email) {
      const taken = await this.userRepo.findByEmail(data.email);
      if (taken) throw new ConflictException('Email já cadastrado');
    }

    if (data.password) {
      data.password = await hashPassword(data.password);
    }

    return this.userRepo.update(id, data);
  }

  async remove(id: string) {
    const user = await this.userRepo.findById(id);
    if (!user) throw new NotFoundException('Usuário não encontrado');
    if (user.role === UserRole.ADMIN) await this.assertNotLastAdmin();
    return this.userRepo.delete(id);
  }

  async getAdminEmails(): Promise<string[]> {
    const admins = await this.userRepo.findAdmins();
    return admins.map((admin) => admin.email);
  }

  // Uma organização sem ADMIN não consegue mais cadastrar nem promover ninguém.
  private async assertNotLastAdmin() {
    if ((await this.userRepo.countAdmins()) <= 1) {
      throw new BadRequestException('A organização precisa de pelo menos um ADMIN');
    }
  }
}
