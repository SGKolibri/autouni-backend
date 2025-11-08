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

@ApiTags('Rooms')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard)
@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Post()
  @ApiOperation({ summary: 'Criar nova sala' })
  @ApiResponse({ status: 201, description: 'Sala criada com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  async create(@Body() createRoomDto: CreateRoomDto) {
    return this.roomsService.create(createRoomDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todas as salas' })
  @ApiResponse({ status: 200, description: 'Lista de salas retornada' })
  async findAll() {
    return this.roomsService.findAll();
  }

  @Get('floor/:floorId')
  @ApiOperation({ summary: 'Listar salas de um andar' })
  @ApiParam({ name: 'floorId', description: 'ID do andar' })
  @ApiResponse({ status: 200, description: 'Lista de salas retornada' })
  async findByFloor(@Param('floorId') floorId: string) {
    return this.roomsService.findByFloor(floorId);
  }

  @Get('type/:type')
  @ApiOperation({ summary: 'Listar salas por tipo' })
  @ApiParam({
    name: 'type',
    description: 'Tipo da sala',
    enum: RoomType,
  })
  @ApiResponse({ status: 200, description: 'Lista de salas retornada' })
  async findByType(@Param('type') type: RoomType) {
    return this.roomsService.findByType(type);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar sala por ID' })
  @ApiParam({ name: 'id', description: 'ID da sala' })
  @ApiResponse({ status: 200, description: 'Sala encontrada' })
  @ApiResponse({ status: 404, description: 'Sala não encontrada' })
  async findById(@Param('id') id: string) {
    return this.roomsService.findById(id);
  }

  @Get(':id/details')
  @ApiOperation({ summary: 'Buscar sala com dispositivos' })
  @ApiParam({ name: 'id', description: 'ID da sala' })
  @ApiResponse({
    status: 200,
    description: 'Sala com relações encontrada',
  })
  @ApiResponse({ status: 404, description: 'Sala não encontrada' })
  async findByIdWithRelations(@Param('id') id: string) {
    return this.roomsService.findByIdWithRelations(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar sala' })
  @ApiParam({ name: 'id', description: 'ID da sala' })
  @ApiResponse({ status: 200, description: 'Sala atualizada com sucesso' })
  @ApiResponse({ status: 404, description: 'Sala não encontrada' })
  async update(
    @Param('id') id: string,
    @Body() updateRoomDto: UpdateRoomDto,
  ) {
    return this.roomsService.update(id, updateRoomDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deletar sala' })
  @ApiParam({ name: 'id', description: 'ID da sala' })
  @ApiResponse({ status: 200, description: 'Sala deletada com sucesso' })
  @ApiResponse({ status: 404, description: 'Sala não encontrada' })
  async delete(@Param('id') id: string) {
    return this.roomsService.delete(id);
  }
}
