import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

interface ReportReadyEmailData {
  to: string;
  name: string;
  reportId: string;
}

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  onModuleInit() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT ?? '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendReportReadyEmail(data: ReportReadyEmailData): Promise<void> {
    const appUrl = process.env.APP_URL ?? 'http://localhost:10000';
    const reportUrl = `${appUrl}/reports/${data.reportId}/download`;

    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: data.to,
        subject: 'AutoUni - Seu relatório está pronto',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1890ff;">AutoUni — Relatório Disponível</h2>
            <p>Olá, <strong>${data.name}</strong>!</p>
            <p>Seu relatório foi gerado com sucesso e está disponível para download.</p>
            <p style="margin: 24px 0;">
              <a href="${reportUrl}"
                 style="background: #1890ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
                Baixar Relatório
              </a>
            </p>
            <p style="color: #888; font-size: 12px;">
              O relatório também pode ser acessado diretamente pela plataforma AutoUni.
            </p>
          </div>
        `,
      });
      this.logger.log(`Report ready email sent to ${data.to}`);
    } catch (err) {
      this.logger.error(`Failed to send report email to ${data.to}`, err);
    }
  }
}
