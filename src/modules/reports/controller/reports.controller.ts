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
  Res,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiProduces,
} from '@nestjs/swagger';
import { ReportType, ReportStatus } from '@prisma/client';
import type { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { ReportsService } from '../service/reports.service';
import { CreateReportDto } from '../dto/create-report.dto';
import { UpdateReportDto } from '../dto/update-report.dto';
import { UpdateReportStatusDto } from '../dto/update-report-status.dto';
import { AuthGuard } from '../../../guards/auth.guard';

const REPORT_EXAMPLE = {
  id: 'uuid-report-123',
  type: 'ENERGY_CONSUMPTION',
  title: 'Consumo de Energia - Janeiro 2026',
  format: 'PDF',
  filters: { startDate: '2026-01-01', endDate: '2026-01-31' },
  status: 'PENDING',
  fileUrl: null,
  createdById: 'uuid-user-456',
  createdAt: '2026-01-15T10:00:00.000Z',
  createdBy: { id: 'uuid-user-456', name: 'João Silva', email: 'joao@example.com' },
};

const REPORT_COMPLETED_EXAMPLE = {
  ...REPORT_EXAMPLE,
  status: 'COMPLETED',
  fileUrl: '/uploads/reports/uuid-report-123.pdf',
};

const NOT_FOUND_EXAMPLE = {
  statusCode: 404,
  message: 'Report with ID uuid-report-123 not found',
  error: 'Not Found',
};

const BAD_REQUEST_EXAMPLE = {
  statusCode: 400,
  message: ['type must be a valid enum value'],
  error: 'Bad Request',
};

@ApiTags('Reports')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  @ApiOperation({
    summary: 'Criar novo relatório',
    description:
      'Cria um relatório com status PENDING e dispara a geração assíncrona do arquivo. ' +
      'Monitore o status via GET /reports/:id ou aguarde a notificação WebSocket.',
  })
  @ApiResponse({
    status: 201,
    description: 'Relatório criado — geração iniciada em background',
    schema: { example: REPORT_EXAMPLE },
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos',
    schema: { example: BAD_REQUEST_EXAMPLE },
  })
  async create(@Body() createReportDto: CreateReportDto) {
    return this.reportsService.create(createReportDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos os relatórios' })
  @ApiResponse({
    status: 200,
    description: 'Lista de relatórios retornada',
    schema: { example: [REPORT_EXAMPLE, REPORT_COMPLETED_EXAMPLE] },
  })
  async findAll() {
    return this.reportsService.findAll();
  }

  @Get('me')
  @ApiOperation({ summary: 'Listar relatórios do usuário autenticado' })
  @ApiResponse({
    status: 200,
    description: 'Lista de relatórios do usuário',
    schema: { example: [REPORT_EXAMPLE] },
  })
  async findMyReports(@Request() req: any) {
    return this.reportsService.findByCreator(req.user);
  }

  @Get('type/:type')
  @ApiOperation({ summary: 'Listar relatórios por tipo' })
  @ApiParam({ name: 'type', description: 'Tipo do relatório', enum: ReportType })
  @ApiResponse({
    status: 200,
    description: 'Lista de relatórios do tipo especificado',
    schema: { example: [REPORT_EXAMPLE] },
  })
  async findByType(@Param('type') type: ReportType) {
    return this.reportsService.findByType(type);
  }

  @Get('status/:status')
  @ApiOperation({ summary: 'Listar relatórios por status' })
  @ApiParam({ name: 'status', description: 'Status do relatório', enum: ReportStatus })
  @ApiResponse({
    status: 200,
    description: 'Lista de relatórios com o status especificado',
    schema: { example: [REPORT_COMPLETED_EXAMPLE] },
  })
  async findByStatus(@Param('status') status: ReportStatus) {
    return this.reportsService.findByStatus(status);
  }

  @Get('creator/:creatorId')
  @ApiOperation({ summary: 'Listar relatórios de um criador' })
  @ApiParam({ name: 'creatorId', description: 'ID do criador (UUID)', type: String })
  @ApiResponse({
    status: 200,
    description: 'Lista de relatórios do criador',
    schema: { example: [REPORT_EXAMPLE] },
  })
  async findByCreator(@Param('creatorId') creatorId: string) {
    return this.reportsService.findByCreator(creatorId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar relatório por ID' })
  @ApiParam({ name: 'id', description: 'ID do relatório (UUID)', type: String })
  @ApiResponse({
    status: 200,
    description: 'Relatório encontrado',
    schema: { example: REPORT_COMPLETED_EXAMPLE },
  })
  @ApiResponse({
    status: 404,
    description: 'Relatório não encontrado',
    schema: { example: NOT_FOUND_EXAMPLE },
  })
  async findById(@Param('id') id: string) {
    return this.reportsService.findById(id);
  }

  @Get(':id/download')
  @ApiProduces('application/octet-stream')
  @ApiOperation({
    summary: 'Fazer download do arquivo do relatório',
    description: 'Requer que o relatório tenha status COMPLETED. ' +
      'Retorna o arquivo binário (PDF, CSV ou XLSX).',
  })
  @ApiParam({ name: 'id', description: 'ID do relatório (UUID)', type: String })
  @ApiResponse({ status: 200, description: 'Arquivo para download' })
  @ApiResponse({
    status: 400,
    description: 'Relatório ainda não está pronto',
    schema: {
      example: { statusCode: 400, message: 'Report is not ready for download', error: 'Bad Request' },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Relatório ou arquivo não encontrado',
    schema: { example: NOT_FOUND_EXAMPLE },
  })
  async download(@Param('id') id: string, @Res() res: Response) {
    const report = await this.reportsService.findById(id);
    if (report.status !== 'COMPLETED' || !report.fileUrl) {
      throw new BadRequestException('Report is not ready for download');
    }

    const fileUrl = String(report.fileUrl);

    // If external URL, redirect
    if (/^https?:\/\//i.test(fileUrl)) {
      return res.redirect(fileUrl);
    }

    // Resolve file path inside the app
    let resolvedPath: string;
    if (path.isAbsolute(fileUrl)) {
      resolvedPath = path.resolve(fileUrl);
    } else if (fileUrl.startsWith('/uploads')) {
      resolvedPath = path.resolve(process.cwd(), '.' + fileUrl);
    } else {
      resolvedPath = path.resolve(process.cwd(), fileUrl);
    }

    // Security: allow only files inside the application's uploads folder
    const uploadsRoot = path.resolve(process.cwd(), 'uploads');
    if (!(resolvedPath === uploadsRoot || resolvedPath.startsWith(uploadsRoot + path.sep))) {
      throw new NotFoundException('Report file not found on disk');
    }

    if (!fs.existsSync(resolvedPath)) {
      throw new NotFoundException('Report file not found on disk');
    }

    // Expose Content-Disposition for CORS so frontend can read filename
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');

    // Ensure browser receives a sensible filename
    const filename = path.basename(resolvedPath);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    return res.download(resolvedPath);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar relatório' })
  @ApiParam({ name: 'id', description: 'ID do relatório (UUID)', type: String })
  @ApiResponse({
    status: 200,
    description: 'Relatório atualizado com sucesso',
    schema: { example: { ...REPORT_EXAMPLE, title: 'Título Atualizado' } },
  })
  @ApiResponse({
    status: 404,
    description: 'Relatório não encontrado',
    schema: { example: NOT_FOUND_EXAMPLE },
  })
  async update(
    @Param('id') id: string,
    @Body() updateReportDto: UpdateReportDto,
  ) {
    return this.reportsService.update(id, updateReportDto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Atualizar status do relatório' })
  @ApiParam({ name: 'id', description: 'ID do relatório (UUID)', type: String })
  @ApiResponse({
    status: 200,
    description: 'Status atualizado com sucesso',
    schema: { example: REPORT_COMPLETED_EXAMPLE },
  })
  @ApiResponse({
    status: 404,
    description: 'Relatório não encontrado',
    schema: { example: NOT_FOUND_EXAMPLE },
  })
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
  @ApiParam({ name: 'id', description: 'ID do relatório (UUID)', type: String })
  @ApiResponse({
    status: 200,
    description: 'Relatório deletado com sucesso',
    schema: { example: REPORT_EXAMPLE },
  })
  @ApiResponse({
    status: 404,
    description: 'Relatório não encontrado',
    schema: { example: NOT_FOUND_EXAMPLE },
  })
  async delete(@Param('id') id: string) {
    return this.reportsService.delete(id);
  }
}
