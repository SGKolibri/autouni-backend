import { Injectable } from '@nestjs/common';
import { Report, ReportType, ReportStatus } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import {
  IReportsRepository,
  CreateReportData,
  UpdateReportData,
} from '../interfaces/reports.interface';

@Injectable()
export class ReportsRepository implements IReportsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateReportData): Promise<Report> {
    return this.prisma.report.create({
      data,
    });
  }

  async findAll(): Promise<Report[]> {
    return this.prisma.report.findMany({
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findById(id: string): Promise<Report | null> {
    return this.prisma.report.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async findByCreator(createdById: string): Promise<Report[]> {
    return this.prisma.report.findMany({
      where: { createdById },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findByType(type: ReportType): Promise<Report[]> {
    return this.prisma.report.findMany({
      where: { type },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findByStatus(status: ReportStatus): Promise<Report[]> {
    return this.prisma.report.findMany({
      where: { status },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async update(id: string, data: UpdateReportData): Promise<Report> {
    return this.prisma.report.update({
      where: { id },
      data,
    });
  }

  async updateStatus(
    id: string,
    status: ReportStatus,
    fileUrl?: string,
  ): Promise<Report> {
    return this.prisma.report.update({
      where: { id },
      data: {
        status,
        ...(fileUrl && { fileUrl }),
      },
    });
  }

  async delete(id: string): Promise<Report> {
    return this.prisma.report.delete({
      where: { id },
    });
  }
}
