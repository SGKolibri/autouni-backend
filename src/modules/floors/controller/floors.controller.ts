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

@ApiTags('Floors')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard)
@Controller('floors')
export class FloorsController {
  constructor(private readonly floorsService: FloorsService) {}

  @Post()
  @ApiOperation({ summary: 'Criar novo andar' })
  @ApiResponse({ status: 201, description: 'Andar criado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  async create(@Body() createFloorDto: CreateFloorDto) {
    return this.floorsService.create(createFloorDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos os andares' })
  @ApiResponse({ status: 200, description: 'Lista de andares retornada' })
  async findAll() {
    return this.floorsService.findAll();
  }

  @Get('building/:buildingId')
  @ApiOperation({ summary: 'Listar andares de um prédio' })
  @ApiParam({ name: 'buildingId', description: 'ID do prédio' })
  @ApiResponse({ status: 200, description: 'Lista de andares retornada' })
  async findByBuilding(@Param('buildingId') buildingId: string) {
    return this.floorsService.findByBuilding(buildingId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar andar por ID' })
  @ApiParam({ name: 'id', description: 'ID do andar' })
  @ApiResponse({ status: 200, description: 'Andar encontrado' })
  @ApiResponse({ status: 404, description: 'Andar não encontrado' })
  async findById(@Param('id') id: string) {
    return this.floorsService.findById(id);
  }

  @Get(':id/details')
  @ApiOperation({ summary: 'Buscar andar com salas e dispositivos' })
  @ApiParam({ name: 'id', description: 'ID do andar' })
  @ApiResponse({
    status: 200,
    description: 'Andar com relações encontrado',
  })
  @ApiResponse({ status: 404, description: 'Andar não encontrado' })
  async findByIdWithRelations(@Param('id') id: string) {
    return this.floorsService.findByIdWithRelations(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar andar' })
  @ApiParam({ name: 'id', description: 'ID do andar' })
  @ApiResponse({ status: 200, description: 'Andar atualizado com sucesso' })
  @ApiResponse({ status: 404, description: 'Andar não encontrado' })
  async update(
    @Param('id') id: string,
    @Body() updateFloorDto: UpdateFloorDto,
  ) {
    return this.floorsService.update(id, updateFloorDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deletar andar' })
  @ApiParam({ name: 'id', description: 'ID do andar' })
  @ApiResponse({ status: 200, description: 'Andar deletado com sucesso' })
  @ApiResponse({ status: 404, description: 'Andar não encontrado' })
  async delete(@Param('id') id: string) {
    return this.floorsService.delete(id);
  }
}
