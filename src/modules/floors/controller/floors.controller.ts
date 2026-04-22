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
import { FloorsService } from '../service/floors.service';
import { CreateFloorDto } from '../dto/create-floor.dto';
import { UpdateFloorDto } from '../dto/update-floor.dto';
import { AuthGuard } from '../../../guards/auth.guard';

const FLOOR_EXAMPLE = {
  id: 'uuid-floor-1',
  buildingId: 'uuid-building-1',
  number: 1,
  name: 'Térreo',
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
};

const FLOOR_DETAILS_EXAMPLE = {
  ...FLOOR_EXAMPLE,
  rooms: [
    {
      id: 'uuid-room-1',
      name: 'Laboratório 101',
      type: 'LAB',
      devices: [{ id: 'uuid-device-1', name: 'Ar Condicionado', type: 'AC', status: 'ON' }],
    },
  ],
};

const NOT_FOUND_EXAMPLE = {
  statusCode: 404,
  message: 'Floor with ID uuid-floor-1 not found',
  error: 'Not Found',
};

const BAD_REQUEST_EXAMPLE = {
  statusCode: 400,
  message: ['number must not be less than 0'],
  error: 'Bad Request',
};

@ApiTags('Floors')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard)
@Controller('floors')
export class FloorsController {
  constructor(private readonly floorsService: FloorsService) {}

  @Post()
  @ApiOperation({ summary: 'Criar novo andar' })
  @ApiResponse({
    status: 201,
    description: 'Andar criado com sucesso',
    schema: { example: FLOOR_EXAMPLE },
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos',
    schema: { example: BAD_REQUEST_EXAMPLE },
  })
  async create(@Body() createFloorDto: CreateFloorDto) {
    return this.floorsService.create(createFloorDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos os andares' })
  @ApiResponse({
    status: 200,
    description: 'Lista de andares retornada',
    schema: { example: [FLOOR_EXAMPLE] },
  })
  async findAll() {
    return this.floorsService.findAll();
  }

  @Get('building/:buildingId')
  @ApiOperation({ summary: 'Listar andares de um prédio' })
  @ApiParam({ name: 'buildingId', description: 'ID do prédio (UUID)', type: String })
  @ApiResponse({
    status: 200,
    description: 'Lista de andares do prédio',
    schema: { example: [FLOOR_EXAMPLE] },
  })
  async findByBuilding(@Param('buildingId') buildingId: string) {
    return this.floorsService.findByBuilding(buildingId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar andar por ID' })
  @ApiParam({ name: 'id', description: 'ID do andar (UUID)', type: String })
  @ApiResponse({
    status: 200,
    description: 'Andar encontrado',
    schema: { example: FLOOR_EXAMPLE },
  })
  @ApiResponse({
    status: 404,
    description: 'Andar não encontrado',
    schema: { example: NOT_FOUND_EXAMPLE },
  })
  async findById(@Param('id') id: string) {
    return this.floorsService.findById(id);
  }

  @Get(':id/details')
  @ApiOperation({ summary: 'Buscar andar com salas e dispositivos' })
  @ApiParam({ name: 'id', description: 'ID do andar (UUID)', type: String })
  @ApiResponse({
    status: 200,
    description: 'Andar com salas e dispositivos relacionados',
    schema: { example: FLOOR_DETAILS_EXAMPLE },
  })
  @ApiResponse({
    status: 404,
    description: 'Andar não encontrado',
    schema: { example: NOT_FOUND_EXAMPLE },
  })
  async findByIdWithRelations(@Param('id') id: string) {
    return this.floorsService.findByIdWithRelations(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar andar' })
  @ApiParam({ name: 'id', description: 'ID do andar (UUID)', type: String })
  @ApiResponse({
    status: 200,
    description: 'Andar atualizado com sucesso',
    schema: { example: { ...FLOOR_EXAMPLE, name: 'Primeiro Andar' } },
  })
  @ApiResponse({
    status: 404,
    description: 'Andar não encontrado',
    schema: { example: NOT_FOUND_EXAMPLE },
  })
  async update(
    @Param('id') id: string,
    @Body() updateFloorDto: UpdateFloorDto,
  ) {
    return this.floorsService.update(id, updateFloorDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deletar andar' })
  @ApiParam({ name: 'id', description: 'ID do andar (UUID)', type: String })
  @ApiResponse({
    status: 200,
    description: 'Andar deletado com sucesso',
    schema: { example: FLOOR_EXAMPLE },
  })
  @ApiResponse({
    status: 404,
    description: 'Andar não encontrado',
    schema: { example: NOT_FOUND_EXAMPLE },
  })
  async delete(@Param('id') id: string) {
    return this.floorsService.delete(id);
  }
}
