import { Automation, AutomationHistory } from '@prisma/client';

export enum TriggerType {
  SCHEDULE = 'SCHEDULE',
  CONDITION = 'CONDITION',
  MANUAL = 'MANUAL',
}

export interface AutomationAction {
  topic?: string;
  payload?: any;
  type?: 'mqtt' | 'http' | 'notification';
  [key: string]: any;
}

export interface CreateAutomationDto {
  name: string;
  description?: string;
  creatorId?: string;
  triggerType: TriggerType;
  cron?: string;
  condition?: string;
  action: string | AutomationAction;
  enabled?: boolean;
}

export interface UpdateAutomationDto {
  name?: string;
  description?: string;
  triggerType?: TriggerType;
  cron?: string;
  condition?: string;
  action?: string | AutomationAction;
  enabled?: boolean;
}

export interface IAutomationRepository {
  create(data: CreateAutomationDto): Promise<Automation>;
  findAll(): Promise<Automation[]>;
  findById(id: string): Promise<Automation | null>;
  findByCreatorId(creatorId: string): Promise<Automation[]>;
  findEnabled(): Promise<Automation[]>;
  findByTriggerType(triggerType: TriggerType): Promise<Automation[]>;
  update(id: string, data: UpdateAutomationDto): Promise<Automation>;
  delete(id: string): Promise<Automation>;
  updateLastRun(id: string, timestamp: Date): Promise<Automation>;
  toggleEnabled(id: string, enabled: boolean): Promise<Automation>;
  
  // History methods
  createHistory(data: {
    automationId: string;
    success: boolean;
    logs?: string;
  }): Promise<AutomationHistory>;
  findHistory(automationId: string, limit?: number): Promise<AutomationHistory[]>;
}
