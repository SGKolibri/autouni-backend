import { Injectable, NotFoundException } from '@nestjs/common';
import { Report, ReportType, ReportStatus } from '@prisma/client';
import { ReportsRepository } from '../repository/reports.repository';
import {
  CreateReportData,
  UpdateReportData,
} from '../interfaces/reports.interface';

@Injectable()
export class ReportsService {
  constructor(private readonly reportsRepository: ReportsRepository) {}

  async create(data: CreateReportData): Promise<Report> {
    const report = await this.reportsRepository.create(data);

    // TODO: Implementar geração assíncrona do relatório
    // Pode usar um sistema de filas (Bull, BullMQ) para processar em background
    // this.queueService.addJob('generate-report', { reportId: report.id });

    return report;
  }

  async findAll(): Promise<Report[]> {
    return this.reportsRepository.findAll();
  }

  async findById(id: string): Promise<Report> {
    const report = await this.reportsRepository.findById(id);
    if (!report) {
      throw new NotFoundException(`Report with ID ${id} not found`);
    }
    return report;
  }

  async findByCreator(createdById: string): Promise<Report[]> {
    return this.reportsRepository.findByCreator(createdById);
  }

  async findByType(type: ReportType): Promise<Report[]> {
    return this.reportsRepository.findByType(type);
  }

  async findByStatus(status: ReportStatus): Promise<Report[]> {
    return this.reportsRepository.findByStatus(status);
  }

  async update(id: string, data: UpdateReportData): Promise<Report> {
    await this.findById(id);
    return this.reportsRepository.update(id, data);
  }

  async updateStatus(
    id: string,
    status: ReportStatus,
    fileUrl?: string,
  ): Promise<Report> {
    await this.findById(id);
    return this.reportsRepository.updateStatus(id, status, fileUrl);
  }

  async delete(id: string): Promise<Report> {
    await this.findById(id);
    return this.reportsRepository.delete(id);
  }
}
