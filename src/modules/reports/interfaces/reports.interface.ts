import { Report, ReportType, ReportFormat, ReportStatus } from '@prisma/client';

export interface IReportsRepository {
  create(data: CreateReportData): Promise<Report>;
  findAll(): Promise<Report[]>;
  findById(id: string): Promise<Report | null>;
  findByCreator(createdById: string): Promise<Report[]>;
  findByType(type: ReportType): Promise<Report[]>;
  findByStatus(status: ReportStatus): Promise<Report[]>;
  update(id: string, data: UpdateReportData): Promise<Report>;
  updateStatus(
    id: string,
    status: ReportStatus,
    fileUrl?: string,
  ): Promise<Report>;
  delete(id: string): Promise<Report>;
}

export interface CreateReportData {
  type: ReportType;
  title: string;
  format: ReportFormat;
  filters: any;
  createdById: string;
}

export interface UpdateReportData {
  title?: string;
  format?: ReportFormat;
  filters?: any;
  status?: ReportStatus;
  fileUrl?: string;
}
