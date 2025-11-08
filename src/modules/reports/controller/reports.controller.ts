import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { ReportType, ReportStatus } from '@prisma/client';
import { ReportsService } from '../service/reports.service';
import { CreateReportDto } from '../dto/create-report.dto';
import { UpdateReportDto } from '../dto/update-report.dto';
import { UpdateReportStatusDto } from '../dto/update-report-status.dto';
import { AuthGuard } from '../../../guards/auth.guard';

@ApiTags('Reports')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  @ApiOperation({ summary: 'Criar novo relatório' })
  @ApiResponse({ status: 201, description: 'Relatório criado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  async create(@Body() createReportDto: CreateReportDto) {
    return this.reportsService.create(createReportDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos os relatórios' })
  @ApiResponse({
    status: 200,
    description: 'Lista de relatórios retornada',
  })
  async findAll() {
    return this.reportsService.findAll();
  }

  @Get('me')
  @ApiOperation({ summary: 'Listar relatórios do usuário autenticado' })
  @ApiResponse({
    status: 200,
    description: 'Lista de relatórios retornada',
  })
  async findMyReports(@Request() req: any) {
    return this.reportsService.findByCreator(req.user);
  }

  @Get('type/:type')
  @ApiOperation({ summary: 'Listar relatórios por tipo' })
  @ApiParam({
    name: 'type',
    description: 'Tipo do relatório',
    enum: ReportType,
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de relatórios retornada',
  })
  async findByType(@Param('type') type: ReportType) {
    return this.reportsService.findByType(type);
  }

  @Get('status/:status')
  @ApiOperation({ summary: 'Listar relatórios por status' })
  @ApiParam({
    name: 'status',
    description: 'Status do relatório',
    enum: ReportStatus,
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de relatórios retornada',
  })
  async findByStatus(@Param('status') status: ReportStatus) {
    return this.reportsService.findByStatus(status);
  }

  @Get('creator/:creatorId')
  @ApiOperation({ summary: 'Listar relatórios de um criador' })
  @ApiParam({ name: 'creatorId', description: 'ID do criador' })
  @ApiResponse({
    status: 200,
    description: 'Lista de relatórios retornada',
  })
  async findByCreator(@Param('creatorId') creatorId: string) {
    return this.reportsService.findByCreator(creatorId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar relatório por ID' })
  @ApiParam({ name: 'id', description: 'ID do relatório' })
  @ApiResponse({ status: 200, description: 'Relatório encontrado' })
  @ApiResponse({ status: 404, description: 'Relatório não encontrado' })
  async findById(@Param('id') id: string) {
    return this.reportsService.findById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar relatório' })
  @ApiParam({ name: 'id', description: 'ID do relatório' })
  @ApiResponse({
    status: 200,
    description: 'Relatório atualizado com sucesso',
  })
  @ApiResponse({ status: 404, description: 'Relatório não encontrado' })
  async update(
    @Param('id') id: string,
    @Body() updateReportDto: UpdateReportDto,
  ) {
    return this.reportsService.update(id, updateReportDto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Atualizar status do relatório' })
  @ApiParam({ name: 'id', description: 'ID do relatório' })
  @ApiResponse({
    status: 200,
    description: 'Status atualizado com sucesso',
  })
  @ApiResponse({ status: 404, description: 'Relatório não encontrado' })
  async updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateReportStatusDto,
  ) {
    return this.reportsService.updateStatus(
      id,
      updateStatusDto.status,
      updateStatusDto.fileUrl,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deletar relatório' })
  @ApiParam({ name: 'id', description: 'ID do relatório' })
  @ApiResponse({
    status: 200,
    description: 'Relatório deletado com sucesso',
  })
  @ApiResponse({ status: 404, description: 'Relatório não encontrado' })
  async delete(@Param('id') id: string) {
    return this.reportsService.delete(id);
  }
}
