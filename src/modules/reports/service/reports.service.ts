import { Injectable, NotFoundException } from '@nestjs/common';
import { Report, ReportType, ReportStatus } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ReportsRepository } from '../repository/reports.repository';
import { PrismaService } from 'prisma/prisma.service';
import {
  CreateReportData,
  UpdateReportData,
} from '../interfaces/reports.interface';
import { ReportCreatedEvent } from '../events/report-created.event';

@Injectable()
export class ReportsService {
  constructor(
    private readonly reportsRepository: ReportsRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly prisma: PrismaService,
  ) {}

  async create(data: CreateReportData): Promise<Report> {
    const report = await this.reportsRepository.create(data);

    let creatorEmail = '';
    let creatorName = '';
    if (data.createdById) {
      const user = await this.prisma.user.findUnique({
        where: { id: data.createdById },
        select: { email: true, name: true },
      });
      creatorEmail = user?.email ?? '';
      creatorName = user?.name ?? '';
    }

    const event: ReportCreatedEvent = {
      reportId: report.id,
      createdById: data.createdById,
      creatorEmail,
      creatorName,
    };
    this.eventEmitter.emit('report.created', event);

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
