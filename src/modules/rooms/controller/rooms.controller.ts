import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { RoomType } from '@prisma/client';
import { RoomsService } from '../service/rooms.service';
import { CreateRoomDto } from '../dto/create-room.dto';
import { UpdateRoomDto } from '../dto/update-room.dto';
import { AuthGuard } from '../../../guards/auth.guard';

const ROOM_EXAMPLE = {
  id: 'uuid-room-1',
  floorId: 'uuid-floor-1',
  name: 'Laboratório 101',
  type: 'LAB',
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
};

const ROOM_DETAILS_EXAMPLE = {
  ...ROOM_EXAMPLE,
  devices: [
    { id: 'uuid-device-1', name: 'Projetor', type: 'PROJECTOR', status: 'STANDBY' },
    { id: 'uuid-device-2', name: 'Ar Condicionado', type: 'AC', status: 'ON' },
  ],
};

const NOT_FOUND_EXAMPLE = {
  statusCode: 404,
  message: 'Room with ID uuid-room-1 not found',
  error: 'Not Found',
};

const BAD_REQUEST_EXAMPLE = {
  statusCode: 400,
  message: ['name should not be empty'],
  error: 'Bad Request',
};

@ApiTags('Rooms')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard)
@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Post()
  @ApiOperation({ summary: 'Criar nova sala' })
  @ApiResponse({
    status: 201,
    description: 'Sala criada com sucesso',
    schema: { example: ROOM_EXAMPLE },
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos',
    schema: { example: BAD_REQUEST_EXAMPLE },
  })
  async create(@Body() createRoomDto: CreateRoomDto) {
    return this.roomsService.create(createRoomDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todas as salas' })
  @ApiResponse({
    status: 200,
    description: 'Lista de salas retornada',
    schema: { example: [ROOM_EXAMPLE] },
  })
  async findAll() {
    return this.roomsService.findAll();
  }

  @Get('floor/:floorId')
  @ApiOperation({ summary: 'Listar salas de um andar' })
  @ApiParam({ name: 'floorId', description: 'ID do andar (UUID)', type: String })
  @ApiResponse({
    status: 200,
    description: 'Lista de salas do andar',
    schema: { example: [ROOM_EXAMPLE] },
  })
  async findByFloor(@Param('floorId') floorId: string) {
    return this.roomsService.findByFloor(floorId);
  }

  @Get('type/:type')
  @ApiOperation({ summary: 'Listar salas por tipo' })
  @ApiParam({ name: 'type', description: 'Tipo da sala', enum: RoomType })
  @ApiResponse({
    status: 200,
    description: 'Lista de salas do tipo especificado',
    schema: { example: [ROOM_EXAMPLE] },
  })
  async findByType(@Param('type') type: RoomType) {
    return this.roomsService.findByType(type);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar sala por ID' })
  @ApiParam({ name: 'id', description: 'ID da sala (UUID)', type: String })
  @ApiResponse({
    status: 200,
    description: 'Sala encontrada',
    schema: { example: ROOM_EXAMPLE },
  })
  @ApiResponse({
    status: 404,
    description: 'Sala não encontrada',
    schema: { example: NOT_FOUND_EXAMPLE },
  })
  async findById(@Param('id') id: string) {
    return this.roomsService.findById(id);
  }

  @Get(':id/details')
  @ApiOperation({ summary: 'Buscar sala com dispositivos' })
  @ApiParam({ name: 'id', description: 'ID da sala (UUID)', type: String })
  @ApiResponse({
    status: 200,
    description: 'Sala com dispositivos relacionados',
    schema: { example: ROOM_DETAILS_EXAMPLE },
  })
  @ApiResponse({
    status: 404,
    description: 'Sala não encontrada',
    schema: { example: NOT_FOUND_EXAMPLE },
  })
  async findByIdWithRelations(@Param('id') id: string) {
    return this.roomsService.findByIdWithRelations(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar sala' })
  @ApiParam({ name: 'id', description: 'ID da sala (UUID)', type: String })
  @ApiResponse({
    status: 200,
    description: 'Sala atualizada com sucesso',
    schema: { example: { ...ROOM_EXAMPLE, name: 'Laboratório 102' } },
  })
  @ApiResponse({
    status: 404,
    description: 'Sala não encontrada',
    schema: { example: NOT_FOUND_EXAMPLE },
  })
  async update(
    @Param('id') id: string,
    @Body() updateRoomDto: UpdateRoomDto,
  ) {
    return this.roomsService.update(id, updateRoomDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deletar sala' })
  @ApiParam({ name: 'id', description: 'ID da sala (UUID)', type: String })
  @ApiResponse({
    status: 200,
    description: 'Sala deletada com sucesso',
    schema: { example: ROOM_EXAMPLE },
  })
  @ApiResponse({
    status: 404,
    description: 'Sala não encontrada',
    schema: { example: NOT_FOUND_EXAMPLE },
  })
  async delete(@Param('id') id: string) {
    return this.roomsService.delete(id);
  }
}
