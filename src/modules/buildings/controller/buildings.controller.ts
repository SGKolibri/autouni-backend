import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { BuildingsService } from '../service/buildings.service';
import { CreateBuildingDto } from '../dto/create-building.dto';
import { UpdateBuildingDto } from '../dto/update-building.dto';
import { AuthGuard } from '../../../guards/auth.guard';

@ApiTags('Buildings')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard)
@Controller('buildings')
export class BuildingsController {
  constructor(private readonly buildingsService: BuildingsService) {}

  @Post()
  @ApiOperation({ 
    summary: 'Criar novo prédio',
    description: 'Cria um novo prédio no sistema de gerenciamento'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Prédio criado com sucesso',
    schema: {
      example: {
        id: 'uuid-building-123',
        name: 'Prédio Central',
        description: 'Prédio administrativo principal',
        location: 'Campus Central',
        totalEnergy: 0,
        activeDevices: 0,
        createdAt: '2025-01-11T10:00:00.000Z',
        updatedAt: '2025-01-11T10:00:00.000Z'
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Dados inválidos',
    schema: {
      example: {
        statusCode: 400,
        message: ['name should not be empty'],
        error: 'Bad Request'
      }
    }
  })
  async create(@Body() createBuildingDto: CreateBuildingDto) {
    return this.buildingsService.create(createBuildingDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos os prédios' })
  @ApiResponse({ status: 200, description: 'Lista de prédios retornada' })
  async findAll() {
    return this.buildingsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar prédio por ID' })
  @ApiParam({ name: 'id', description: 'ID do prédio' })
  @ApiResponse({ status: 200, description: 'Prédio encontrado' })
  @ApiResponse({ status: 404, description: 'Prédio não encontrado' })
  async findById(@Param('id') id: string) {
    return this.buildingsService.findById(id);
  }

  @Get(':id/details')
  @ApiOperation({ summary: 'Buscar prédio com andares e salas' })
  @ApiParam({ name: 'id', description: 'ID do prédio' })
  @ApiResponse({
    status: 200,
    description: 'Prédio com relações encontrado',
  })
  @ApiResponse({ status: 404, description: 'Prédio não encontrado' })
  async findByIdWithRelations(@Param('id') id: string) {
    return this.buildingsService.findByIdWithRelations(id);
  }

  @Get(':id/stats')
  @ApiOperation({ 
    summary: 'Obter estatísticas do prédio',
    description: 'Retorna estatísticas agregadas incluindo total de andares, salas, dispositivos e energia'
  })
  @ApiParam({ name: 'id', description: 'ID do prédio' })
  @ApiResponse({ 
    status: 200, 
    description: 'Estatísticas retornadas',
    schema: {
      example: {
        totalFloors: 5,
        totalRooms: 50,
        totalDevices: 150,
        totalEnergy: 5000.50,
        activeDevices: 120
      }
    }
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Prédio não encontrado',
    schema: {
      example: {
        statusCode: 404,
        message: 'Building not found',
        error: 'Not Found'
      }
    }
  })
  async getStats(@Param('id') id: string) {
    return this.buildingsService.getStats(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar prédio' })
  @ApiParam({ name: 'id', description: 'ID do prédio' })
  @ApiResponse({ status: 200, description: 'Prédio atualizado com sucesso' })
  @ApiResponse({ status: 404, description: 'Prédio não encontrado' })
  async update(
    @Param('id') id: string,
    @Body() updateBuildingDto: UpdateBuildingDto,
  ) {
    return this.buildingsService.update(id, updateBuildingDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deletar prédio' })
  @ApiParam({ name: 'id', description: 'ID do prédio' })
  @ApiResponse({ status: 200, description: 'Prédio deletado com sucesso' })
  @ApiResponse({ status: 404, description: 'Prédio não encontrado' })
  async delete(@Param('id') id: string) {
    return this.buildingsService.delete(id);
  }
}
