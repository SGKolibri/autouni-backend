import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ReportFormat, ReportStatus, ReportType } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import PDFDocument from 'pdfkit';
import { PrismaService } from 'prisma/prisma.service';
import { ReportsRepository } from '../repository/reports.repository';

@Injectable()
export class ReportGenerationService implements OnModuleInit {
  private readonly logger = new Logger(ReportGenerationService.name);
  private readonly uploadPath: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly reportsRepository: ReportsRepository,
  ) {
    this.uploadPath = process.env.REPORTS_UPLOAD_PATH ?? './uploads/reports';
  }

  onModuleInit() {
    fs.mkdirSync(this.uploadPath, { recursive: true });
  }

  async generateReport(reportId: string): Promise<void> {
    const report = await this.reportsRepository.findById(reportId);
    if (!report) throw new NotFoundException(`Report ${reportId} not found`);

    this.logger.log(`Report ${reportId} - filters: ${JSON.stringify(report.filters)}`);

    await this.reportsRepository.updateStatus(reportId, ReportStatus.PROCESSING);

    try {
      const { headers, rows } = await this.queryData(report.type, report.filters as Record<string, any>);
      this.logger.log(`Report ${reportId} - query returned ${rows.length} rows`);

      // Diagnostics: if no rows found, emit counts to help debugging
      if (rows.length === 0) {
        this.logger.warn(`Report ${reportId} returned 0 rows — running diagnostics`);
        try {
          const filters = report.filters as Record<string, any> | undefined;
          if (report.type === ReportType.ENERGY_CONSUMPTION) {
            const totalReadings = await this.prisma.energyReading.count();
            const byBuilding = filters?.buildingId
              ? await this.prisma.energyReading.count({
                  where: { device: { room: { floor: { buildingId: filters.buildingId } } } },
                })
              : null;

            const rangeWhere: any = {};
            if (filters?.startDate) rangeWhere.timestamp = { gte: new Date(filters.startDate) };
            if (filters?.endDate) {
              rangeWhere.timestamp = rangeWhere.timestamp
                ? { ...rangeWhere.timestamp, lte: new Date(filters.endDate) }
                : { lte: new Date(filters.endDate) };
            }

            const inRangeCount = (filters?.startDate || filters?.endDate)
              ? await this.prisma.energyReading.count({ where: rangeWhere })
              : null;

            const inRangeAndBuildingWhere: any = {
              ...(filters?.startDate && { timestamp: { gte: new Date(filters.startDate) } }),
              ...(filters?.endDate && { timestamp: { lte: new Date(filters.endDate) } }),
              device: { room: { floor: { ...(filters?.buildingId && { buildingId: filters.buildingId }) } } },
            };

            const inRangeAndBuildingCount = (filters?.startDate || filters?.endDate || filters?.buildingId)
              ? await this.prisma.energyReading.count({ where: inRangeAndBuildingWhere })
              : null;

            this.logger.log(
              `Diagnostics ${reportId}: totalReadings=${totalReadings} byBuilding=${byBuilding} inRange=${inRangeCount} inRangeAndBuilding=${inRangeAndBuildingCount}`,
            );
          } else if (report.type === ReportType.DEVICE_STATUS) {
            const totalDevices = await this.prisma.device.count();
            const byBuilding = filters?.buildingId
              ? await this.prisma.device.count({ where: { room: { floor: { buildingId: filters.buildingId } } } })
              : null;
            this.logger.log(`Diagnostics ${reportId}: totalDevices=${totalDevices} byBuilding=${byBuilding}`);
          } else if (report.type === ReportType.ROOM_USAGE) {
            const totalRooms = await this.prisma.room.count();
            const byBuilding = filters?.buildingId
              ? await this.prisma.room.count({ where: { floor: { buildingId: filters.buildingId } } })
              : null;
            this.logger.log(`Diagnostics ${reportId}: totalRooms=${totalRooms} byBuilding=${byBuilding}`);
          } else if (report.type === ReportType.INCIDENTS) {
            const totalNotifications = await this.prisma.notification.count();
            const errorNotifications = await this.prisma.notification.count({ where: { type: { in: ['ERROR', 'WARNING'] } } });
            this.logger.log(`Diagnostics ${reportId}: totalNotifications=${totalNotifications} errorNotifications=${errorNotifications}`);
          }
        } catch (diagErr) {
          this.logger.error(`Diagnostics query failed for report ${reportId}`, diagErr as any);
        }
      }

      const fileBuffer = await this.formatFile(report.format, report.title, headers, rows);

      const ext = report.format.toLowerCase();
      const filePath = path.resolve(this.uploadPath, `${reportId}.${ext}`);
      fs.writeFileSync(filePath, fileBuffer);

      await this.reportsRepository.updateStatus(reportId, ReportStatus.COMPLETED, filePath);
      this.logger.log(`Report ${reportId} generated at ${filePath}`);
    } catch (err) {
      await this.reportsRepository.updateStatus(reportId, ReportStatus.FAILED);
      throw err;
    }
  }

  private async queryData(
    type: ReportType,
    filters: Record<string, any>,
  ): Promise<{ headers: string[]; rows: any[][] }> {
    switch (type) {
      case ReportType.ENERGY_CONSUMPTION:
        return this.queryEnergyConsumption(filters);
      case ReportType.DEVICE_STATUS:
        return this.queryDeviceStatus(filters);
      case ReportType.ROOM_USAGE:
        return this.queryRoomUsage(filters);
      case ReportType.INCIDENTS:
        return this.queryIncidents(filters);
    }
  }

  private async queryEnergyConsumption(filters: Record<string, any>) {
    // Normalize possible date inputs: support startDate/endDate fields or a `dateRange` string
    let startDateStr = filters?.startDate;
    let endDateStr = filters?.endDate;
    if (!startDateStr && !endDateStr && filters?.dateRange && typeof filters.dateRange === 'string') {
      const m = String(filters.dateRange).match(/(\d{4}-\d{2}-\d{2})\s*-\s*(\d{4}-\d{2}-\d{2})/);
      if (m) {
        startDateStr = m[1];
        endDateStr = m[2];
      }
    }

    const startDate = startDateStr ? new Date(String(startDateStr)) : undefined;
    let endDate = endDateStr ? new Date(String(endDateStr)) : undefined;
    if (endDate) {
      // include the whole day for endDate
      endDate.setHours(23, 59, 59, 999);
    }

    const timestampWhere: any = {};
    if (startDate) timestampWhere.gte = startDate;
    if (endDate) timestampWhere.lte = endDate;

    const readings = await this.prisma.energyReading.findMany({
      where: {
        ...(Object.keys(timestampWhere).length ? { timestamp: timestampWhere } : {}),
        device: {
          room: {
            floor: {
              ...(filters.buildingId && { buildingId: filters.buildingId as string }),
            },
          },
        },
      },
      include: {
        device: {
          include: {
            room: { include: { floor: { include: { building: true } } } },
          },
        },
      },
      orderBy: { timestamp: 'asc' },
    });

    const headers = ['Timestamp', 'Prédio', 'Andar', 'Sala', 'Dispositivo', 'Tipo', 'Valor (Wh)', 'kWh', 'Tensão (V)', 'Corrente (A)'];
    const rows = readings.map((r) => [
      new Date(r.timestamp).toLocaleString('pt-BR'),
      r.device.room.floor.building.name,
      r.device.room.floor.name ?? `Andar ${r.device.room.floor.number}`,
      r.device.room.name,
      r.device.name,
      r.device.type,
      r.valueWh.toFixed(2),
      (r.valueWh / 1000).toFixed(4),
      r.voltage?.toFixed(2) ?? '-',
      r.current?.toFixed(2) ?? '-',
    ]);

    return { headers, rows };
  }

  private async queryDeviceStatus(filters: Record<string, any>) {
    const devices = await this.prisma.device.findMany({
      where: {
        ...(filters.status && { status: filters.status as any }),
        ...(filters.type && { type: filters.type as any }),
        room: {
          floor: {
            ...(filters.buildingId && { buildingId: filters.buildingId as string }),
          },
        },
      },
      include: {
        room: { include: { floor: { include: { building: true } } } },
      },
      orderBy: { name: 'asc' },
    });

    const headers = ['Dispositivo', 'Tipo', 'Status', 'Sala', 'Andar', 'Prédio', 'Última Conexão'];
    const rows = devices.map((d) => [
      d.name,
      d.type,
      d.status,
      d.room.name,
      d.room.floor.name ?? `Andar ${d.room.floor.number}`,
      d.room.floor.building.name,
      d.lastSeen ? new Date(d.lastSeen).toLocaleString('pt-BR') : '-',
    ]);

    return { headers, rows };
  }

  private async queryRoomUsage(filters: Record<string, any>) {
    const rooms = await this.prisma.room.findMany({
      where: {
        ...(filters.type && { type: filters.type as any }),
        floor: {
          ...(filters.floorId && { id: filters.floorId as string }),
          ...(filters.buildingId && { buildingId: filters.buildingId as string }),
        },
      },
      include: {
        floor: { include: { building: true } },
        devices: { select: { id: true, status: true } },
      },
      orderBy: { name: 'asc' },
    });

    const headers = ['Sala', 'Tipo', 'Andar', 'Prédio', 'Total Dispositivos', 'Ativos', 'Inativos', 'Com Erro'];
    const rows = rooms.map((r) => {
      const active = r.devices.filter((d) => d.status === 'ON').length;
      const error = r.devices.filter((d) => d.status === 'ERROR').length;
      return [
        r.name,
        r.type,
        r.floor.name ?? `Andar ${r.floor.number}`,
        r.floor.building.name,
        r.devices.length,
        active,
        r.devices.length - active - error,
        error,
      ];
    });

    return { headers, rows };
  }

  private async queryIncidents(filters: Record<string, any>) {
    // Normalize dates and support dateRange strings
    let startDateStr = filters?.startDate;
    let endDateStr = filters?.endDate;
    if (!startDateStr && !endDateStr && filters?.dateRange && typeof filters.dateRange === 'string') {
      const m = String(filters.dateRange).match(/(\d{4}-\d{2}-\d{2})\s*-\s*(\d{4}-\d{2}-\d{2})/);
      if (m) {
        startDateStr = m[1];
        endDateStr = m[2];
      }
    }

    const startDate = startDateStr ? new Date(String(startDateStr)) : undefined;
    let endDate = endDateStr ? new Date(String(endDateStr)) : undefined;
    if (endDate) endDate.setHours(23, 59, 59, 999);

    const createdAtWhere: any = {};
    if (startDate) createdAtWhere.gte = startDate;
    if (endDate) createdAtWhere.lte = endDate;

    const [errorDevices, errorNotifications] = await Promise.all([
      this.prisma.device.findMany({
        where: {
          status: 'ERROR',
          room: {
            floor: {
              ...(filters.buildingId && { buildingId: filters.buildingId as string }),
            },
          },
        },
        include: {
          room: { include: { floor: { include: { building: true } } } },
        },
      }),
      this.prisma.notification.findMany({
        where: {
          type: { in: ['ERROR', 'WARNING'] },
          ...(Object.keys(createdAtWhere).length ? { createdAt: createdAtWhere } : {}),
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const headers = ['Timestamp', 'Tipo', 'Título / Dispositivo', 'Descrição / Status', 'Localização'];
    const rows: any[][] = [
      ...errorDevices.map((d) => [
        d.updatedAt.toLocaleString('pt-BR'),
        'DISPOSITIVO',
        d.name,
        d.status,
        `${d.room.floor.building.name} > ${d.room.floor.name ?? `Andar ${d.room.floor.number}`} > ${d.room.name}`,
      ]),
      ...errorNotifications.map((n) => [
        n.createdAt.toLocaleString('pt-BR'),
        n.type,
        n.title,
        n.message,
        '-',
      ]),
    ];

    rows.sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());

    return { headers, rows };
  }

  private async formatFile(
    format: ReportFormat,
    title: string,
    headers: string[],
    rows: any[][],
  ): Promise<Buffer> {
    switch (format) {
      case ReportFormat.CSV:
        return this.generateCsv(headers, rows);
      case ReportFormat.XLSX:
        return this.generateXlsx(title, headers, rows);
      case ReportFormat.PDF:
        return this.generatePdf(title, headers, rows);
    }
  }

  private generateCsv(headers: string[], rows: any[][]): Buffer {
    const escape = (v: any) => {
      const s = String(v ?? '');
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    };
    const lines = [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))];
    return Buffer.from(lines.join('\n'), 'utf-8');
  }

  private generateXlsx(title: string, headers: string[], rows: any[][]): Buffer {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws['!cols'] = headers.map(() => ({ wch: 20 }));
    XLSX.utils.book_append_sheet(wb, ws, title.slice(0, 31));
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }

  private generatePdf(title: string, headers: string[], rows: any[][]): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageWidth = doc.page.width - 80;
      const colWidth = pageWidth / headers.length;

      doc.fontSize(16).font('Helvetica-Bold').text(title, { align: 'center' });
      doc.fontSize(9).font('Helvetica').text(
        `Gerado em: ${new Date().toLocaleString('pt-BR')}`,
        { align: 'center' },
      );
      doc.moveDown(1.5);

      // Header row
      doc.font('Helvetica-Bold').fontSize(8);
      const headerY = doc.y;
      headers.forEach((h, i) => {
        doc.text(h, 40 + i * colWidth, headerY, { width: colWidth - 4, lineBreak: false });
      });
      doc.moveDown(0.5);
      doc.moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).stroke();
      doc.moveDown(0.3);

      // Data rows
      doc.font('Helvetica').fontSize(7);
      for (const row of rows) {
        if (doc.y > doc.page.height - 60) {
          doc.addPage();
        }
        const rowY = doc.y;
        row.forEach((cell, i) => {
          doc.text(String(cell ?? ''), 40 + i * colWidth, rowY, {
            width: colWidth - 4,
            lineBreak: false,
          });
        });
        doc.moveDown(0.7);
      }

      doc.end();
    });
  }
}
