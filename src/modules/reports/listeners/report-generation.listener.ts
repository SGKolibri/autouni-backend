import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ReportGenerationService } from '../service/report-generation.service';
import { EmailService } from '../service/email.service';
import { ReportCreatedEvent } from '../events/report-created.event';
import { NotificationsService } from '../../notifications/service/notifications.service';

@Injectable()
export class ReportGenerationListener {
  private readonly logger = new Logger(ReportGenerationListener.name);

  constructor(
    private readonly reportGenerationService: ReportGenerationService,
    private readonly notificationsService: NotificationsService,
    private readonly emailService: EmailService,
  ) {}

  @OnEvent('report.created', { async: true })
  async handleReportCreated(event: ReportCreatedEvent): Promise<void> {
    this.logger.log(`Processing report ${event.reportId}`);
    try {
      await this.reportGenerationService.generateReport(event.reportId);

      if (event.createdById) {
        await this.notificationsService.create({
          userId: event.createdById,
          type: 'SUCCESS',
          title: 'Relatório Gerado',
          message: 'Seu relatório foi gerado com sucesso e está disponível para download.',
          link: `/reports/${event.reportId}`,
        });
      }

      if (event.creatorEmail) {
        await this.emailService.sendReportReadyEmail({
          to: event.creatorEmail,
          name: event.creatorName,
          reportId: event.reportId,
        });
      }
    } catch (err) {
      this.logger.error(`Report generation failed for ${event.reportId}`, err);

      if (event.createdById) {
        await this.notificationsService.create({
          userId: event.createdById,
          type: 'ERROR',
          title: 'Falha na Geração do Relatório',
          message: 'Ocorreu um erro ao gerar o relatório. Tente novamente.',
          link: `/reports/${event.reportId}`,
        });
      }
    }
  }
}
