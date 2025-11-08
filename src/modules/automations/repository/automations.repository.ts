import { Injectable, NotFoundException } from '@nestjs/common';
import { Automation, AutomationHistory, TriggerType as PrismaTriggerType } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  IAutomationRepository,
  TriggerType,
  CreateAutomationDto,
  UpdateAutomationDto,
} from '../interfaces/automations.interface';

@Injectable()
export class AutomationsRepository implements IAutomationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateAutomationDto): Promise<Automation> {
    return this.prisma.automation.create({
      data: {
        name: data.name,
        description: data.description,
        creatorId: data.creatorId,
        triggerType: data.triggerType as PrismaTriggerType,
        cron: data.cron,
        condition: data.condition,
        action: typeof data.action === 'string' ? data.action : JSON.stringify(data.action),
        enabled: data.enabled ?? true,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async findAll(): Promise<Automation[]> {
    return this.prisma.automation.findMany({
      include: {
        creator: {
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

  async findById(id: string): Promise<Automation | null> {
    return this.prisma.automation.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        history: {
          orderBy: {
            runAt: 'desc',
          },
          take: 10,
        },
      },
    });
  }

  async findByCreatorId(creatorId: string): Promise<Automation[]> {
    return this.prisma.automation.findMany({
      where: { creatorId },
      include: {
        creator: {
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

  async findEnabled(): Promise<Automation[]> {
    return this.prisma.automation.findMany({
      where: { enabled: true },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async findByTriggerType(triggerType: TriggerType): Promise<Automation[]> {
    return this.prisma.automation.findMany({
      where: {
        triggerType: triggerType as PrismaTriggerType,
        enabled: true,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async update(id: string, data: UpdateAutomationDto): Promise<Automation> {
    const exists = await this.prisma.automation.findUnique({ where: { id } });
    
    if (!exists) {
      throw new NotFoundException(`Automation with ID ${id} not found`);
    }

    return this.prisma.automation.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        triggerType: data.triggerType ? (data.triggerType as PrismaTriggerType) : undefined,
        cron: data.cron,
        condition: data.condition,
        action: data.action ? (typeof data.action === 'string' ? data.action : JSON.stringify(data.action)) : undefined,
        enabled: data.enabled,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async delete(id: string): Promise<Automation> {
    const exists = await this.prisma.automation.findUnique({ where: { id } });
    
    if (!exists) {
      throw new NotFoundException(`Automation with ID ${id} not found`);
    }

    return this.prisma.automation.delete({
      where: { id },
    });
  }

  async updateLastRun(id: string, timestamp: Date): Promise<Automation> {
    return this.prisma.automation.update({
      where: { id },
      data: {
        lastRunAt: timestamp,
      },
    });
  }

  async toggleEnabled(id: string, enabled: boolean): Promise<Automation> {
    return this.prisma.automation.update({
      where: { id },
      data: { enabled },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async createHistory(data: {
    automationId: string;
    success: boolean;
    logs?: string;
  }): Promise<AutomationHistory> {
    return this.prisma.automationHistory.create({
      data: {
        automationId: data.automationId,
        success: data.success,
        logs: data.logs,
      },
    });
  }

  async findHistory(automationId: string, limit: number = 50): Promise<AutomationHistory[]> {
    return this.prisma.automationHistory.findMany({
      where: { automationId },
      orderBy: {
        runAt: 'desc',
      },
      take: limit,
    });
  }
}
