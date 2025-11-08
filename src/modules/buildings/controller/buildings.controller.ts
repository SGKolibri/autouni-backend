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
  @ApiOperation({ summary: 'Criar novo prédio' })
  @ApiResponse({ status: 201, description: 'Prédio criado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
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
  @ApiOperation({ summary: 'Obter estatísticas do prédio' })
  @ApiParam({ name: 'id', description: 'ID do prédio' })
  @ApiResponse({ status: 200, description: 'Estatísticas retornadas' })
  @ApiResponse({ status: 404, description: 'Prédio não encontrado' })
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
