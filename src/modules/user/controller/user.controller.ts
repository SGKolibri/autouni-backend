import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { UserService } from '../service/user.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { AuthGuard } from 'src/guards/auth.guard';

@UseGuards(AuthGuard)
@ApiBearerAuth('JWT-auth')
@ApiTags('Users')
@Controller('users')
export class UserController {
  constructor(private readonly service: UserService) {}

  @Post()
  @ApiOperation({ 
    summary: 'Cria um novo usuário',
    description: 'Cria um novo usuário no sistema com role específico'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Usuário criado com sucesso.',
    schema: {
      example: {
        id: 'uuid-user-789',
        email: 'user@example.com',
        name: 'Usuário Teste',
        cpf: '12345678900',
        role: 'TECHNICIAN',
        createdAt: '2025-01-11T10:30:00.000Z',
        updatedAt: '2025-01-11T10:30:00.000Z'
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos',
    schema: {
      example: {
        statusCode: 400,
        message: ['email must be an email', 'password is required'],
        error: 'Bad Request'
      }
    }
  })
  create(@Body() data: CreateUserDto) {
    return this.service.create(data);
  }

  @Get()
  @ApiOperation({ 
    summary: 'Lista todos os usuários',
    description: 'Retorna um array com todos os usuários cadastrados no sistema'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Array de usuários retornado.',
    schema: {
      example: [
        {
          id: 'uuid-user-123',
          email: 'admin@example.com',
          name: 'Admin User',
          cpf: '12345678900',
          role: 'ADMIN',
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-01T00:00:00.000Z'
        },
        {
          id: 'uuid-user-456',
          email: 'tech@example.com',
          name: 'Technician User',
          cpf: '98765432100',
          role: 'TECHNICIAN',
          createdAt: '2025-01-02T00:00:00.000Z',
          updatedAt: '2025-01-02T00:00:00.000Z'
        }
      ]
    }
  })
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Retorna um usuário pelo ID',
    description: 'Busca e retorna os dados de um usuário específico'
  })
  @ApiParam({ name: 'id', type: String, description: 'UUID do usuário' })
  @ApiResponse({ 
    status: 200, 
    description: 'Usuário encontrado.',
    schema: {
      example: {
        id: 'uuid-user-123',
        email: 'user@example.com',
        name: 'João Silva',
        cpf: '12345678900',
        role: 'ADMIN',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z'
      }
    }
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Usuário não encontrado.',
    schema: {
      example: {
        statusCode: 404,
        message: 'User not found',
        error: 'Not Found'
      }
    }
  })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ 
    summary: 'Atualiza um usuário pelo ID',
    description: 'Atualiza os dados de um usuário existente'
  })
  @ApiParam({ name: 'id', type: String, description: 'UUID do usuário' })
  @ApiResponse({ 
    status: 200, 
    description: 'Usuário atualizado com sucesso.',
    schema: {
      example: {
        id: 'uuid-user-123',
        email: 'joao.novo@example.com',
        name: 'João Silva Atualizado',
        cpf: '12345678900',
        role: 'ADMIN',
        updatedAt: '2025-01-11T10:35:00.000Z'
      }
    }
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Usuário não encontrado.',
    schema: {
      example: {
        statusCode: 404,
        message: 'User not found',
        error: 'Not Found'
      }
    }
  })
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ 
    summary: 'Remove um usuário pelo ID',
    description: 'Remove permanentemente um usuário do sistema'
  })
  @ApiParam({ name: 'id', type: String, description: 'UUID do usuário' })
  @ApiResponse({ 
    status: 200, 
    description: 'Usuário removido com sucesso.',
    schema: {
      example: {
        id: 'uuid-user-123',
        email: 'user@example.com',
        name: 'João Silva',
        deletedAt: '2025-01-11T10:40:00.000Z'
      }
    }
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Usuário não encontrado.',
    schema: {
      example: {
        statusCode: 404,
        message: 'User not found',
        error: 'Not Found'
      }
    }
  })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
